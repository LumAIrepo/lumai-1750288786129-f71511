```rust
use anchor_lang::prelude::*;

#[account]
pub struct BondingCurve {
    pub creator: Pubkey,
    pub mint: Pubkey,
    pub virtual_token_reserves: u64,
    pub virtual_sol_reserves: u64,
    pub real_token_reserves: u64,
    pub real_sol_reserves: u64,
    pub token_total_supply: u64,
    pub complete: bool,
    pub bump: u8,
}

impl BondingCurve {
    pub const LEN: usize = 8 + // discriminator
        32 + // creator
        32 + // mint
        8 + // virtual_token_reserves
        8 + // virtual_sol_reserves
        8 + // real_token_reserves
        8 + // real_sol_reserves
        8 + // token_total_supply
        1 + // complete
        1; // bump

    pub fn calculate_buy_price(&self, token_amount: u64) -> Result<u64> {
        if self.complete {
            return Err(ErrorCode::BondingCurveComplete.into());
        }

        let virtual_sol_reserves = self.virtual_sol_reserves;
        let virtual_token_reserves = self.virtual_token_reserves;

        if token_amount >= virtual_token_reserves {
            return Err(ErrorCode::InsufficientTokenReserves.into());
        }

        let new_virtual_token_reserves = virtual_token_reserves
            .checked_sub(token_amount)
            .ok_or(ErrorCode::ArithmeticError)?;

        let new_virtual_sol_reserves = (virtual_sol_reserves as u128)
            .checked_mul(virtual_token_reserves as u128)
            .ok_or(ErrorCode::ArithmeticError)?
            .checked_div(new_virtual_token_reserves as u128)
            .ok_or(ErrorCode::ArithmeticError)?;

        let sol_amount = new_virtual_sol_reserves
            .checked_sub(virtual_sol_reserves as u128)
            .ok_or(ErrorCode::ArithmeticError)?;

        Ok(sol_amount as u64)
    }

    pub fn calculate_sell_price(&self, token_amount: u64) -> Result<u64> {
        if self.complete {
            return Err(ErrorCode::BondingCurveComplete.into());
        }

        let virtual_sol_reserves = self.virtual_sol_reserves;
        let virtual_token_reserves = self.virtual_token_reserves;

        let new_virtual_token_reserves = virtual_token_reserves
            .checked_add(token_amount)
            .ok_or(ErrorCode::ArithmeticError)?;

        let new_virtual_sol_reserves = (virtual_sol_reserves as u128)
            .checked_mul(virtual_token_reserves as u128)
            .ok_or(ErrorCode::ArithmeticError)?
            .checked_div(new_virtual_token_reserves as u128)
            .ok_or(ErrorCode::ArithmeticError)?;

        let sol_amount = (virtual_sol_reserves as u128)
            .checked_sub(new_virtual_sol_reserves)
            .ok_or(ErrorCode::ArithmeticError)?;

        Ok(sol_amount as u64)
    }

    pub fn update_reserves_buy(&mut self, token_amount: u64, sol_amount: u64) -> Result<()> {
        self.virtual_token_reserves = self.virtual_token_reserves
            .checked_sub(token_amount)
            .ok_or(ErrorCode::ArithmeticError)?;

        self.virtual_sol_reserves = self.virtual_sol_reserves
            .checked_add(sol_amount)
            .ok_or(ErrorCode::ArithmeticError)?;

        self.real_token_reserves = self.real_token_reserves
            .checked_sub(token_amount)
            .ok_or(ErrorCode::ArithmeticError)?;

        self.real_sol_reserves = self.real_sol_reserves
            .checked_add(sol_amount)
            .ok_or(ErrorCode::ArithmeticError)?;

        Ok(())
    }

    pub fn update_reserves_sell(&mut self, token_amount: u64, sol_amount: u64) -> Result<()> {
        self.virtual_token_reserves = self.virtual_token_reserves
            .checked_add(token_amount)
            .ok_or(ErrorCode::ArithmeticError)?;

        self.virtual_sol_reserves = self.virtual_sol_reserves
            .checked_sub(sol_amount)
            .ok_or(ErrorCode::ArithmeticError)?;

        self.real_token_reserves = self.real_token_reserves
            .checked_add(token_amount)
            .ok_or(ErrorCode::ArithmeticError)?;

        self.real_sol_reserves = self.real_sol_reserves
            .checked_sub(sol_amount)
            .ok_or(ErrorCode::ArithmeticError)?;

        Ok(())
    }

    pub fn check_completion(&mut self) -> Result<bool> {
        const GRADUATION_THRESHOLD: u64 = 85_000_000_000; // 85 SOL in lamports

        if self.real_sol_reserves >= GRADUATION_THRESHOLD {
            self.complete = true;
            return Ok(true);
        }

        Ok(false)
    }

    pub fn get_market_cap(&self) -> Result<u64> {
        if self.virtual_token_reserves == 0 {
            return Ok(0);
        }

        let price_per_token = (self.virtual_sol_reserves as u128)
            .checked_mul(1_000_000_000) // Scale for precision
            .ok_or(ErrorCode::ArithmeticError)?
            .checked_div(self.virtual_token_reserves as u128)
            .ok_or(ErrorCode::ArithmeticError)?;

        let market_cap = (self.token_total_supply as u128)
            .checked_mul(price_per_token)
            .ok_or(ErrorCode::ArithmeticError)?
            .checked_div(1_000_000_000) // Scale back
            .ok_or(ErrorCode::ArithmeticError)?;

        Ok(market_cap as u64)
    }

    pub fn get_progress_percentage(&self) -> Result<u8> {
        const GRADUATION_THRESHOLD: u64 = 85_000_000_000;

        if self.real_sol_reserves >= GRADUATION_THRESHOLD {
            return Ok(100);
        }

        let progress = (self.real_sol_reserves as u128)
            .checked_mul(100)
            .ok_or(ErrorCode::ArithmeticError)?
            .checked_div(GRADUATION_THRESHOLD as u128)
            .ok_or(ErrorCode::ArithmeticError)?;

        Ok(progress as u8)
    }
}

#[error_code]
pub enum ErrorCode {
    #[msg("Bonding curve is already complete")]
    BondingCurveComplete,
    #[msg("Insufficient token reserves")]
    InsufficientTokenReserves,
    #[msg("Arithmetic error")]
    ArithmeticError,
}
```