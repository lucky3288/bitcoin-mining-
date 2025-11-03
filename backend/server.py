from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import hashlib
import random


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class Wallet(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_name: str
    address: str
    balance: float = 1000.0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class WalletCreate(BaseModel):
    user_name: str

class Transaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    from_address: str
    to_address: str
    amount: float
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    status: str = "completed"

class TransactionCreate(BaseModel):
    from_address: str
    to_address: str
    amount: float

class DashboardStats(BaseModel):
    total_tokens: float
    total_wallets: int
    total_transactions: int
    recent_transactions: List[Transaction]


# Helper function to generate unique wallet address
def generate_wallet_address(user_name: str) -> str:
    random_suffix = str(random.randint(100000, 999999))
    data = f"{user_name}{datetime.now(timezone.utc).isoformat()}{random_suffix}"
    hash_object = hashlib.sha256(data.encode())
    return f"0x{hash_object.hexdigest()[:40]}"


# Wallet Routes
@api_router.post("/wallets", response_model=Wallet)
async def create_wallet(input: WalletCreate):
    # Generate unique address
    address = generate_wallet_address(input.user_name)
    
    # Check if address already exists (very unlikely but safe)
    existing = await db.wallets.find_one({"address": address})
    if existing:
        address = generate_wallet_address(input.user_name + str(uuid.uuid4()))
    
    wallet_obj = Wallet(user_name=input.user_name, address=address)
    
    # Convert to dict and serialize datetime to ISO string for MongoDB
    doc = wallet_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.wallets.insert_one(doc)
    return wallet_obj

@api_router.get("/wallets", response_model=List[Wallet])
async def get_wallets():
    wallets = await db.wallets.find({}, {"_id": 0}).to_list(1000)
    
    # Convert ISO string timestamps back to datetime objects
    for wallet in wallets:
        if isinstance(wallet['created_at'], str):
            wallet['created_at'] = datetime.fromisoformat(wallet['created_at'])
    
    return wallets

@api_router.get("/wallets/{address}", response_model=Wallet)
async def get_wallet(address: str):
    wallet = await db.wallets.find_one({"address": address}, {"_id": 0})
    
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")
    
    if isinstance(wallet['created_at'], str):
        wallet['created_at'] = datetime.fromisoformat(wallet['created_at'])
    
    return wallet


# Transaction Routes
@api_router.post("/transactions", response_model=Transaction)
async def create_transaction(input: TransactionCreate):
    # Validate addresses
    from_wallet = await db.wallets.find_one({"address": input.from_address})
    to_wallet = await db.wallets.find_one({"address": input.to_address})
    
    if not from_wallet:
        raise HTTPException(status_code=404, detail="Sender wallet not found")
    if not to_wallet:
        raise HTTPException(status_code=404, detail="Recipient wallet not found")
    
    # Check balance
    if from_wallet['balance'] < input.amount:
        raise HTTPException(status_code=400, detail="Insufficient balance")
    
    if input.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    
    # Create transaction
    transaction_obj = Transaction(
        from_address=input.from_address,
        to_address=input.to_address,
        amount=input.amount
    )
    
    # Update balances
    await db.wallets.update_one(
        {"address": input.from_address},
        {"$inc": {"balance": -input.amount}}
    )
    await db.wallets.update_one(
        {"address": input.to_address},
        {"$inc": {"balance": input.amount}}
    )
    
    # Store transaction
    doc = transaction_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    await db.transactions.insert_one(doc)
    
    return transaction_obj

@api_router.get("/transactions", response_model=List[Transaction])
async def get_transactions():
    transactions = await db.transactions.find({}, {"_id": 0}).sort("timestamp", -1).to_list(1000)
    
    # Convert ISO string timestamps back to datetime objects
    for tx in transactions:
        if isinstance(tx['timestamp'], str):
            tx['timestamp'] = datetime.fromisoformat(tx['timestamp'])
    
    return transactions


# Dashboard Routes
@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats():
    # Get total wallets
    total_wallets = await db.wallets.count_documents({})
    
    # Get total tokens in circulation
    wallets = await db.wallets.find({}, {"_id": 0, "balance": 1}).to_list(1000)
    total_tokens = sum(w['balance'] for w in wallets)
    
    # Get total transactions
    total_transactions = await db.transactions.count_documents({})
    
    # Get recent transactions (last 5)
    recent_txs = await db.transactions.find({}, {"_id": 0}).sort("timestamp", -1).limit(5).to_list(5)
    
    # Convert timestamps
    for tx in recent_txs:
        if isinstance(tx['timestamp'], str):
            tx['timestamp'] = datetime.fromisoformat(tx['timestamp'])
    
    return DashboardStats(
        total_tokens=total_tokens,
        total_wallets=total_wallets,
        total_transactions=total_transactions,
        recent_transactions=recent_txs
    )


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()