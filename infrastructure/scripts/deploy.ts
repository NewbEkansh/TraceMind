import { createWalletClient, createPublicClient, http } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { sepolia } from "viem/chains"
import artifact from "../artifacts/contracts/TraceMind.sol/MedicineNFT.json" with { type: "json" }
import dotenv from "dotenv"

dotenv.config()

const rawKey = process.env.PRIVATE_KEY?.trim().replace(/^0x/, '')
if (!rawKey || rawKey.length !== 64) {
  throw new Error(`Invalid PRIVATE_KEY: must be 64 hex chars. Got: ${rawKey?.length}`)
}
const account = privateKeyToAccount(`0x${rawKey}`)

// ✅ WalletClient for sending transactions
const walletClient = createWalletClient({
  account,
  chain: sepolia,
  transport: http(process.env.SEPOLIA_RPC_URL!),
})

// ✅ PublicClient for reading/waiting
const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(process.env.SEPOLIA_RPC_URL!),
})

async function main() {
  console.log("🚀 Deploying MedicineNFT to Sepolia...")
  console.log("Deployer:", account.address)

  const hash = await walletClient.deployContract({
    abi: artifact.abi,
    bytecode: artifact.bytecode as `0x${string}`,
    args: [account.address],
  })

  console.log("📝 TX hash:", hash)
  console.log("⏳ Waiting for confirmation...")

  // ✅ Correct: waitForTransactionReceipt is on PublicClient
  const receipt = await publicClient.waitForTransactionReceipt({ hash })

  console.log("\n✅ Contract deployed successfully!")
  console.log("📍 Contract address:", receipt.contractAddress)
  console.log("🔗 Etherscan:", `https://sepolia.etherscan.io/address/${receipt.contractAddress}`)
}

main().catch((err) => {
  console.error("❌ Deployment failed:", err.message)
  process.exit(1)
})