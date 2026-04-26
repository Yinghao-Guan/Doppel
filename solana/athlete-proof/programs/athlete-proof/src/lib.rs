use anchor_lang::prelude::*;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod athlete_proof {
    use super::*;

    /// Create an on-chain profile for a new athlete wallet.
    pub fn initialize_profile(ctx: Context<InitializeProfile>) -> Result<()> {
        let profile = &mut ctx.accounts.profile;
        profile.owner = ctx.accounts.user.key();
        profile.total_workouts = 0;
        profile.best_form_score = 0;
        profile.created_at = Clock::get()?.unix_timestamp;
        Ok(())
    }

    /// Submit a verifiable training proof on-chain.
    pub fn submit_training_proof(
        ctx: Context<SubmitTrainingProof>,
        exercise_type: String,
        reps: u16,
        form_score: u8,
        prediction_score: u8,
        proof_hash: [u8; 32],
    ) -> Result<()> {
        require!(form_score <= 100, AthleteError::InvalidScore);
        require!(prediction_score <= 100, AthleteError::InvalidScore);
        require!(exercise_type.len() <= 32, AthleteError::ExerciseTypeTooLong);

        let proof = &mut ctx.accounts.proof;
        let profile = &mut ctx.accounts.profile;

        require_keys_eq!(profile.owner, ctx.accounts.user.key(), AthleteError::Unauthorized);

        proof.owner = ctx.accounts.user.key();
        proof.exercise_type = exercise_type;
        proof.reps = reps;
        proof.form_score = form_score;
        proof.prediction_score = prediction_score;
        proof.proof_hash = proof_hash;
        proof.timestamp = Clock::get()?.unix_timestamp;

        profile.total_workouts = profile.total_workouts.saturating_add(1);
        if form_score > profile.best_form_score {
            profile.best_form_score = form_score;
        }

        emit!(ProofSubmitted {
            owner: proof.owner,
            exercise_type: proof.exercise_type.clone(),
            reps,
            form_score,
            prediction_score,
            timestamp: proof.timestamp,
        });

        Ok(())
    }
}

// ── Accounts ─────────────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct InitializeProfile<'info> {
    #[account(
        init,
        payer = user,
        space = AthleteProfile::SPACE,
        seeds = [b"profile", user.key().as_ref()],
        bump,
    )]
    pub profile: Account<'info, AthleteProfile>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(exercise_type: String, reps: u16)]
pub struct SubmitTrainingProof<'info> {
    #[account(
        init,
        payer = user,
        space = TrainingProof::SPACE,
        seeds = [
            b"proof",
            user.key().as_ref(),
            &profile.total_workouts.to_le_bytes(),
        ],
        bump,
    )]
    pub proof: Account<'info, TrainingProof>,

    #[account(
        mut,
        seeds = [b"profile", user.key().as_ref()],
        bump,
    )]
    pub profile: Account<'info, AthleteProfile>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>,
}

// ── State ─────────────────────────────────────────────────────────────────────

#[account]
pub struct AthleteProfile {
    pub owner: Pubkey,           // 32
    pub total_workouts: u32,     // 4
    pub best_form_score: u8,     // 1
    pub created_at: i64,         // 8
}

impl AthleteProfile {
    // discriminator(8) + owner(32) + total_workouts(4) + best_form_score(1) + created_at(8)
    pub const SPACE: usize = 8 + 32 + 4 + 1 + 8;
}

#[account]
pub struct TrainingProof {
    pub owner: Pubkey,           // 32
    pub exercise_type: String,   // 4 + 32
    pub reps: u16,               // 2
    pub form_score: u8,          // 1
    pub prediction_score: u8,    // 1
    pub proof_hash: [u8; 32],    // 32
    pub timestamp: i64,          // 8
}

impl TrainingProof {
    // discriminator(8) + owner(32) + exercise_type(4+32) + reps(2) + form_score(1)
    // + prediction_score(1) + proof_hash(32) + timestamp(8)
    pub const SPACE: usize = 8 + 32 + 36 + 2 + 1 + 1 + 32 + 8;
}

// ── Events ────────────────────────────────────────────────────────────────────

#[event]
pub struct ProofSubmitted {
    pub owner: Pubkey,
    pub exercise_type: String,
    pub reps: u16,
    pub form_score: u8,
    pub prediction_score: u8,
    pub timestamp: i64,
}

// ── Errors ────────────────────────────────────────────────────────────────────

#[error_code]
pub enum AthleteError {
    #[msg("Score must be between 0 and 100.")]
    InvalidScore,
    #[msg("Exercise type must be 32 characters or fewer.")]
    ExerciseTypeTooLong,
    #[msg("Signer does not own this profile.")]
    Unauthorized,
}
