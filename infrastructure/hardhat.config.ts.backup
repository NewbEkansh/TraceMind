import * as dotenv from "dotenv"
dotenv.config()

import { defineConfig } from "hardhat/config"
import hardhatViem from "@nomicfoundation/hardhat-viem"

export default defineConfig({
  plugins: [hardhatViem],
  solidity: "0.8.24",

  networks: {
    sepolia: {
      type: 'http',
      url: process.env.SEPOLIA_RPC_URL!,
      accounts: [process.env.PRIVATE_KEY!]
    }
  }
})
