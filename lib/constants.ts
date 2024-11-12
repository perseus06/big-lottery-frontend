import { PublicKey } from "@solana/web3.js";
import { BN } from "@project-serum/anchor";

const PROGRAM_ID = "53KX2Hgg85aNNaXBEZBtAhyf3VGEkiuMyYF2HatWzXpH"; // mine

const GLOBAL_STATE_SEED = "global_state";
const POOL_SEED = "pool"; // mine
const POOL_NATIVE_SEED = "pool_native";

const POOL_VAULT_SEED = "pool_vault_seed";
const BUYERS_INFO_SEED = "buyers_seed";
const USER_INFO_SEED = "user_info_seed";

const PAYTOKEN_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

// const ADMIN_ADDRESS = new PublicKey("ELDbg5iQBZUasVMiBo3yrZdAkvY7bRWmt3BBNKpTtQkQ");
const ADMIN_ADDRESS = new PublicKey("J6fxz41JmWbaJZbAi2pa1cm5SHxbKKRVTeiXoUcrxxxR");

const RPC_ENDPOINT = "";

const DECIMALS = 6; // for BPT for test, 6 for USDC for mainnet // new BN(1000_000_000);

export {
  RPC_ENDPOINT,
  ADMIN_ADDRESS,
  PROGRAM_ID,
  GLOBAL_STATE_SEED,
  POOL_SEED,
  POOL_NATIVE_SEED,
  POOL_VAULT_SEED,
  BUYERS_INFO_SEED,
  USER_INFO_SEED,
  PAYTOKEN_MINT,
  DECIMALS,
};
