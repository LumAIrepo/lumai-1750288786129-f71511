```rust
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::*;
use crate::errors::*;

#[derive(Accounts)]
pub struct BuyTokens<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,
    
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
        associated_token::authority = bonding_curve,
    )]
    pub bonding_curve_token_account: Account<'info, TokenAccount>,
    
    #[account(
        init_if_needed,
        payer = buyer,
        associated_token::mint = token_mint,
        associated_token::authority = buyer,
    )]
    pub buyer_token_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        seeds = [b"sol_vault"],
        bump,
    )]
    pub sol_vault: SystemAccount<'info>,
    
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, anchor_spl::associated_token::AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn buy_tokens(ctx: Context<BuyTokens>, sol_amount: u64) -> Result<()> {
    let bonding_curve = &mut ctx.accounts.bonding_curve;
    
    require!(sol_amount > 0, PumpCloneError::InvalidAmount);
    require!(!bonding_curve.is_complete, PumpCloneError::BondingCurveComplete);
    
    // Calculate token amount based on bonding curve
    let token_amount = calculate_token_amount_out(
        bonding_curve.virtual_sol_reserves,
        bonding_curve.virtual_token_reserves,
        sol_amount,
    )?;
    
    require!(token_amount > 0, PumpCloneError::InsufficientTokenAmount);
    
    // Check if purchase would complete the bonding curve
    let new_sol_reserves = bonding_curve.virtual_sol_reserves
        .checked_add(sol_amount)
        .ok_or(PumpCloneError::MathOverflow)?;
    
    let new_token_reserves = bonding_curve.virtual_token_reserves
        .checked_sub(token_amount)
        .ok_or(PumpCloneError::InsufficientTokenReserves)?;
    
    // Transfer SOL from buyer to vault
    let transfer_sol_ix = anchor_lang::system_program::Transfer {
        from: ctx.accounts.buyer.to_account_info(),
        to: ctx.accounts.sol_vault.to_account_info(),
    };
    
    anchor_lang::system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            transfer_sol_ix,
        ),
        sol_amount,
    )?;
    
    // Transfer tokens from bonding curve to buyer
    let bonding_curve_key = ctx.accounts.bonding_curve.key();
    let seeds = &[
        b"bonding_curve",
        ctx.accounts.token_mint.key().as_ref(),
        &[bonding_curve.bump],
    ];
    let signer_seeds = &[&seeds[..]];
    
    let transfer_tokens_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.bonding_curve_token_account.to_account_info(),
            to: ctx.accounts.buyer_token_account.to_account_info(),
            authority: ctx.accounts.bonding_curve.to_account_info(),
        },
        signer_seeds,
    );
    
    token::transfer(transfer_tokens_ctx, token_amount)?;
    
    // Update bonding curve state
    bonding_curve.virtual_sol_reserves = new_sol_reserves;
    bonding_curve.virtual_token_reserves = new_token_reserves;
    bonding_curve.real_sol_reserves = bonding_curve.real_sol_reserves
        .checked_add(sol_amount)
        .ok_or(PumpCloneError::MathOverflow)?;
    bonding_curve.real_token_reserves = bonding_curve.real_token_reserves
        .checked_sub(token_amount)
        .ok_or(PumpCloneError::InsufficientTokenReserves)?;
    
    // Check if bonding curve is complete
    if new_sol_reserves >= bonding_curve.complete_sol_threshold {
        bonding_curve.is_complete = true;
        
        emit!(BondingCurveCompleteEvent {
            token_mint: ctx.accounts.token_mint.key(),
            final_sol_reserves: new_sol_reserves,
            final_token_reserves: new_token_reserves,
        });
    }
    
    emit!(TokenPurchaseEvent {
        buyer: ctx.accounts.buyer.key(),
        token_mint: ctx.accounts.token_mint.key(),
        sol_amount,
        token_amount,
        new_sol_reserves,
        new_token_reserves,
    });
    
    Ok(())
}

fn calculate_token_amount_out(
    sol_reserves: u64,
    token_reserves: u64,
    sol_in: u64,
) -> Result<u64> {
    // Constant product formula: x * y = k
    // token_out = token_reserves - (sol_reserves * token_reserves) / (sol_reserves + sol_in)
    
    let k = (sol_reserves as u128)
        .checked_mul(token_reserves as u128)
        .ok_or(PumpCloneError::MathOverflow)?;
    
    let new_sol_reserves = (sol_reserves as u128)
        .checked_add(sol_in as u128)
        .ok_or(PumpCloneError::MathOverflow)?;
    
    let new_token_reserves = k
        .checked_div(new_sol_reserves)
        .ok_or(PumpCloneError::MathOverflow)?;
    
    let token_out = (token_reserves as u128)
        .checked_sub(new_token_reserves)
        .ok_or(PumpCloneError::InsufficientTokenReserves)?;
    
    Ok(token_out as u64)
}

#[event]
pub struct TokenPurchaseEvent {
    pub buyer: Pubkey,
    pub token_mint: Pubkey,
    pub sol_amount: u64,
    pub token_amount: u64,
    pub new_sol_reserves: u64,
    pub new_token_reserves: u64,
}

#[event]
pub struct BondingCurveCompleteEvent {
    pub token_mint: Pubkey,
    pub final_sol_reserves: u64,
    pub final_token_reserves: u64,
}
```