```rust
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::*;
use crate::errors::*;

#[derive(Accounts)]
pub struct SellTokens<'info> {
    #[account(mut)]
    pub seller: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"bonding_curve", token_mint.key().as_ref()],
        bump = bonding_curve.bump,
    )]
    pub bonding_curve: Account<'info, BondingCurve>,
    
    #[account(mut)]
    pub token_mint: Account<'info, token::Mint>,
    
    #[account(
        mut,
        associated_token::mint = token_mint,
        associated_token::authority = seller,
    )]
    pub seller_token_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        seeds = [b"curve_vault", bonding_curve.key().as_ref()],
        bump,
    )]
    pub curve_vault: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        seeds = [b"sol_vault", bonding_curve.key().as_ref()],
        bump,
    )]
    /// CHECK: This is safe as we only transfer SOL to/from this account
    pub sol_vault: AccountInfo<'info>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn sell_tokens(ctx: Context<SellTokens>, token_amount: u64) -> Result<()> {
    let bonding_curve = &mut ctx.accounts.bonding_curve;
    let seller = &ctx.accounts.seller;
    let seller_token_account = &ctx.accounts.seller_token_account;
    let curve_vault = &ctx.accounts.curve_vault;
    let sol_vault = &ctx.accounts.sol_vault;
    
    require!(token_amount > 0, PumpError::InvalidAmount);
    require!(seller_token_account.amount >= token_amount, PumpError::InsufficientTokens);
    require!(!bonding_curve.is_complete, PumpError::BondingCurveComplete);
    
    // Calculate SOL amount to receive based on bonding curve
    let sol_amount = calculate_sell_price(
        bonding_curve.virtual_token_reserves,
        bonding_curve.virtual_sol_reserves,
        token_amount,
    )?;
    
    require!(sol_amount > 0, PumpError::InvalidCalculation);
    require!(sol_vault.lamports() >= sol_amount, PumpError::InsufficientSolVault);
    
    // Update bonding curve reserves
    bonding_curve.virtual_token_reserves = bonding_curve
        .virtual_token_reserves
        .checked_add(token_amount)
        .ok_or(PumpError::MathOverflow)?;
    
    bonding_curve.virtual_sol_reserves = bonding_curve
        .virtual_sol_reserves
        .checked_sub(sol_amount)
        .ok_or(PumpError::MathOverflow)?;
    
    bonding_curve.real_token_reserves = bonding_curve
        .real_token_reserves
        .checked_add(token_amount)
        .ok_or(PumpError::MathOverflow)?;
    
    bonding_curve.real_sol_reserves = bonding_curve
        .real_sol_reserves
        .checked_sub(sol_amount)
        .ok_or(PumpError::MathOverflow)?;
    
    // Transfer tokens from seller to curve vault
    let transfer_tokens_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: seller_token_account.to_account_info(),
            to: curve_vault.to_account_info(),
            authority: seller.to_account_info(),
        },
    );
    
    token::transfer(transfer_tokens_ctx, token_amount)?;
    
    // Transfer SOL from vault to seller
    let bonding_curve_key = bonding_curve.key();
    let seeds = &[
        b"sol_vault",
        bonding_curve_key.as_ref(),
        &[ctx.bumps.sol_vault],
    ];
    let signer_seeds = &[&seeds[..]];
    
    **sol_vault.try_borrow_mut_lamports()? = sol_vault
        .lamports()
        .checked_sub(sol_amount)
        .ok_or(PumpError::MathOverflow)?;
    
    **seller.try_borrow_mut_lamports()? = seller
        .lamports()
        .checked_add(sol_amount)
        .ok_or(PumpError::MathOverflow)?;
    
    // Emit sell event
    emit!(TokenSellEvent {
        seller: seller.key(),
        token_mint: ctx.accounts.token_mint.key(),
        token_amount,
        sol_amount,
        virtual_token_reserves: bonding_curve.virtual_token_reserves,
        virtual_sol_reserves: bonding_curve.virtual_sol_reserves,
        timestamp: Clock::get()?.unix_timestamp,
    });
    
    Ok(())
}

fn calculate_sell_price(
    virtual_token_reserves: u64,
    virtual_sol_reserves: u64,
    token_amount: u64,
) -> Result<u64> {
    // Using constant product formula: x * y = k
    // When selling tokens: new_sol_reserves = k / (token_reserves + token_amount)
    // sol_out = current_sol_reserves - new_sol_reserves
    
    let k = (virtual_token_reserves as u128)
        .checked_mul(virtual_sol_reserves as u128)
        .ok_or(PumpError::MathOverflow)?;
    
    let new_token_reserves = (virtual_token_reserves as u128)
        .checked_add(token_amount as u128)
        .ok_or(PumpError::MathOverflow)?;
    
    let new_sol_reserves = k
        .checked_div(new_token_reserves)
        .ok_or(PumpError::MathOverflow)?;
    
    let sol_out = (virtual_sol_reserves as u128)
        .checked_sub(new_sol_reserves)
        .ok_or(PumpError::MathOverflow)?;
    
    // Apply fee (1% fee)
    let fee = sol_out
        .checked_mul(100)
        .ok_or(PumpError::MathOverflow)?
        .checked_div(10000)
        .ok_or(PumpError::MathOverflow)?;
    
    let sol_out_after_fee = sol_out
        .checked_sub(fee)
        .ok_or(PumpError::MathOverflow)?;
    
    Ok(sol_out_after_fee as u64)
}

#[event]
pub struct TokenSellEvent {
    pub seller: Pubkey,
    pub token_mint: Pubkey,
    pub token_amount: u64,
    pub sol_amount: u64,
    pub virtual_token_reserves: u64,
    pub virtual_sol_reserves: u64,
    pub timestamp: i64,
}
```