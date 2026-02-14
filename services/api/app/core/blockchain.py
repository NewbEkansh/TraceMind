import json
import os
from web3 import Web3
from dotenv import load_dotenv

load_dotenv()

RPC = os.getenv("SEPOLIA_RPC_URL")
PRIVATE_KEY = os.getenv("PRIVATE_KEY")
CONTRACT_ADDRESS = os.getenv("CONTRACT_ADDRESS")

w3 = Web3(Web3.HTTPProvider(RPC))
account = w3.eth.account.from_key(PRIVATE_KEY)

with open("abi.json") as f:
    abi = json.load(f)["abi"]

contract = w3.eth.contract(
    address=Web3.to_checksum_address(CONTRACT_ADDRESS),
    abi=abi
)

def mint_medicine(to, batch_id, qr_hash, manufacturer, expiry):
    nonce = w3.eth.get_transaction_count(account.address)
    tx = contract.functions.mintMedicine(
        Web3.to_checksum_address(to),
        batch_id,
        qr_hash,
        manufacturer,
        expiry
    ).build_transaction({
        "from": account.address,
        "nonce": nonce,
        "gas": 500000,
        "gasPrice": w3.eth.gas_price
    })
    signed = w3.eth.account.sign_transaction(tx, PRIVATE_KEY)
    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
    return tx_hash.hex()

def verify_medicine(token_id):
    """Check if medicine is valid and not revoked"""
    try:
        result = contract.functions.verifyMedicine(token_id).call()
        return {
            "valid": result[0],
            "reason": result[1]
        }
    except Exception as e:
        return {"valid": False, "reason": str(e)}

def get_medicine_data(token_id):
    """Get all medicine data for a token"""
    try:
        medicine = contract.functions.medicines(token_id).call()
        return {
            "batch_id": medicine[0],
            "qr_hash": medicine[1],
            "manufacturer": medicine[2],
            "expiry": medicine[3],
            "revoked": medicine[4]
        }
    except Exception as e:
        return {"error": str(e)}
