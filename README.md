# TraceMind 🛡️

> **AI-Powered Pharmaceutical Supply Chain Integrity System**  
> Real-time counterfeit detection using Machine Learning, Blockchain & GPS

---

## 🎯 What is TraceMind?

TraceMind is an end-to-end pharmaceutical anti-counterfeit platform built for the modern supply chain. Each medicine unit is minted as an NFT on Ethereum, tracked via GPS, and verified in real-time using an AI anomaly detection engine — all visible on a live intelligence dashboard.

**The Problem:** Counterfeit drugs kill over 500,000 people annually in developing countries.  
**Our Solution:** Immutable blockchain provenance + AI-powered impossible travel detection.

---

## ✨ Key Features

- 🤖 **AI Anomaly Detection** — Isolation Forest ML model detects suspicious scan patterns in <200ms
- 🗺️ **GPS Impossible Travel** — Haversine formula flags medicine appearing in two locations simultaneously
- ⛓️ **Blockchain Verification** — Every medicine unit is an NFT on Ethereum (Sepolia), with on-chain expiry & revocation
- 📱 **Mobile Scanner** — Flutter Android app scans QR codes, captures GPS, displays AI risk level
- 🖥️ **Live Dashboard** — Real-time map with heatmap, clustering, auto-zoom on critical threats
- 🔄 **Microservices Architecture** — Independently scalable AI analytics + main API services

---

## 🏗️ Architecture

```
📱 Flutter App (Android)
    ↓  QR Scan + GPS
🌐 Main API (FastAPI · Port 8000)
    ├──▶ 🤖 Analytics AI (FastAPI · Port 8001)
    │         └── Isolation Forest ML Model
    │              └── Returns: CRITICAL / HIGH / LOW
    ├──▶ 💾 Supabase (PostgreSQL + Realtime)
    │         └── Table: scans
    └──▶ ⛓️ Ethereum Sepolia
              └── MedicineNFT Smart Contract
                   └── Mint · Verify · Revoke
                        ↓
🗺️ Dashboard (Next.js · Port 3000)
    └── Realtime map + heatmap + scan log
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile | Flutter (Android) |
| Main API | FastAPI + Python |
| AI Engine | scikit-learn Isolation Forest |
| Database | Supabase (PostgreSQL + Realtime) |
| Blockchain | Ethereum Sepolia · Hardhat · Web3.py |
| Smart Contract | Solidity (ERC-721 NFT) |
| Dashboard | Next.js 14 · TypeScript · Leaflet · Tailwind |
| Anomaly Detection | Haversine Formula + ML Hybrid |

---

## 🚀 Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- Flutter 3.x
- Git

### Clone
```bash
git clone https://github.com/NewbEkansh/TraceMind.git
cd TraceMind
```

### Environment Setup
**Copy the template for Backend(Services/api/.env)**
```env
cp .env.example services/api/.env
```

**Dashboard** (`apps/dashboard/.env.local`):
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Run All Services

**Terminal 1 — Analytics AI:**
```bash
cd services/analytics
source venv/bin/activate
python main.py
# ▶ Running on http://0.0.0.0:8001
```

**Terminal 2 — Main API:**
```bash
cd services/api
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
# ▶ Running on http://0.0.0.0:8000
```

**Terminal 3 — Dashboard:**
```bash
cd apps/dashboard
npm install
npm run dev
# ▶ Open http://localhost:3000
```

**Terminal 4 — Flutter App:**
```bash
cd apps/mobile
flutter pub get
flutter run --release
```

---

## 📱 How It Works

### 1. Medicine Registration
```bash
# Mint a medicine NFT on Ethereum
curl -X POST "http://localhost:8000/mint?address=0x...&batch_id=BATCH001&manufacturer=Pfizer&expiry_date=2028-12-31"
```
Each medicine gets a unique token ID encoded into its QR code.

### 2. Field Scanning
A distributor or pharmacist scans the QR code with the TraceMind app. The app captures:
- QR data (unit ID + token ID + batch)
- Current GPS coordinates
- Timestamp

### 3. AI Verification
The backend runs two checks in parallel:
- **Physics check:** Was this medicine physically possible to move this fast? (Haversine distance ÷ time)
- **ML check:** Does this scan pattern match known anomalies? (Isolation Forest)

### 4. Result
```json
{
  "status": "stored",
  "anomaly_detected": true,
  "risk_level": "CRITICAL",
  "speed_kmh": 133990.25,
  "distance_km": 1204.68,
  "ml_powered": true
}
```

### 5. Dashboard Alert
The live dashboard auto-zooms to the anomaly location, updates the heatmap, and logs the incident.

---

## 🔗 API Reference

**Base URL:** `http://YOUR_MAC_IP:8000`  
**Auth:** `x-api-key: your_api_key` header required

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/verify` | Submit a scan (GPS + unit ID) |
| `GET` | `/verify/{token_id}` | Verify NFT on blockchain |
| `POST` | `/mint` | Mint a new medicine NFT |
| `GET` | `/scans` | Get all scans (dashboard) |
| `GET` | `/history/{unit_id}` | Chain of custody for a unit |

---

## 🧪 Test the System

### Simulate Impossible Travel
```bash
# Scan 1: Tamil Nadu
curl -X POST "http://localhost:8000/verify" \
  -H "Content-Type: application/json" \
  -H "x-api-key: your_api_key" \
  -d '{"unit_id":"TEST001","latitude":12.970,"longitude":79.156,"timestamp":"2026-02-15T10:00:00Z"}'

# Scan 2: Delhi (10 seconds later, 1200km away)
curl -X POST "http://localhost:8000/verify" \
  -H "Content-Type: application/json" \
  -H "x-api-key: your_api_key" \
  -d '{"unit_id":"TEST001","latitude":28.613,"longitude":77.209,"timestamp":"2026-02-15T10:00:10Z"}'

# Result: anomaly_detected: true, risk_level: CRITICAL
```

---

## 📊 Smart Contract

**Network:** Ethereum Sepolia Testnet  
**Contract:** [`0xYourDeployedContractAddress`](https://sepolia.etherscan.io/address/0xYourDeployedContractAddress)

```solidity
// Core functions
function mintMedicine(address to, string memory batchId, string memory qrHash, 
                      string memory manufacturer, string memory expiryDate) 
function verifyMedicine(uint256 tokenId) returns (bool valid, bool expired, bool revoked)
function revokeMedicine(uint256 tokenId)
```

**Redeploy if needed:**
```bash
cd infrastructure/contracts
./node_modules/.bin/hardhat compile
./node_modules/.bin/hardhat run scripts/deploy.js --network sepolia
```

---

## 📁 Project Structure

```
TraceMind/
├── apps/
│   ├── mobile/                    # Flutter Android app
│   │   └── lib/
│   │       ├── main.dart
│   │       ├── screens/scanner_screen.dart
│   │       └── services/api_service.dart
│   └── dashboard/                 # Next.js dashboard
│       ├── app/page.tsx
│       ├── components/Map.tsx
│       └── hooks/useRealTimeAlerts.ts
├── services/
│   ├── api/                       # Main FastAPI (port 8000)
│   │   └── app/
│   │       ├── main.py
│   │       ├── routes/verify.py
│   │       └── core/
│   │           ├── blockchain.py
│   │           └── geo.py
│   └── analytics/                 # AI service (port 8001)
│       ├── main.py
│       ├── logic.py               # Isolation Forest model
│       └── schema.py
└── infrastructure/
    └── contracts/                 # Hardhat + Solidity
        ├── contracts/TraceMind.sol
        └── scripts/deploy.js
```

---

## 🔐 Security

- All `.env` files excluded via `.gitignore`
- API key authentication on every endpoint
- Private keys never committed to version control
- Deployed on Sepolia testnet (no real funds at risk)

---


## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">
  <strong>TraceMind</strong> — Protecting medicine integrity with AI + Blockchain
  <br/>
  <sub>Built with ❤️ for safer pharmaceutical supply chains</sub>
    :D
</div>
