```rust
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint, Transfer};
use anchor_spl::associated_token::AssociatedToken;

#[derive(Accounts)]
pub struct GraduateToken<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"bonding_curve", token_mint.key().as_ref()],
        bump,
        has_one = token_mint,
        has_one = creator,
        constraint = bonding_curve.graduated == false @ PumpError::TokenAlreadyGraduated,
        constraint = bonding_curve.total_supply >= bonding_curve.graduation_threshold @ PumpError::GraduationThresholdNotMet
    )]
    pub bonding_curve: Account<'info, BondingCurve>,
    
    #[account(mut)]
    pub token_mint: Account<'info, Mint>,
    
    #[account(
        mut,
        associated_token::mint = token_mint,
        associated_token::authority = bonding_curve
    )]
    pub bonding_curve_token_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        associated_token::mint = token_mint,
        associated_token::authority = creator
    )]
    pub creator_token_account: Account<'info, TokenAccount>,
    
    /// CHECK: This is the Raydium AMM program ID
    #[account(constraint = amm_program.key() == crate::constants::RAYDIUM_AMM_PROGRAM_ID)]
    pub amm_program: UncheckedAccount<'info>,
    
    /// CHECK: This will be validated by Raydium
    #[account(mut)]
    pub amm_pool: UncheckedAccount<'info>,
    
    /// CHECK: This will be validated by Raydium
    #[account(mut)]
    pub amm_pool_authority: UncheckedAccount<'info>,
    
    /// CHECK: This will be validated by Raydium
    #[account(mut)]
    pub amm_pool_lp_mint: UncheckedAccount<'info>,
    
    /// CHECK: This will be validated by Raydium
    #[account(mut)]
    pub amm_pool_coin_token_account: UncheckedAccount<'info>,
    
    /// CHECK: This will be validated by Raydium
    #[account(mut)]
    pub amm_pool_pc_token_account: UncheckedAccount<'info>,
    
    /// CHECK: This will be validated by Raydium
    pub amm_pool_withdraw_queue: UncheckedAccount<'info>,
    
    /// CHECK: This will be validated by Raydium
    pub amm_pool_temp_lp_token_account: UncheckedAccount<'info>,
    
    /// CHECK: This will be validated by Raydium
    pub serum_program: UncheckedAccount<'info>,
    
    /// CHECK: This will be validated by Raydium
    #[account(mut)]
    pub serum_market: UncheckedAccount<'info>,
    
    /// CHECK: This will be validated by Raydium
    #[account(mut)]
    pub serum_coin_vault_account: UncheckedAccount<'info>,
    
    /// CHECK: This will be validated by Raydium
    #[account(mut)]
    pub serum_pc_vault_account: UncheckedAccount<'info>,
    
    /// CHECK: This will be validated by Raydium
    pub serum_vault_signer: UncheckedAccount<'info>,
    
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn graduate_token(ctx: Context<GraduateToken>) -> Result<()> {
    let bonding_curve = &mut ctx.accounts.bonding_curve;
    let token_mint = &ctx.accounts.token_mint;
    let creator = &ctx.accounts.creator;
    
    // Verify graduation requirements
    require!(
        bonding_curve.total_supply >= bonding_curve.graduation_threshold,
        PumpError::GraduationThresholdNotMet
    );
    
    require!(
        !bonding_curve.graduated,
        PumpError::TokenAlreadyGraduated
    );
    
    // Calculate liquidity amounts
    let token_liquidity = bonding_curve.total_supply
        .checked_mul(80)
        .unwrap()
        .checked_div(100)
        .unwrap(); // 80% of total supply
    
    let sol_liquidity = bonding_curve.sol_reserves
        .checked_mul(90)
        .unwrap()
        .checked_div(100)
        .unwrap(); // 90% of SOL reserves
    
    // Transfer tokens from bonding curve to AMM
    let bonding_curve_key = bonding_curve.key();
    let bonding_curve_seeds = &[
        b"bonding_curve",
        token_mint.key().as_ref(),
        &[bonding_curve.bump]
    ];
    let bonding_curve_signer = &[&bonding_curve_seeds[..]];
    
    // Transfer tokens to AMM pool
    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.bonding_curve_token_account.to_account_info(),
                to: ctx.accounts.amm_pool_coin_token_account.to_account_info(),
                authority: bonding_curve.to_account_info(),
            },
            bonding_curve_signer,
        ),
        token_liquidity,
    )?;
    
    // Transfer SOL to AMM pool
    **bonding_curve.to_account_info().try_borrow_mut_lamports()? -= sol_liquidity;
    **ctx.accounts.amm_pool_pc_token_account.to_account_info().try_borrow_mut_lamports()? += sol_liquidity;
    
    // Initialize AMM pool via CPI to Raydium
    let initialize_pool_instruction = raydium_amm::instruction::initialize(
        &ctx.accounts.amm_program.key(),
        &ctx.accounts.amm_pool.key(),
        &ctx.accounts.amm_pool_authority.key(),
        &ctx.accounts.amm_pool_lp_mint.key(),
        &ctx.accounts.amm_pool_coin_token_account.key(),
        &ctx.accounts.amm_pool_pc_token_account.key(),
        &ctx.accounts.amm_pool_withdraw_queue.key(),
        &ctx.accounts.amm_pool_temp_lp_token_account.key(),
        &ctx.accounts.serum_program.key(),
        &ctx.accounts.serum_market.key(),
        &ctx.accounts.serum_coin_vault_account.key(),
        &ctx.accounts.serum_pc_vault_account.key(),
        &ctx.accounts.serum_vault_signer.key(),
        0, // nonce
    )?;
    
    anchor_lang::solana_program::program::invoke(
        &initialize_pool_instruction,
        &[
            ctx.accounts.amm_pool.to_account_info(),
            ctx.accounts.amm_pool_authority.to_account_info(),
            ctx.accounts.amm_pool_lp_mint.to_account_info(),
            ctx.accounts.amm_pool_coin_token_account.to_account_info(),
            ctx.accounts.amm_pool_pc_token_account.to_account_info(),
            ctx.accounts.amm_pool_withdraw_queue.to_account_info(),
            ctx.accounts.amm_pool_temp_lp_token_account.to_account_info(),
            ctx.accounts.serum_program.to_account_info(),
            ctx.accounts.serum_market.to_account_info(),
            ctx.accounts.serum_coin_vault_account.to_account_info(),
            ctx.accounts.serum_pc_vault_account.to_account_info(),
            ctx.accounts.serum_vault_signer.to_account_info(),
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.rent.to_account_info(),
        ],
    )?;
    
    // Transfer remaining tokens to creator
    let remaining_tokens = bonding_curve.total_supply
        .checked_sub(token_liquidity)
        .unwrap();
    
    if remaining_tokens > 0 {
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.bonding_curve_token_account.to_account_info(),
                    to: ctx.accounts.creator_token_account.to_account_info(),
                    authority: bonding_curve.to_account_info(),
                },
                bonding_curve_signer,
            ),
            remaining_tokens,
        )?;
    }
    
    // Mark token as graduated
    bonding_curve.graduated = true;
    bonding_curve.graduation_timestamp = Clock::get()?.unix_timestamp;
    bonding_curve.amm_pool = ctx.accounts.amm_pool.key();
    
    // Emit graduation event
    emit!(TokenGraduatedEvent {
        token_mint: token_mint.key(),
        creator: creator.key(),
        bonding_curve: bonding_curve.key(),
        amm_pool: ctx.accounts.amm_pool.key(),
        token_liquidity,
        sol_liquidity,
        timestamp: Clock::get()?.unix_timestamp,
    });
    
    msg!("Token {} successfully graduated to AMM", token_mint.key());
    
    Ok(())
}

#[account]
pub struct BondingCurve {
    pub creator: Pubkey,
    pub token_mint: Pubkey,
    pub total_supply: u64,
    pub current_supply: u64,
    pub sol_reserves: u64,
    pub graduation_threshold: u64,
    pub graduated: bool,
    pub graduation_timestamp: i64,
    pub amm_pool: Pubkey,
    pub bump: u8,
}

#[event]
pub struct TokenGraduatedEvent {
    pub token_mint: Pubkey,
    pub creator: Pubkey,
    pub bonding_curve: Pubkey,
    pub amm_pool: Pubkey,
    pub token_liquidity: u64,
    pub sol_liquidity: u64,
    pub timestamp: i64,
}

#[error_code]
pub enum PumpError {
    #[msg("Token has already graduated")]
    TokenAlreadyGraduated,
    #[msg("Graduation threshold not met")]
    GraduationThresholdNotMet,
    #[msg("Insufficient liquidity for graduation")]
    InsufficientLiquidity,
    #[msg("Invalid AMM program")]
    InvalidAmmProgram,
}
```