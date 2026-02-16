import "dotenv/config"
import { createWalletClient, http } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { sepolia } from "viem/chains"
import artifact from "../artifacts/contracts/TraceMind.sol/MedicineNFT.json" with { type: "json" }

// ✅ Clean and validate private key
const rawKey = process.env.PRIVATE_KEY?.trim().replace(/^0x/, '')
if (!rawKey || rawKey.length !== 64) {
  throw new Error(`Invalid PRIVATE_KEY: must be 64 hex chars (without 0x). Got length: ${rawKey?.length}`)
}
const account = privateKeyToAccount(`0x${rawKey}`)

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS as `0x${string}`

async function main() {
  const client = createWalletClient({
    account,
    chain: sepolia,
    transport: http(process.env.SEPOLIA_RPC_URL!),
  })

  const hash = await client.writeContract({
    address: CONTRACT_ADDRESS,
    abi: artifact.abi,
    functionName: "mintMedicine",
    args: [
      account.address,          // to
      "BATCH_001",              // batchId
      "QR_HASH_123",            // qrHash
      "PharmaCorp",             // manufacturer
      2000000000n,              // expiry (Jan 2033)
    ],
  })

  console.log("Mint TX:", hash)
  console.log("View on Sepolia Etherscan: https://sepolia.etherscan.io/tx/" + hash)
}

main().catch((err) => {
  console.error("❌ Error:", err.message)
  process.exit(1)
})