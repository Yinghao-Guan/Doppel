import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { AthleteProof } from "../target/types/athlete_proof";
import { assert } from "chai";

describe("athlete-proof", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.AthleteProof as Program<AthleteProof>;
  const user = provider.wallet as anchor.Wallet;

  let profilePda: anchor.web3.PublicKey;
  let profileBump: number;

  before(async () => {
    [profilePda, profileBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("profile"), user.publicKey.toBuffer()],
      program.programId
    );
  });

  it("initializes a profile", async () => {
    await program.methods
      .initializeProfile()
      .accounts({ profile: profilePda, user: user.publicKey })
      .rpc();

    const profile = await program.account.athleteProfile.fetch(profilePda);
    assert.equal(profile.totalWorkouts, 0);
    assert.equal(profile.bestFormScore, 0);
    assert.ok(profile.createdAt.toNumber() > 0);
  });

  it("submits a training proof", async () => {
    const profile = await program.account.athleteProfile.fetch(profilePda);
    const workoutIndex = profile.totalWorkouts;

    const [proofPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("proof"),
        user.publicKey.toBuffer(),
        Buffer.from(new Uint8Array(new Uint32Array([workoutIndex]).buffer)),
      ],
      program.programId
    );

    // Fake 32-byte proof hash (in prod this comes from backend SHA-256)
    const fakeHash = Array(32).fill(0xab);

    await program.methods
      .submitTrainingProof("squat", 12, 82, 75, fakeHash)
      .accounts({
        proof: proofPda,
        profile: profilePda,
        user: user.publicKey,
      })
      .rpc();

    const proof = await program.account.trainingProof.fetch(proofPda);
    assert.equal(proof.exerciseType, "squat");
    assert.equal(proof.reps, 12);
    assert.equal(proof.formScore, 82);
    assert.equal(proof.predictionScore, 75);

    const updatedProfile = await program.account.athleteProfile.fetch(profilePda);
    assert.equal(updatedProfile.totalWorkouts, 1);
    assert.equal(updatedProfile.bestFormScore, 82);
  });
});
