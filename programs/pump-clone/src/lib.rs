```rust
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};
use anchor_spl::associated_token::AssociatedToken;

declare_id!("11111111111111111111111111111112");

#[program]
pub mod pump_clone {
    use super::*;

    pub fn initialize_market(
        ctx: Context<InitializeMarket>,
        market_id: u64,
        question: String,
        description: String,
        end_time: i64,
        initial_liquidity: u64,
    ) -> Result<()> {
        let market = &mut ctx.accounts.market;
        let clock = Clock::get()?;

        require!(end_time > clock.unix_timestamp, ErrorCode::InvalidEndTime);
        require!(question.len() <= 200, ErrorCode::QuestionTooLong);
        require!(description.len() <= 1000, ErrorCode::DescriptionTooLong);
        require!(initial_liquidity > 0, ErrorCode::InvalidLiquidity);

        market.authority = ctx.accounts.authority.key();
        market.market_id = market_id;
        market.question = question;
        market.description = description;
        market.end_time = end_time;
        market.created_at = clock.unix_timestamp;
        market.total_yes_shares = 0;
        market.total_no_shares = 0;
        market.total_liquidity = initial_liquidity;
        market.resolved = false;
        market.outcome = None;
        market.bump = *ctx.bumps.get("market").unwrap();

        // Transfer initial liquidity
        let cpi_accounts = Transfer {
            from: ctx.accounts.authority_token_account.to_account_info(),
            to: ctx.accounts.market_vault.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, initial_liquidity)?;

        emit!(MarketCreated {
            market: market.key(),
            authority: market.authority,
            market_id,
            question: market.question.clone(),
            end_time,
        });

        Ok(())
    }

    pub fn buy_shares(
        ctx: Context<BuyShares>,
        amount: u64,
        is_yes: bool,
    ) -> Result<()> {
        let market = &mut ctx.accounts.market;
        let user_position = &mut ctx.accounts.user_position;
        let clock = Clock::get()?;

        require!(!market.resolved, ErrorCode::MarketResolved);
        require!(clock.unix_timestamp < market.end_time, ErrorCode::MarketExpired);
        require!(amount > 0, ErrorCode::InvalidAmount);

        let price = calculate_share_price(
            market.total_yes_shares,
            market.total_no_shares,
            market.total_liquidity,
            is_yes,
        )?;

        let cost = (amount as u128 * price as u128 / 1_000_000) as u64;

        // Transfer payment
        let cpi_accounts = Transfer {
            from: ctx.accounts.user_token_account.to_account_info(),
            to: ctx.accounts.market_vault.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, cost)?;

        // Update market state
        if is_yes {
            market.total_yes_shares = market.total_yes_shares.checked_add(amount).unwrap();
        } else {
            market.total_no_shares = market.total_no_shares.checked_add(amount).unwrap();
        }
        market.total_liquidity = market.total_liquidity.checked_add(cost).unwrap();

        // Update user position
        if user_position.user == Pubkey::default() {
            user_position.user = ctx.accounts.user.key();
            user_position.market = market.key();
            user_position.yes_shares = 0;
            user_position.no_shares = 0;
        }

        if is_yes {
            user_position.yes_shares = user_position.yes_shares.checked_add(amount).unwrap();
        } else {
            user_position.no_shares = user_position.no_shares.checked_add(amount).unwrap();
        }

        emit!(SharesPurchased {
            market: market.key(),
            user: ctx.accounts.user.key(),
            amount,
            is_yes,
            price,
            cost,
        });

        Ok(())
    }

    pub fn sell_shares(
        ctx: Context<SellShares>,
        amount: u64,
        is_yes: bool,
    ) -> Result<()> {
        let market = &mut ctx.accounts.market;
        let user_position = &mut ctx.accounts.user_position;
        let clock = Clock::get()?;

        require!(!market.resolved, ErrorCode::MarketResolved);
        require!(clock.unix_timestamp < market.end_time, ErrorCode::MarketExpired);
        require!(amount > 0, ErrorCode::InvalidAmount);

        let user_shares = if is_yes {
            user_position.yes_shares
        } else {
            user_position.no_shares
        };
        require!(user_shares >= amount, ErrorCode::InsufficientShares);

        let price = calculate_share_price(
            market.total_yes_shares,
            market.total_no_shares,
            market.total_liquidity,
            is_yes,
        )?;

        let payout = (amount as u128 * price as u128 / 1_000_000) as u64;

        // Transfer payout
        let seeds = &[
            b"market",
            &market.market_id.to_le_bytes(),
            &[market.bump],
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.market_vault.to_account_info(),
            to: ctx.accounts.user_token_account.to_account_info(),
            authority: market.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::transfer(cpi_ctx, payout)?;

        // Update market state
        if is_yes {
            market.total_yes_shares = market.total_yes_shares.checked_sub(amount).unwrap();
        } else {
            market.total_no_shares = market.total_no_shares.checked_sub(amount).unwrap();
        }
        market.total_liquidity = market.total_liquidity.checked_sub(payout).unwrap();

        // Update user position
        if is_yes {
            user_position.yes_shares = user_position.yes_shares.checked_sub(amount).unwrap();
        } else {
            user_position.no_shares = user_position.no_shares.checked_sub(amount).unwrap();
        }

        emit!(SharesSold {
            market: market.key(),
            user: ctx.accounts.user.key(),
            amount,
            is_yes,
            price,
            payout,
        });

        Ok(())
    }

    pub fn resolve_market(
        ctx: Context<ResolveMarket>,
        outcome: bool,
    ) -> Result<()> {
        let market = &mut ctx.accounts.market;
        let clock = Clock::get()?;

        require!(ctx.accounts.authority.key() == market.authority, ErrorCode::Unauthorized);
        require!(!market.resolved, ErrorCode::MarketAlreadyResolved);
        require!(clock.unix_timestamp >= market.end_time, ErrorCode::MarketNotExpired);

        market.resolved = true;
        market.outcome = Some(outcome);

        emit!(MarketResolved {
            market: market.key(),
            outcome,
            resolved_at: clock.unix_timestamp,
        });

        Ok(())
    }

    pub fn claim_winnings(ctx: Context<ClaimWinnings>) -> Result<()> {
        let market = &ctx.accounts.market;
        let user_position = &mut ctx.accounts.user_position;

        require!(market.resolved, ErrorCode::MarketNotResolved);
        require!(user_position.user == ctx.accounts.user.key(), ErrorCode::Unauthorized);

        let outcome = market.outcome.unwrap();
        let winning_shares = if outcome {
            user_position.yes_shares
        } else {
            user_position.no_shares
        };

        require!(winning_shares > 0, ErrorCode::NoWinningShares);

        let total_winning_shares = if outcome {
            market.total_yes_shares
        } else {
            market.total_no_shares
        };

        let payout = (winning_shares as u128 * market.total_liquidity as u128 / total_winning_shares as u128) as u64;

        // Transfer winnings
        let seeds = &[
            b"market",
            &market.market_id.to_le_bytes(),
            &[market.bump],
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.market_vault.to_account_info(),
            to: ctx.accounts.user_token_account.to_account_info(),
            authority: market.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::transfer(cpi_ctx, payout)?;

        // Reset user position
        user_position.yes_shares = 0;
        user_position.no_shares = 0;

        emit!(WinningsClaimed {
            market: market.key(),
            user: ctx.accounts.user.key(),
            amount: payout,
        });

        Ok(())
    }
}

fn calculate_share_price(
    yes_shares: u64,
    no_shares: u64,
    liquidity: u64,
    is_yes: bool,
) -> Result<u64> {
    if liquidity == 0 {
        return Ok(500_000); // 0.5 price in micro-units
    }

    let total_shares = yes_shares + no_shares;
    if total_shares == 0 {
        return Ok(500_000); // 0.5 price in micro-units
    }

    let target_shares = if is_yes { yes_shares } else { no_shares };
    let price = (target_shares as u128 * 1_000_000 / total_shares as u128) as u64;
    
    // Ensure price is between 0.01 and 0.99
    Ok(price.max(10_000).min(990_000))
}

#[derive(Accounts)]
#[instruction(market_id: u64)]
pub struct InitializeMarket<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Market::INIT_SPACE,
        seeds = [b"market", market_id.to_le_bytes().as_ref()],
        bump
    )]
    pub market: Account<'info, Market>,
    
    #[account(
        init,
        payer = authority,
        token::mint = mint,
        token::authority = market,
        seeds = [b"vault", market.key().as_ref()],
        bump
    )]
    pub market_vault: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = authority
    )]
    pub authority_token_account: Account<'info, TokenAccount>,
    
    pub mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct BuyShares<'info> {
    #[account(mut)]
    pub market: Account<'info, Market>,
    
    #[account(
        init_if_needed,
        payer = user,
        space = 8 + UserPosition::INIT_SPACE,
        seeds = [b"position", market.key().as_ref(), user.key().as_ref()],
        bump
    )]
    pub user_position: Account<'info, UserPosition>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = user
    )]
    pub user_token_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        seeds = [b"vault", market.key().as_ref()],
        bump
    )]
    pub market_vault: Account<'info, TokenAccount>,
    
    pub mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct SellShares<'info> {
    #[account(mut)]
    pub market: Account<'info, Market>,
    
    #[account(
        mut,
        seeds = [b"position", market.key().as_ref(), user.key().as_ref()],
        bump
    )]
    pub user_position: Account<'info, UserPosition>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = user
    )]
    pub user_token_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        seeds = [b"vault", market.key().as_ref()],
        bump
    )]
    pub market_vault: Account<'info, TokenAccount>,
    
    pub mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ResolveMarket<'info> {
    #[account(mut)]
    pub market: Account<'info, Market>,
    
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct ClaimWinnings<'info> {
    pub market: Account<'info, Market>,
    
    #[account(
        mut,
        seeds = [b"position", market.key().as_ref(), user.key().as_ref()],
        bump
    )]
    pub user_position: Account<'info, UserPosition>,
    
    #[account(mut)]
    pub user: Signer<'info>,