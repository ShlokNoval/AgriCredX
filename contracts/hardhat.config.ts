import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

// Load from root .env if running from root, or local .env
dotenv.config({ path: "../.env" });
dotenv.config(); // fallback

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      evmVersion: "cancun",
    },
  },
  networks: {
    mst_testnet: {
      url: process.env.MST_RPC_URL || "https://testnetrpc.mstblockchain.com",
      chainId: process.env.MST_CHAIN_ID ? parseInt(process.env.MST_CHAIN_ID) : 91562037,
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
    }
  },
};

export default config;
