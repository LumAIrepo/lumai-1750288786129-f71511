```rust
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    metadata::{
        create_metadata_accounts_v3, mpl_token_metadata::types::DataV2, CreateMetadataAccountsV3,
        Metadata,
    },
    token::{mint_to, Mint, MintTo, Token, TokenAccount},
};

use crate::state::*;
use crate::errors::*;

#[derive(Accounts)]
#[instruction(name: String, symbol: String, uri: String)]
pub struct CreateToken<'info> {
    #[account(
        init,
        payer = creator,
        mint::decimals = 6,
        mint::authority = bonding_curve,
        mint::freeze_authority = bonding_curve,
        seeds = [b"mint", creator.key().as_ref(), name.as_bytes()],
        bump
    )]
    pub mint: Account<'info, Mint>,

    #[account(
        init,
        payer = creator,
        space = 8 + BondingCurve::INIT_SPACE,
        seeds = [b"bonding_curve", mint.key().as_ref()],
        bump
    )]
    pub bonding_curve: Account<'info, BondingCurve>,

    #[account(
        init,
        payer = creator,
        associated_token::mint = mint,
        associated_token::authority = bonding_curve,
    )]
    pub bonding_curve_token_account: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = creator,
        associated_token::mint = mint,
        associated_token::authority = creator,
    )]
    pub creator_token_account: Account<'info, TokenAccount>,

    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    pub metadata: UncheckedAccount<'info>,

    #[account(mut)]
    pub creator: Signer<'info>,

    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_metadata_program: Program<'info, Metadata>,
}

pub fn create_token(
    ctx: Context<CreateToken>,
    name: String,
    symbol: String,
    uri: String,
) -> Result<()> {
    require!(name.len() <= 32, PumpError::NameTooLong);
    require!(symbol.len() <= 10, PumpError::SymbolTooLong);
    require!(uri.len() <= 200, PumpError::UriTooLong);

    let bonding_curve = &mut ctx.accounts.bonding_curve;
    let mint = &ctx.accounts.mint;
    let creator = &ctx.accounts.creator;

    // Initialize bonding curve
    bonding_curve.mint = mint.key();
    bonding_curve.creator = creator.key();
    bonding_curve.virtual_token_reserves = 1_073_000_000_000_000; // 1.073M tokens
    bonding_curve.virtual_sol_reserves = 30_000_000_000; // 30 SOL
    bonding_curve.real_token_reserves = 0;
    bonding_curve.real_sol_reserves = 0;
    bonding_curve.token_total_supply = 1_000_000_000_000_000; // 1B tokens
    bonding_curve.complete = false;
    bonding_curve.bump = ctx.bumps.bonding_curve;

    // Create metadata
    let metadata_ctx = CpiContext::new(
        ctx.accounts.token_metadata_program.to_account_info(),
        CreateMetadataAccountsV3 {
            metadata: ctx.accounts.metadata.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
            mint_authority: ctx.accounts.bonding_curve.to_account_info(),
            update_authority: ctx.accounts.bonding_curve.to_account_info(),
            payer: ctx.accounts.creator.to_account_info(),
            system_program: ctx.accounts.system_program.to_account_info(),
            rent: ctx.accounts.rent.to_account_info(),
        },
    );

    let mint_key = ctx.accounts.mint.key();
    let seeds = &[
        b"bonding_curve",
        mint_key.as_ref(),
        &[ctx.bumps.bonding_curve],
    ];
    let signer = &[&seeds[..]];

    create_metadata_accounts_v3(
        metadata_ctx.with_signer(signer),
        DataV2 {
            name,
            symbol,
            uri,
            seller_fee_basis_points: 0,
            creators: None,
            collection: None,
            uses: None,
        },
        false,
        true,
        None,
    )?;

    // Mint initial supply to creator (20% of total supply)
    let initial_creator_supply = bonding_curve.token_total_supply / 5; // 20%
    
    let mint_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        MintTo {
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.creator_token_account.to_account_info(),
            authority: ctx.accounts.bonding_curve.to_account_info(),
        },
    );

    mint_to(mint_ctx.with_signer(signer), initial_creator_supply)?;

    // Update bonding curve reserves
    bonding_curve.real_token_reserves = bonding_curve.token_total_supply - initial_creator_supply;

    emit!(TokenCreated {
        mint: mint.key(),
        creator: creator.key(),
        name: ctx.accounts.metadata.key().to_string(),
        symbol: ctx.accounts.metadata.key().to_string(),
        uri: ctx.accounts.metadata.key().to_string(),
        bonding_curve: bonding_curve.key(),
        virtual_token_reserves: bonding_curve.virtual_token_reserves,
        virtual_sol_reserves: bonding_curve.virtual_sol_reserves,
        real_token_reserves: bonding_curve.real_token_reserves,
        real_sol_reserves: bonding_curve.real_sol_reserves,
        token_total_supply: bonding_curve.token_total_supply,
    });

    Ok(())
}

#[event]
pub struct TokenCreated {
    pub mint: Pubkey,
    pub creator: Pubkey,
    pub name: String,
    pub symbol: String,
    pub uri: String,
    pub bonding_curve: Pubkey,
    pub virtual_token_reserves: u64,
    pub virtual_sol_reserves: u64,
    pub real_token_reserves: u64,
    pub real_sol_reserves: u64,
    pub token_total_supply: u64,
}
```