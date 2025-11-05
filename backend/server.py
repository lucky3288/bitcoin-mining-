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
from blockchain_contract import CONTRACT_ABI, CONTRACT_BYTECODE


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
class TokenDeployment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    contract_address: str
    token_name: str
    token_symbol: str
    initial_supply: str
    max_supply: str
    deployer_address: str
    network: str = "mainnet"
    chain_id: int
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TokenDeploymentCreate(BaseModel):
    contract_address: str
    token_name: str
    token_symbol: str
    initial_supply: str
    max_supply: str
    deployer_address: str
    network: str = "mainnet"
    chain_id: int

class TokenTransaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tx_hash: str
    from_address: str
    to_address: Optional[str] = None
    amount: str
    tx_type: str  # mint, transfer, burn
    contract_address: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    status: str = "completed"

class TokenTransactionCreate(BaseModel):
    tx_hash: str
    from_address: str
    to_address: Optional[str] = None
    amount: str
    tx_type: str
    contract_address: str


# Contract ABI and Bytecode endpoints
@api_router.get("/contract/abi")
async def get_contract_abi():
    return {"abi": CONTRACT_ABI}

@api_router.get("/contract/bytecode")
async def get_contract_bytecode():
    return {"bytecode": CONTRACT_BYTECODE}


# Token Deployment Routes
@api_router.post("/deployments", response_model=TokenDeployment)
async def save_deployment(input: TokenDeploymentCreate):
    deployment_obj = TokenDeployment(
        contract_address=input.contract_address,
        token_name=input.token_name,
        token_symbol=input.token_symbol,
        initial_supply=input.initial_supply,
        max_supply=input.max_supply,
        deployer_address=input.deployer_address,
        network=input.network,
        chain_id=input.chain_id
    )
    
    doc = deployment_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.deployments.insert_one(doc)
    return deployment_obj

@api_router.get("/deployments", response_model=List[TokenDeployment])
async def get_deployments():
    deployments = await db.deployments.find({}, {"_id": 0}).to_list(100)
    
    for deployment in deployments:
        if isinstance(deployment['created_at'], str):
            deployment['created_at'] = datetime.fromisoformat(deployment['created_at'])
    
    return deployments

@api_router.get("/deployments/latest", response_model=TokenDeployment)
async def get_latest_deployment():
    deployment = await db.deployments.find_one({}, {"_id": 0}, sort=[("created_at", -1)])
    
    if not deployment:
        raise HTTPException(status_code=404, detail="No deployments found")
    
    if isinstance(deployment['created_at'], str):
        deployment['created_at'] = datetime.fromisoformat(deployment['created_at'])
    
    return deployment


# Transaction Routes
@api_router.post("/transactions", response_model=TokenTransaction)
async def save_transaction(input: TokenTransactionCreate):
    transaction_obj = TokenTransaction(
        tx_hash=input.tx_hash,
        from_address=input.from_address,
        to_address=input.to_address,
        amount=input.amount,
        tx_type=input.tx_type,
        contract_address=input.contract_address
    )
    
    doc = transaction_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    
    await db.transactions.insert_one(doc)
    return transaction_obj

@api_router.get("/transactions", response_model=List[TokenTransaction])
async def get_transactions():
    transactions = await db.transactions.find({}, {"_id": 0}).sort("timestamp", -1).to_list(1000)
    
    for tx in transactions:
        if isinstance(tx['timestamp'], str):
            tx['timestamp'] = datetime.fromisoformat(tx['timestamp'])
    
    return transactions


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
