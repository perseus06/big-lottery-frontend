import { PublicKey } from "@solana/web3.js";
import { BN } from "@project-serum/anchor";

const PROGRAM_ID = "FxQ7ubpWy7aXJvWJUD59twAAAAdcVb9s8GBUPmaU3CH"; // mine

const GLOBAL_STATE_SEED = "global_state";
const POOL_SEED = "pool"; // mine
const POOL_NATIVE_SEED = "pool_native";

const POOL_VAULT_SEED = "pool_vault_seed";
const BUYERS_INFO_SEED = "buyers_seed";
const USER_INFO_SEED = "user_info_seed";

const PAYTOKEN_MINT = new PublicKey("73aEXSFEAo81vGHTrZibg9D7gav5npYthtqPbFn6hswT");

const ADMIN_ADDRESS = new PublicKey("EMtEX2HYFzDL6kyQfTvoDh8vjBnmt1GgbmjScrCKMsjj");

// const RPC_ENDPOINT = "https://rpc-devnet.hellomoon.io/96345231-596e-4f27-9fea-1ef5e33ca64c";
const RPC_ENDPOINT = "https://rpc-devnet.hellomoon.io/9b116588-7790-4286-9bbb-77d326750f2f";

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
