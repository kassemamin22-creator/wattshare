from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient
from dotenv import load_dotenv
from typing import List
import os

from models import UserCreate, UserLogin, UserOut, SubscriptionCreate, SubscriptionOut, MeterReadingCreate, BillOut
from auth import hash_password, verify_password, create_access_token, get_current_user
from bson import ObjectId
from datetime import datetime

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("DB_NAME")

client = MongoClient(MONGO_URI)
db = client[DB_NAME]

users_collection = db["users"]
subscriptions_collection = db["subscriptions"]
meter_readings_collection = db["meter_readings"]
bills_collection = db["bills"]

GENERATOR_NAME = "Al-Kassir Diesel Generator"
TARIFF_RATE = 0.484

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "WattShare API is running"}

@app.get("/db-check")
def db_check():
    try:
        client.admin.command("ping")
        return {"status": "MongoDB connected successfully"}
    except Exception as e:
        return {"status": "MongoDB connection failed", "error": str(e)}

@app.post("/register", response_model=UserOut)
def register(user: UserCreate):
    if users_collection.find_one({"email": user.email}):
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_password = hash_password(user.password)

    result = users_collection.insert_one({
        "name": user.name,
        "email": user.email,
        "password": hashed_password,
        "role": user.role,
    })

    return UserOut(
        id=str(result.inserted_id),
        name=user.name,
        email=user.email,
        role=user.role,
    )

@app.post("/login")
def login(user: UserLogin):
    db_user = users_collection.find_one({"email": user.email})

    if not db_user or not verify_password(user.password, db_user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    access_token = create_access_token({
        "id": str(db_user["_id"]),
        "role": db_user["role"],
    })

    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/me")
def read_current_user(current_user: dict = Depends(get_current_user)):
    return current_user

@app.post("/subscription", response_model=SubscriptionOut)
def create_subscription(subscription: SubscriptionCreate, current_user: dict = Depends(get_current_user)):
    if subscriptions_collection.find_one({"subscriber_id": current_user["id"]}):
        raise HTTPException(status_code=400, detail="Subscription already exists")

    result = subscriptions_collection.insert_one({
        "subscriber_id": current_user["id"],
        "generator_name": GENERATOR_NAME,
        "ampere": subscription.ampere,
        "tariff_rate": TARIFF_RATE,
        "status": "active",
    })

    return SubscriptionOut(
        id=str(result.inserted_id),
        subscriber_id=current_user["id"],
        generator_name=GENERATOR_NAME,
        ampere=subscription.ampere,
        tariff_rate=TARIFF_RATE,
        status="active",
    )

@app.get("/subscription/me", response_model=SubscriptionOut)
def read_my_subscription(current_user: dict = Depends(get_current_user)):
    subscription = subscriptions_collection.find_one({"subscriber_id": current_user["id"]})

    if not subscription:
        raise HTTPException(status_code=404, detail="No subscription found")

    return SubscriptionOut(
        id=str(subscription["_id"]),
        subscriber_id=subscription["subscriber_id"],
        generator_name=subscription["generator_name"],
        ampere=subscription["ampere"],
        tariff_rate=subscription["tariff_rate"],
        status=subscription["status"],
    )

@app.post("/meter-reading", response_model=BillOut)
def create_meter_reading(reading: MeterReadingCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "owner":
        raise HTTPException(status_code=403, detail="Only the generator owner can submit meter readings")

    subscription = subscriptions_collection.find_one({"subscriber_id": reading.subscriber_id})
    if not subscription:
        raise HTTPException(status_code=404, detail="Subscriber has no active subscription")

    previous_reading = meter_readings_collection.find_one(
        {"subscriber_id": reading.subscriber_id},
        sort=[("reading_date", -1)],
    )
    previous_reading_value = previous_reading["reading_value"] if previous_reading else 0

    consumption_kwh = reading.reading_value - previous_reading_value
    if consumption_kwh < 0:
        raise HTTPException(status_code=400, detail="New reading cannot be lower than previous reading")

    amount = consumption_kwh * subscription["tariff_rate"]

    reading_result = meter_readings_collection.insert_one({
        "subscriber_id": reading.subscriber_id,
        "reading_value": reading.reading_value,
        "reading_date": datetime.utcnow(),
    })

    created_at = datetime.utcnow()
    bill_result = bills_collection.insert_one({
        "subscriber_id": reading.subscriber_id,
        "meter_reading_id": str(reading_result.inserted_id),
        "consumption_kwh": consumption_kwh,
        "amount": amount,
        "status": "pending",
        "created_at": created_at,
    })

    return BillOut(
        id=str(bill_result.inserted_id),
        subscriber_id=reading.subscriber_id,
        meter_reading_id=str(reading_result.inserted_id),
        consumption_kwh=consumption_kwh,
        amount=amount,
        status="pending",
        created_at=created_at,
    )

@app.get("/bills/me", response_model=List[BillOut])
def read_my_bills(current_user: dict = Depends(get_current_user)):
    bills = bills_collection.find({"subscriber_id": current_user["id"]}).sort("created_at", -1)

    return [
        BillOut(
            id=str(bill["_id"]),
            subscriber_id=bill["subscriber_id"],
            meter_reading_id=bill["meter_reading_id"],
            consumption_kwh=bill["consumption_kwh"],
            amount=bill["amount"],
            status=bill["status"],
            created_at=bill["created_at"],
        )
        for bill in bills
    ]
