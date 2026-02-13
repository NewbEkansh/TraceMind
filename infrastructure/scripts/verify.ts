import "dotenv/config"
import { createPublicClient, http } from "viem"
import { sepolia } from "viem/chains"
import artifact from "../artifacts/contracts/TraceMind.sol/MedicineNFT.json" with { type: "json" }

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS as `0x${string}`

async function main() {
  const client = createPublicClient({
    chain: sepolia,
    transport: http(process.env.SEPOLIA_RPC_URL!)
  })

  const tokenId = 0n

  const medicine = await client.readContract({
    address: CONTRACT_ADDRESS,
    abi: artifact.abi,
    functionName: "getMedicine",
    args: [tokenId]
  })

  console.log("Medicine Data:", medicine)

  const result = await client.readContract({
    address: CONTRACT_ADDRESS,
    abi: artifact.abi,
    functionName: "verifyMedicine",
    args: [tokenId]
  }) as [boolean, string] 

  const [isValid, reason] = result
  console.log("Verification:", isValid ? "VALID" : `INVALID (${reason})`)
}

main()