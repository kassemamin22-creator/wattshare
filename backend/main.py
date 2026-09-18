from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient
from dotenv import load_dotenv
from typing import List
import os

from models import UserCreate, UserLogin, UserOut, UserRole, ManagerCreate, SubscriptionCreate, SubscriptionOut, MeterReadingCreate, BillOut, IssueCreate, IssueOut
from auth import hash_password, verify_password, create_access_token, get_current_user
from bson import ObjectId
from datetime import datetime
from sklearn.linear_model import LinearRegression
import numpy as np

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("DB_NAME")

client = MongoClient(MONGO_URI)
db = client[DB_NAME]

users_collection = db["users"]
subscriptions_collection = db["subscriptions"]
meter_readings_collection = db["meter_readings"]
bills_collection = db["bills"]
issues_collection = db["issues"]

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
    if user.role != UserRole.subscriber:
        raise HTTPException(status_code=403, detail="Only subscriber accounts can self-register")

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

@app.get("/subscribers", response_model=List[SubscriptionOut])
def read_subscribers(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "owner":
        raise HTTPException(status_code=403, detail="Only the generator owner can view subscribers")

    subscriptions = subscriptions_collection.find()

    return [
        SubscriptionOut(
            id=str(subscription["_id"]),
            subscriber_id=subscription["subscriber_id"],
            generator_name=subscription["generator_name"],
            ampere=subscription["ampere"],
            tariff_rate=subscription["tariff_rate"],
            status=subscription["status"],
        )
        for subscription in subscriptions
    ]

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

@app.get("/bills/predict")
def predict_next_bill(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "subscriber":
        raise HTTPException(status_code=403, detail="Only subscribers can view bill predictions")

    bills = list(
        bills_collection.find({"subscriber_id": current_user["id"]}).sort("created_at", 1)
    )

    if len(bills) < 2:
        return {
            "prediction": None,
            "message": "Not enough billing history yet to make a prediction",
        }

    try:
        X = np.array(range(len(bills))).reshape(-1, 1)
        y = np.array([bill["amount"] for bill in bills])

        model = LinearRegression()
        model.fit(X, y)

        next_index = np.array([[len(bills)]])
        predicted_value = model.predict(next_index)[0]

        if predicted_value < 0:
            predicted_value = 0

        return {
            "prediction": round(float(predicted_value), 2),
            "message": "Based on your billing history",
        }
    except Exception:
        return {
            "prediction": None,
            "message": "Unable to generate a prediction right now",
        }

@app.post("/issues", response_model=IssueOut)
def create_issue(issue: IssueCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "subscriber":
        raise HTTPException(status_code=403, detail="Only subscribers can report issues")

    created_at = datetime.utcnow()
    result = issues_collection.insert_one({
        "subscriber_id": current_user["id"],
        "description": issue.description,
        "status": "open",
        "created_at": created_at,
    })

    return IssueOut(
        id=str(result.inserted_id),
        subscriber_id=current_user["id"],
        description=issue.description,
        status="open",
        created_at=created_at,
    )

@app.get("/issues", response_model=List[IssueOut])
def read_issues(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "owner":
        raise HTTPException(status_code=403, detail="Only the generator owner can view issues")

    issues = issues_collection.find().sort("created_at", -1)

    return [
        IssueOut(
            id=str(issue["_id"]),
            subscriber_id=issue["subscriber_id"],
            description=issue["description"],
            status=issue["status"],
            created_at=issue["created_at"],
        )
        for issue in issues
    ]

@app.patch("/issues/{issue_id}", response_model=IssueOut)
def update_issue(issue_id: str, status: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "owner":
        raise HTTPException(status_code=403, detail="Only the generator owner can update issues")

    issue = issues_collection.find_one({"_id": ObjectId(issue_id)})
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    issues_collection.update_one({"_id": ObjectId(issue_id)}, {"$set": {"status": status}})

    return IssueOut(
        id=str(issue["_id"]),
        subscriber_id=issue["subscriber_id"],
        description=issue["description"],
        status=status,
        created_at=issue["created_at"],
    )

@app.get("/admin/users", response_model=List[UserOut])
def read_all_users(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admin can access this")

    users = users_collection.find()

    return [
        UserOut(
            id=str(user["_id"]),
            name=user["name"],
            email=user["email"],
            role=user["role"],
        )
        for user in users
    ]

@app.get("/admin/subscriptions", response_model=List[SubscriptionOut])
def read_all_subscriptions(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admin can access this")

    subscriptions = subscriptions_collection.find()

    return [
        SubscriptionOut(
            id=str(subscription["_id"]),
            subscriber_id=subscription["subscriber_id"],
            generator_name=subscription["generator_name"],
            ampere=subscription["ampere"],
            tariff_rate=subscription["tariff_rate"],
            status=subscription["status"],
        )
        for subscription in subscriptions
    ]

@app.post("/admin/add-manager", response_model=UserOut)
def add_manager(manager: ManagerCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admin can add managers")

    if users_collection.find_one({"email": manager.email}):
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_password = hash_password(manager.password)

    result = users_collection.insert_one({
        "name": manager.name,
        "email": manager.email,
        "password": hashed_password,
        "role": UserRole.owner,
    })

    return UserOut(
        id=str(result.inserted_id),
        name=manager.name,
        email=manager.email,
        role=UserRole.owner,
    )

@app.get("/admin/bills", response_model=List[BillOut])
def read_all_bills(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admin can access this")

    bills = bills_collection.find()

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
