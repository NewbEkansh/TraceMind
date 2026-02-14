#!/bin/bash

echo "🪙 TraceMind NFT Minter"
echo "======================"
echo ""

# Default values
DEFAULT_ADDRESS="0xC01B11d9F7631025cC4f57f8Bb7aCE8552AdB762"
DEFAULT_MANUFACTURER="Pfizer"

# Get inputs
read -p "Batch ID (e.g., BATCH004): " BATCH_ID
read -p "QR Hash (e.g., QmHash789): " QR_HASH
read -p "Manufacturer [$DEFAULT_MANUFACTURER]: " MANUFACTURER
MANUFACTURER=${MANUFACTURER:-$DEFAULT_MANUFACTURER}
read -p "Expiry Date (YYYY-MM-DD, e.g., 2029-12-31): " EXPIRY_DATE
read -p "Wallet Address [$DEFAULT_ADDRESS]: " ADDRESS
ADDRESS=${ADDRESS:-$DEFAULT_ADDRESS}

echo ""
echo "Minting NFT..."
echo "Batch: $BATCH_ID"
echo "Manufacturer: $MANUFACTURER"
echo "Expiry: $EXPIRY_DATE"
echo ""

# Mint the NFT
curl -X POST "http://localhost:8000/mint?address=$ADDRESS&batch_id=$BATCH_ID&qr_hash=$QR_HASH&manufacturer=$MANUFACTURER&expiry_date=$EXPIRY_DATE" | python3 -m json.tool

echo ""
echo "✅ Done!"
