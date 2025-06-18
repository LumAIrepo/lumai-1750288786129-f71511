```rust
use anchor_lang::prelude::*;

/// Mathematical utilities for bonding curve calculations
pub struct MathUtils;

impl MathUtils {
    /// Calculate the price for buying tokens using a bonding curve
    /// Formula: price = base_price * (1 + supply / max_supply)^2
    pub fn calculate_buy_price(
        current_supply: u64,
        amount: u64,
        base_price: u64,
        max_supply: u64,
    ) -> Result<u64> {
        require!(current_supply <= max_supply, ErrorCode::SupplyExceeded);
        require!(amount > 0, ErrorCode::InvalidAmount);
        require!(current_supply.checked_add(amount).is_some(), ErrorCode::Overflow);

        let new_supply = current_supply.checked_add(amount).unwrap();
        require!(new_supply <= max_supply, ErrorCode::SupplyExceeded);

        // Calculate integral of bonding curve from current_supply to new_supply
        let start_integral = Self::calculate_integral(current_supply, base_price, max_supply)?;
        let end_integral = Self::calculate_integral(new_supply, base_price, max_supply)?;
        
        end_integral.checked_sub(start_integral).ok_or(ErrorCode::Underflow.into())
    }

    /// Calculate the price for selling tokens using a bonding curve
    pub fn calculate_sell_price(
        current_supply: u64,
        amount: u64,
        base_price: u64,
        max_supply: u64,
    ) -> Result<u64> {
        require!(current_supply >= amount, ErrorCode::InsufficientSupply);
        require!(amount > 0, ErrorCode::InvalidAmount);

        let new_supply = current_supply.checked_sub(amount).unwrap();

        // Calculate integral of bonding curve from new_supply to current_supply
        let start_integral = Self::calculate_integral(new_supply, base_price, max_supply)?;
        let end_integral = Self::calculate_integral(current_supply, base_price, max_supply)?;
        
        end_integral.checked_sub(start_integral).ok_or(ErrorCode::Underflow.into())
    }

    /// Calculate the integral of the bonding curve up to a given supply
    /// Integral of base_price * (1 + x/max_supply)^2 from 0 to supply
    fn calculate_integral(supply: u64, base_price: u64, max_supply: u64) -> Result<u64> {
        if supply == 0 {
            return Ok(0);
        }

        // Use fixed-point arithmetic to avoid floating point operations
        const PRECISION: u64 = 1_000_000;
        
        let supply_scaled = supply.checked_mul(PRECISION).ok_or(ErrorCode::Overflow)?;
        let max_supply_scaled = max_supply.checked_mul(PRECISION).ok_or(ErrorCode::Overflow)?;
        
        // Calculate (1 + supply/max_supply)^3 / 3 - 1/3
        let ratio = supply_scaled.checked_div(max_supply_scaled).ok_or(ErrorCode::DivisionByZero)?;
        let one_plus_ratio = PRECISION.checked_add(ratio).ok_or(ErrorCode::Overflow)?;
        
        // Approximate (1 + ratio)^3 using binomial expansion for better precision
        let ratio_squared = ratio.checked_mul(ratio).ok_or(ErrorCode::Overflow)?
            .checked_div(PRECISION).ok_or(ErrorCode::DivisionByZero)?;
        let ratio_cubed = ratio_squared.checked_mul(ratio).ok_or(ErrorCode::Overflow)?
            .checked_div(PRECISION).ok_or(ErrorCode::DivisionByZero)?;
        
        let cubic_term = PRECISION
            .checked_add(ratio.checked_mul(3).ok_or(ErrorCode::Overflow)?)
            .ok_or(ErrorCode::Overflow)?
            .checked_add(ratio_squared.checked_mul(3).ok_or(ErrorCode::Overflow)?)
            .ok_or(ErrorCode::Overflow)?
            .checked_add(ratio_cubed)
            .ok_or(ErrorCode::Overflow)?;
        
        let integral_scaled = cubic_term
            .checked_sub(PRECISION)
            .ok_or(ErrorCode::Underflow)?
            .checked_div(3)
            .ok_or(ErrorCode::DivisionByZero)?;
        
        let result = base_price
            .checked_mul(supply)
            .ok_or(ErrorCode::Overflow)?
            .checked_mul(integral_scaled)
            .ok_or(ErrorCode::Overflow)?
            .checked_div(PRECISION)
            .ok_or(ErrorCode::DivisionByZero)?;
        
        Ok(result)
    }

    /// Calculate the current price per token at a given supply level
    pub fn calculate_current_price(
        current_supply: u64,
        base_price: u64,
        max_supply: u64,
    ) -> Result<u64> {
        require!(current_supply <= max_supply, ErrorCode::SupplyExceeded);
        
        if max_supply == 0 {
            return Err(ErrorCode::DivisionByZero.into());
        }

        const PRECISION: u64 = 1_000_000;
        
        let supply_ratio = current_supply
            .checked_mul(PRECISION)
            .ok_or(ErrorCode::Overflow)?
            .checked_div(max_supply)
            .ok_or(ErrorCode::DivisionByZero)?;
        
        let one_plus_ratio = PRECISION.checked_add(supply_ratio).ok_or(ErrorCode::Overflow)?;
        let ratio_squared = one_plus_ratio
            .checked_mul(one_plus_ratio)
            .ok_or(ErrorCode::Overflow)?
            .checked_div(PRECISION)
            .ok_or(ErrorCode::DivisionByZero)?;
        
        let current_price = base_price
            .checked_mul(ratio_squared)
            .ok_or(ErrorCode::Overflow)?
            .checked_div(PRECISION)
            .ok_or(ErrorCode::DivisionByZero)?;
        
        Ok(current_price)
    }

    /// Calculate slippage for a given trade
    pub fn calculate_slippage(
        expected_price: u64,
        actual_price: u64,
    ) -> Result<u64> {
        if expected_price == 0 {
            return Err(ErrorCode::DivisionByZero.into());
        }

        const PRECISION: u64 = 10_000; // 0.01% precision
        
        if actual_price > expected_price {
            let difference = actual_price.checked_sub(expected_price).unwrap();
            let slippage = difference
                .checked_mul(PRECISION)
                .ok_or(ErrorCode::Overflow)?
                .checked_div(expected_price)
                .ok_or(ErrorCode::DivisionByZero)?;
            Ok(slippage)
        } else {
            let difference = expected_price.checked_sub(actual_price).unwrap();
            let slippage = difference
                .checked_mul(PRECISION)
                .ok_or(ErrorCode::Overflow)?
                .checked_div(expected_price)
                .ok_or(ErrorCode::DivisionByZero)?;
            Ok(slippage)
        }
    }

    /// Calculate trading fees
    pub fn calculate_fee(amount: u64, fee_basis_points: u64) -> Result<u64> {
        const BASIS_POINTS_DIVISOR: u64 = 10_000;
        
        let fee = amount
            .checked_mul(fee_basis_points)
            .ok_or(ErrorCode::Overflow)?
            .checked_div(BASIS_POINTS_DIVISOR)
            .ok_or(ErrorCode::DivisionByZero)?;
        
        Ok(fee)
    }

    /// Calculate the maximum tokens that can be bought with a given amount of SOL
    pub fn calculate_max_tokens_for_sol(
        sol_amount: u64,
        current_supply: u64,
        base_price: u64,
        max_supply: u64,
    ) -> Result<u64> {
        require!(sol_amount > 0, ErrorCode::InvalidAmount);
        require!(current_supply <= max_supply, ErrorCode::SupplyExceeded);

        // Binary search to find the maximum tokens that can be bought
        let mut low = 0u64;
        let mut high = max_supply.checked_sub(current_supply).ok_or(ErrorCode::Underflow)?;
        let mut result = 0u64;

        while low <= high {
            let mid = low.checked_add(high).ok_or(ErrorCode::Overflow)?.checked_div(2).unwrap();
            
            if mid == 0 {
                break;
            }

            match Self::calculate_buy_price(current_supply, mid, base_price, max_supply) {
                Ok(price) => {
                    if price <= sol_amount {
                        result = mid;
                        low = mid.checked_add(1).ok_or(ErrorCode::Overflow)?;
                    } else {
                        high = mid.checked_sub(1).ok_or(ErrorCode::Underflow)?;
                    }
                }
                Err(_) => {
                    high = mid.checked_sub(1).ok_or(ErrorCode::Underflow)?;
                }
            }

            if high == 0 || low > high {
                break;
            }
        }

        Ok(result)
    }

    /// Validate that a price calculation is within acceptable bounds
    pub fn validate_price_bounds(
        price: u64,
        min_price: u64,
        max_price: u64,
    ) -> Result<()> {
        require!(price >= min_price, ErrorCode::PriceTooLow);
        require!(price <= max_price, ErrorCode::PriceTooHigh);
        Ok(())
    }
}

#[error_code]
pub enum ErrorCode {
    #[msg("Supply exceeded maximum")]
    SupplyExceeded,
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Arithmetic overflow")]
    Overflow,
    #[msg("Arithmetic underflow")]
    Underflow,
    #[msg("Division by zero")]
    DivisionByZero,
    #[msg("Insufficient supply")]
    InsufficientSupply,
    #[msg("Price too low")]
    PriceTooLow,
    #[msg("Price too high")]
    PriceTooHigh,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calculate_buy_price() {
        let result = MathUtils::calculate_buy_price(1000, 100, 1000, 10000);
        assert!(result.is_ok());
    }

    #[test]
    fn test_calculate_sell_price() {
        let result = MathUtils::calculate_sell_price(1000, 100, 1000, 10000);
        assert!(result.is_ok());
    }

    #[test]
    fn test_calculate_current_price() {
        let result = MathUtils::calculate_current_price(1000, 1000, 10000);
        assert!(result.is_ok());
    }

    #[test]
    fn test_calculate_slippage() {
        let result = MathUtils::calculate_slippage(1000, 1100);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 1000); // 10% slippage
    }

    #[test]
    fn test_calculate_fee() {
        let result = MathUtils::calculate_fee(10000, 100); // 1% fee
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 100);
    }
}
```