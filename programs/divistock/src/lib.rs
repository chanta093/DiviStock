use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

declare_id!("9YVmepQsUTN8sJ94ov34Lrrnt9ZrZSS8AAXuRjFUcory");

#[program]
pub mod divistock {
    use super::*;

    pub fn initialize_distribution(ctx: Context<InitializeDistribution>, merkle_root: [u8; 32], total_usdc: u64) -> Result<()> {
        let distribution = &mut ctx.accounts.distribution;
        distribution.issuer = ctx.accounts.issuer.key();
        distribution.mint = ctx.accounts.mint.key();
        distribution.merkle_root = merkle_root;
        distribution.total_usdc = total_usdc;
        distribution.funded_usdc = 0;
        distribution.claimed_usdc = 0;
        distribution.bump = ctx.bumps.distribution;
        Ok(())
    }

    pub fn fund_distribution(ctx: Context<FundDistribution>, amount: u64) -> Result<()> {
        require!(ctx.accounts.distribution.funded_usdc.checked_add(amount).ok_or(DiviStockError::Overflow)? <= ctx.accounts.distribution.total_usdc, DiviStockError::ExceedsDistribution);
        token::transfer(CpiContext::new(ctx.accounts.token_program.to_account_info(), Transfer {
            from: ctx.accounts.issuer_ata.to_account_info(), to: ctx.accounts.vault.to_account_info(), authority: ctx.accounts.issuer.to_account_info()
        }), amount)?;
        ctx.accounts.distribution.funded_usdc = ctx.accounts.distribution.funded_usdc.checked_add(amount).ok_or(DiviStockError::Overflow)?;
        Ok(())
    }

    pub fn claim(ctx: Context<Claim>, amount: u64, proof: Vec<[u8; 32]>) -> Result<()> {
        let distribution = &mut ctx.accounts.distribution;
        require!(verify_merkle_proof(distribution.merkle_root, leaf(&ctx.accounts.holder.key(), amount), proof), DiviStockError::InvalidProof);
        require!(distribution.claimed_usdc.checked_add(amount).ok_or(DiviStockError::Overflow)? <= distribution.funded_usdc, DiviStockError::InsufficientFunding);
        let seeds: &[&[u8]] = &[b"distribution", distribution.issuer.as_ref(), &[distribution.bump]];
        token::transfer(CpiContext::new_with_signer(ctx.accounts.token_program.to_account_info(), Transfer {
            from: ctx.accounts.vault.to_account_info(), to: ctx.accounts.holder_ata.to_account_info(), authority: distribution.to_account_info()
        }, &[seeds]), amount)?;
        ctx.accounts.receipt.holder = ctx.accounts.holder.key();
        ctx.accounts.receipt.amount = amount;
        distribution.claimed_usdc = distribution.claimed_usdc.checked_add(amount).ok_or(DiviStockError::Overflow)?;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeDistribution<'info> {
    #[account(mut)] pub issuer: Signer<'info>,
    pub mint: Account<'info, Mint>,
    #[account(init, payer = issuer, space = 8 + Distribution::LEN, seeds = [b"distribution", issuer.key().as_ref()], bump)]
    pub distribution: Account<'info, Distribution>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Claim<'info> {
    #[account(mut)] pub holder: Signer<'info>,
    #[account(mut, seeds = [b"distribution", distribution.issuer.as_ref()], bump = distribution.bump)]
    pub distribution: Account<'info, Distribution>,
    #[account(mut, constraint = vault.mint == distribution.mint, constraint = vault.owner == distribution.key())] pub vault: Account<'info, TokenAccount>,
    #[account(mut, constraint = holder_ata.owner == holder.key(), constraint = holder_ata.mint == distribution.mint)] pub holder_ata: Account<'info, TokenAccount>,
    #[account(init, payer = holder, space = 8 + ClaimReceipt::LEN, seeds = [b"claim", distribution.key().as_ref(), holder.key().as_ref()], bump)]
    pub receipt: Account<'info, ClaimReceipt>,
    pub token_program: Program<'info, Token>, pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct FundDistribution<'info> {
    #[account(mut, address = distribution.issuer)] pub issuer: Signer<'info>,
    #[account(mut, seeds = [b"distribution", distribution.issuer.as_ref()], bump = distribution.bump)] pub distribution: Account<'info, Distribution>,
    #[account(mut, constraint = issuer_ata.owner == issuer.key(), constraint = issuer_ata.mint == distribution.mint)] pub issuer_ata: Account<'info, TokenAccount>,
    #[account(mut, constraint = vault.mint == distribution.mint, constraint = vault.owner == distribution.key())] pub vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[account] pub struct Distribution { pub issuer: Pubkey, pub mint: Pubkey, pub merkle_root: [u8; 32], pub total_usdc: u64, pub funded_usdc: u64, pub claimed_usdc: u64, pub bump: u8 }
impl Distribution { pub const LEN: usize = 32 + 32 + 32 + 8 + 8 + 8 + 1; }
#[account] pub struct ClaimReceipt { pub holder: Pubkey, pub amount: u64 }
impl ClaimReceipt { pub const LEN: usize = 32 + 8; }

fn leaf(holder: &Pubkey, amount: u64) -> [u8; 32] { anchor_lang::solana_program::hash::hashv(&[holder.as_ref(), &amount.to_le_bytes()]).to_bytes() }
fn verify_merkle_proof(root: [u8; 32], mut node: [u8; 32], proof: Vec<[u8; 32]>) -> bool { for sibling in proof { node = if node <= sibling { anchor_lang::solana_program::hash::hashv(&[&node, &sibling]).to_bytes() } else { anchor_lang::solana_program::hash::hashv(&[&sibling, &node]).to_bytes() }; } node == root }
#[error_code] pub enum DiviStockError { #[msg("The Merkle proof is not eligible for this distribution.")] InvalidProof, #[msg("Claimed amount overflowed.")] Overflow, #[msg("Funding exceeds the committed distribution total.")] ExceedsDistribution, #[msg("The vault has not been funded for this claim.")] InsufficientFunding }
