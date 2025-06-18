```rust
use anchor_lang::prelude::*;

#[account]
pub struct TokenLaunch {
    pub creator: Pubkey,
    pub mint: Pubkey,
    pub name: String,
    pub symbol: String,
    pub description: String,
    pub image_uri: String,
    pub website: Option<String>,
    pub telegram: Option<String>,
    pub twitter: Option<String>,
    pub total_supply: u64,
    pub initial_virtual_token_reserves: u64,
    pub initial_virtual_sol_reserves: u64,
    pub initial_real_token_reserves: u64,
    pub virtual_token_reserves: u64,
    pub virtual_sol_reserves: u64,
    pub real_token_reserves: u64,
    pub real_sol_reserves: u64,
    pub token_total_supply: u64,
    pub complete: bool,
    pub bump: u8,
    pub created_at: i64,
    pub updated_at: i64,
    pub migration_fee: u64,
    pub king_of_hill_timestamp: i64,
    pub market_cap: u64,
    pub reply_count: u64,
    pub nsfw: bool,
    pub market_id: u64,
    pub inverted: bool,
}

impl TokenLaunch {
    pub const LEN: usize = 8 + // discriminator
        32 + // creator
        32 + // mint
        4 + 32 + // name (max 32 chars)
        4 + 10 + // symbol (max 10 chars)
        4 + 200 + // description (max 200 chars)
        4 + 200 + // image_uri (max 200 chars)
        1 + 4 + 100 + // website (optional, max 100 chars)
        1 + 4 + 100 + // telegram (optional, max 100 chars)
        1 + 4 + 100 + // twitter (optional, max 100 chars)
        8 + // total_supply
        8 + // initial_virtual_token_reserves
        8 + // initial_virtual_sol_reserves
        8 + // initial_real_token_reserves
        8 + // virtual_token_reserves
        8 + // virtual_sol_reserves
        8 + // real_token_reserves
        8 + // real_sol_reserves
        8 + // token_total_supply
        1 + // complete
        1 + // bump
        8 + // created_at
        8 + // updated_at
        8 + // migration_fee
        8 + // king_of_hill_timestamp
        8 + // market_cap
        8 + // reply_count
        1 + // nsfw
        8 + // market_id
        1; // inverted

    pub fn initialize(
        &mut self,
        creator: Pubkey,
        mint: Pubkey,
        name: String,
        symbol: String,
        description: String,
        image_uri: String,
        website: Option<String>,
        telegram: Option<String>,
        twitter: Option<String>,
        total_supply: u64,
        initial_virtual_token_reserves: u64,
        initial_virtual_sol_reserves: u64,
        initial_real_token_reserves: u64,
        bump: u8,
        migration_fee: u64,
        market_id: u64,
        inverted: bool,
    ) -> Result<()> {
        let clock = Clock::get()?;
        
        self.creator = creator;
        self.mint = mint;
        self.name = name;
        self.symbol = symbol;
        self.description = description;
        self.image_uri = image_uri;
        self.website = website;
        self.telegram = telegram;
        self.twitter = twitter;
        self.total_supply = total_supply;
        self.initial_virtual_token_reserves = initial_virtual_token_reserves;
        self.initial_virtual_sol_reserves = initial_virtual_sol_reserves;
        self.initial_real_token_reserves = initial_real_token_reserves;
        self.virtual_token_reserves = initial_virtual_token_reserves;
        self.virtual_sol_reserves = initial_virtual_sol_reserves;
        self.real_token_reserves = initial_real_token_reserves;
        self.real_sol_reserves = 0;
        self.token_total_supply = total_supply;
        self.complete = false;
        self.bump = bump;
        self.created_at = clock.unix_timestamp;
        self.updated_at = clock.unix_timestamp;
        self.migration_fee = migration_fee;
        self.king_of_hill_timestamp = 0;
        self.market_cap = 0;
        self.reply_count = 0;
        self.nsfw = false;
        self.market_id = market_id;
        self.inverted = inverted;

        Ok(())
    }

    pub fn update_reserves(
        &mut self,
        virtual_token_reserves: u64,
        virtual_sol_reserves: u64,
        real_token_reserves: u64,
        real_sol_reserves: u64,
    ) -> Result<()> {
        let clock = Clock::get()?;
        
        self.virtual_token_reserves = virtual_token_reserves;
        self.virtual_sol_reserves = virtual_sol_reserves;
        self.real_token_reserves = real_token_reserves;
        self.real_sol_reserves = real_sol_reserves;
        self.updated_at = clock.unix_timestamp;

        // Calculate market cap based on current reserves
        if self.virtual_token_reserves > 0 {
            self.market_cap = (self.virtual_sol_reserves * self.token_total_supply) / self.virtual_token_reserves;
        }

        Ok(())
    }

    pub fn complete_launch(&mut self) -> Result<()> {
        let clock = Clock::get()?;
        
        self.complete = true;
        self.updated_at = clock.unix_timestamp;
        self.king_of_hill_timestamp = clock.unix_timestamp;

        Ok(())
    }

    pub fn increment_reply_count(&mut self) -> Result<()> {
        let clock = Clock::get()?;
        
        self.reply_count = self.reply_count.checked_add(1).ok_or(ProgramError::ArithmeticOverflow)?;
        self.updated_at = clock.unix_timestamp;

        Ok(())
    }

    pub fn set_nsfw(&mut self, nsfw: bool) -> Result<()> {
        let clock = Clock::get()?;
        
        self.nsfw = nsfw;
        self.updated_at = clock.unix_timestamp;

        Ok(())
    }

    pub fn get_buy_price(&self, amount: u64) -> Result<u64> {
        if amount == 0 {
            return Ok(0);
        }

        let virtual_sol_reserves = self.virtual_sol_reserves;
        let virtual_token_reserves = self.virtual_token_reserves;

        if virtual_token_reserves <= amount {
            return Err(ProgramError::InsufficientFunds.into());
        }

        let new_virtual_token_reserves = virtual_token_reserves.checked_sub(amount)
            .ok_or(ProgramError::ArithmeticOverflow)?;

        let new_virtual_sol_reserves = (virtual_sol_reserves as u128)
            .checked_mul(virtual_token_reserves as u128)
            .ok_or(ProgramError::ArithmeticOverflow)?
            .checked_div(new_virtual_token_reserves as u128)
            .ok_or(ProgramError::ArithmeticOverflow)?;

        let sol_amount = (new_virtual_sol_reserves as u64)
            .checked_sub(virtual_sol_reserves)
            .ok_or(ProgramError::ArithmeticOverflow)?;

        Ok(sol_amount)
    }

    pub fn get_sell_price(&self, amount: u64) -> Result<u64> {
        if amount == 0 {
            return Ok(0);
        }

        let virtual_sol_reserves = self.virtual_sol_reserves;
        let virtual_token_reserves = self.virtual_token_reserves;

        let new_virtual_token_reserves = virtual_token_reserves.checked_add(amount)
            .ok_or(ProgramError::ArithmeticOverflow)?;

        let new_virtual_sol_reserves = (virtual_sol_reserves as u128)
            .checked_mul(virtual_token_reserves as u128)
            .ok_or(ProgramError::ArithmeticOverflow)?
            .checked_div(new_virtual_token_reserves as u128)
            .ok_or(ProgramError::ArithmeticOverflow)?;

        let sol_amount = virtual_sol_reserves
            .checked_sub(new_virtual_sol_reserves as u64)
            .ok_or(ProgramError::ArithmeticOverflow)?;

        Ok(sol_amount)
    }
}
```