from fastapi import FastAPI
from app.routes.verify import router as verify_router
from app.core.blockchain import mint_medicine, verify_medicine, get_medicine_data
from datetime import datetime

app = FastAPI(title="TraceMind API")
app.include_router(verify_router)

@app.get("/")
async def root():
    return {"message": "TraceMind Backend Running"}

@app.post("/mint")
async def mint(
    address: str, 
    batch_id: str, 
    qr_hash: str, 
    manufacturer: str, 
    expiry_date: str
):
    """
    Mint a new medicine NFT on Sepolia blockchain
    expiry_date format: "YYYY-MM-DD" (e.g., "2025-12-31")
    """
    try:
        # Convert date to Unix timestamp
        expiry_timestamp = int(datetime.strptime(expiry_date, "%Y-%m-%d").timestamp())
        
        tx_hash = mint_medicine(address, batch_id, qr_hash, manufacturer, expiry_timestamp)
        return {
            "success": True,
            "tx_hash": tx_hash,
            "explorer_url": f"https://sepolia.etherscan.io/tx/{tx_hash}",
            "expiry_date": expiry_date
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/verify/{token_id}")
async def verify(token_id: int):
    """Verify medicine authenticity and get all data"""
    verification = verify_medicine(token_id)
    data = get_medicine_data(token_id)
    
    # Convert Unix timestamp to readable date
    if "expiry" in data:
        data["expiry_date"] = datetime.fromtimestamp(data["expiry"]).strftime("%Y-%m-%d")
    
    return {
        "verification": verification,
        "medicine_data": data
    }
