import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@typechain/hardhat";
import '@openzeppelin/hardhat-upgrades';

import * as dotenv from "dotenv";

dotenv.config({
  path: "./.env",
  override: true,
});

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.22",
        settings: {
          optimizer: {
            enabled: true,
            runs: 100_000,
          },
          evmVersion: "shanghai",
        },
      },
    ],
  },
  networks: {
        // Metis Public Chains
        mts_mainnet: {
          url: process.env.RPC_MTS_MAINNET!
        },
        mts_sepolia: {
          url: process.env.RPC_MTS_SEPOLIA!
        },
  },
  etherscan: {
    apiKey: {
      metisMainnet: process.env.BLOCKSCOUT_API_KEY_MTS!,
      metisSepolia: process.env.BLOCKSCOUT_API_KEY_MTS!,
    },
    customChains: [
      {
        network: "metisSepolia",
        chainId: 59902,
        urls: {
          apiURL: "https://sepolia-explorer-api.metisdevops.link/api",
          browserURL: "https://sepolia-explorer.metisdevops.link",
        },
      },
      {
        network: "metisMainnet",
        chainId: 1088,
        urls: {
          apiURL: "https://andromeda-explorer.metis.io/api",
          browserURL: "https://andromeda-explorer.metis.io",
        },
      },
    ],
  }
};

export default config;
