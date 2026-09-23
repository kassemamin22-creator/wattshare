from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient, ReturnDocument
from pymongo.errors import DuplicateKeyError
from dotenv import load_dotenv
from typing import List
import os

from models import UserCreate, UserLogin, UserOut, UserUpdate, PasswordChange, AdminUserUpdate, AdminPasswordReset, UserRole, ManagerCreate, SubscriberCreate, SubscriptionCreate, SubscriptionOut, SubscriptionUpdate, SubscriptionApprove, AmpereChangeRequest, MeterReadingCreate, BillOut, RevenueOut, IssueCreate, IssueOut, TariffUpdate, TariffOut
from auth import hash_password, verify_password, create_access_token, get_current_user
from bson import ObjectId
from datetime import datetime, timedelta
from sklearn.linear_model import LinearRegression
import numpy as np

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("DB_NAME")

client = MongoClient(MONGO_URI)
db = client[DB_NAME]

users_collection = db["users"]
users_collection.create_index("email", unique=True)
subscriptions_collection = db["subscriptions"]
meter_readings_collection = db["meter_readings"]
bills_collection = db["bills"]
issues_collection = db["issues"]
settings_collection = db["settings"]

GENERATOR_NAME = "AK Power"
TARIFF_RATE = 0.484
DEFAULT_PRICE_PER_AMPERE = 50.0

def get_current_price_per_ampere() -> float:
    settings = settings_collection.find_one_and_update(
        {"_id": "pricing"},
        {"$setOnInsert": {"price_per_ampere": DEFAULT_PRICE_PER_AMPERE}},
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    return settings["price_per_ampere"]

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:8000",
        "http://127.0.0.1:5173",
        "https://wattshare-ivory.vercel.app",
    ],
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

    normalized_email = user.email.lower().strip()

    if users_collection.find_one({"email": normalized_email}):
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_password = hash_password(user.password)

    result = users_collection.insert_one({
        "name": user.name,
        "email": normalized_email,
        "password": hashed_password,
        "role": user.role,
    })

    return UserOut(
        id=str(result.inserted_id),
        name=user.name,
        email=normalized_email,
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

@app.get("/users/me", response_model=UserOut)
def read_my_account(current_user: dict = Depends(get_current_user)):
    user = users_collection.find_one({"_id": ObjectId(current_user["id"])})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return UserOut(
        id=str(user["_id"]),
        name=user["name"],
        email=user["email"],
        role=user["role"],
    )

@app.patch("/users/me", response_model=UserOut)
def update_my_account(update: UserUpdate, current_user: dict = Depends(get_current_user)):
    existing = users_collection.find_one({
        "email": update.email,
        "_id": {"$ne": ObjectId(current_user["id"])},
    })
    if existing:
        raise HTTPException(status_code=400, detail="Email already in use")

    users_collection.update_one(
        {"_id": ObjectId(current_user["id"])},
        {"$set": {"name": update.name, "email": update.email}},
    )

    user = users_collection.find_one({"_id": ObjectId(current_user["id"])})

    return UserOut(
        id=str(user["_id"]),
        name=user["name"],
        email=user["email"],
        role=user["role"],
    )

@app.patch("/users/me/password")
def change_my_password(change: PasswordChange, current_user: dict = Depends(get_current_user)):
    user = users_collection.find_one({"_id": ObjectId(current_user["id"])})

    if not user or not verify_password(change.current_password, user["password"]):
        raise HTTPException(status_code=401, detail="Current password is incorrect")

    hashed_password = hash_password(change.new_password)
    users_collection.update_one(
        {"_id": ObjectId(current_user["id"])},
        {"$set": {"password": hashed_password}},
    )

    return {"message": "Password updated successfully"}

@app.get("/tariff", response_model=TariffOut)
def read_tariff():
    price_per_ampere = get_current_price_per_ampere()
    return TariffOut(price_per_ampere=price_per_ampere)

@app.post("/subscription", response_model=SubscriptionOut)
def create_subscription(subscription: SubscriptionCreate, current_user: dict = Depends(get_current_user)):
    if subscriptions_collection.find_one({"subscriber_id": current_user["id"]}):
        raise HTTPException(status_code=400, detail="Subscription already exists")

    price_per_ampere = get_current_price_per_ampere()
    flat_fee = subscription.ampere * price_per_ampere
    start_date = datetime.utcnow()

    result = subscriptions_collection.insert_one({
        "subscriber_id": current_user["id"],
        "generator_name": GENERATOR_NAME,
        "ampere": subscription.ampere,
        "tariff_rate": TARIFF_RATE,
        "flat_fee": flat_fee,
        "address": subscription.address,
        "building": subscription.building,
        "phone": subscription.phone,
        "start_date": start_date,
        "status": "pending",
    })

    return SubscriptionOut(
        id=str(result.inserted_id),
        subscriber_id=current_user["id"],
        generator_name=GENERATOR_NAME,
        ampere=subscription.ampere,
        tariff_rate=TARIFF_RATE,
        flat_fee=flat_fee,
        address=subscription.address,
        building=subscription.building,
        phone=subscription.phone,
        start_date=start_date,
        status="pending",
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
        flat_fee=subscription.get("flat_fee", 0.0),
        address=subscription.get("address", ""),
        building=subscription.get("building", ""),
        phone=subscription.get("phone", ""),
        payment_method=subscription.get("payment_method"),
        start_date=subscription.get("start_date", datetime.utcnow()),
        pending_ampere_change=subscription.get("pending_ampere_change"),
    )

@app.post("/subscription/me/request-ampere-change")
def request_ampere_change(request: AmpereChangeRequest, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "subscriber":
        raise HTTPException(status_code=403, detail="Only subscribers can request an ampere change")

    subscription = subscriptions_collection.find_one({"subscriber_id": current_user["id"]})
    if not subscription:
        raise HTTPException(status_code=404, detail="No subscription found")

    subscriptions_collection.update_one(
        {"subscriber_id": current_user["id"]},
        {"$set": {"pending_ampere_change": request.ampere}},
    )

    return {"message": "Ampere change requested", "pending_ampere_change": request.ampere}

@app.patch("/subscription/me", response_model=SubscriptionOut)
def update_my_subscription(update: SubscriptionUpdate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "subscriber":
        raise HTTPException(status_code=403, detail="Only subscribers can update their subscription details")

    subscription = subscriptions_collection.find_one({"subscriber_id": current_user["id"]})
    if not subscription:
        raise HTTPException(status_code=404, detail="No subscription found")

    subscriptions_collection.update_one(
        {"subscriber_id": current_user["id"]},
        {"$set": {
            "address": update.address,
            "building": update.building,
            "phone": update.phone,
        }},
    )

    return SubscriptionOut(
        id=str(subscription["_id"]),
        subscriber_id=subscription["subscriber_id"],
        generator_name=subscription["generator_name"],
        ampere=subscription["ampere"],
        tariff_rate=subscription["tariff_rate"],
        status=subscription["status"],
        flat_fee=subscription.get("flat_fee", 0.0),
        address=update.address,
        building=update.building,
        phone=update.phone,
        payment_method=subscription.get("payment_method"),
        start_date=subscription.get("start_date", datetime.utcnow()),
    )

@app.get("/subscribers", response_model=List[SubscriptionOut])
def read_subscribers(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "owner":
        raise HTTPException(status_code=403, detail="Only the generator owner can view subscribers")

    subscriptions = subscriptions_collection.find()

    result = []
    for subscription in subscriptions:
        subscriber = users_collection.find_one({"_id": ObjectId(subscription["subscriber_id"])})
        subscriber_name = subscriber["name"] if subscriber else "Unknown Subscriber"

        last_reading = meter_readings_collection.find_one(
            {"subscriber_id": subscription["subscriber_id"]},
            sort=[("reading_date", -1)],
        )
        last_reading_value = last_reading["reading_value"] if last_reading else None

        result.append(
            SubscriptionOut(
                id=str(subscription["_id"]),
                subscriber_id=subscription["subscriber_id"],
                generator_name=subscription["generator_name"],
                ampere=subscription["ampere"],
                tariff_rate=subscription["tariff_rate"],
                status=subscription["status"],
                flat_fee=subscription.get("flat_fee", 0.0),
                address=subscription.get("address", ""),
                building=subscription.get("building", ""),
                phone=subscription.get("phone", ""),
                payment_method=subscription.get("payment_method"),
                start_date=subscription.get("start_date", datetime.utcnow()),
                subscriber_name=subscriber_name,
                last_reading=last_reading_value,
                pending_ampere_change=subscription.get("pending_ampere_change"),
            )
        )

    return result

@app.post("/meter-reading", response_model=BillOut)
def create_meter_reading(reading: MeterReadingCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "owner":
        raise HTTPException(status_code=403, detail="Only the generator owner can submit meter readings")

    subscription = subscriptions_collection.find_one({"subscriber_id": reading.subscriber_id})
    if not subscription:
        raise HTTPException(status_code=404, detail="Subscriber has no active subscription")

    if subscription["status"] != "active":
        raise HTTPException(status_code=400, detail="Cannot submit reading: subscriber's subscription is inactive")

    previous_reading = meter_readings_collection.find_one(
        {"subscriber_id": reading.subscriber_id},
        sort=[("reading_date", -1)],
    )
    previous_reading_value = previous_reading["reading_value"] if previous_reading else 0

    consumption_kwh = reading.reading_value - previous_reading_value
    if consumption_kwh < 0:
        raise HTTPException(status_code=400, detail="New reading cannot be lower than previous reading")

    amount = (consumption_kwh * subscription["tariff_rate"]) + subscription.get("flat_fee", 0.0)

    reading_result = meter_readings_collection.insert_one({
        "subscriber_id": reading.subscriber_id,
        "reading_value": reading.reading_value,
        "reading_date": datetime.utcnow(),
    })

    created_at = datetime.utcnow()
    due_date = created_at + timedelta(days=15)
    bill_result = bills_collection.insert_one({
        "subscriber_id": reading.subscriber_id,
        "meter_reading_id": str(reading_result.inserted_id),
        "consumption_kwh": consumption_kwh,
        "amount": amount,
        "status": "pending",
        "created_at": created_at,
        "due_date": due_date,
    })

    return BillOut(
        id=str(bill_result.inserted_id),
        subscriber_id=reading.subscriber_id,
        meter_reading_id=str(reading_result.inserted_id),
        consumption_kwh=consumption_kwh,
        amount=amount,
        status="pending",
        created_at=created_at,
        due_date=due_date,
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
            due_date=bill.get("due_date", datetime.utcnow()),
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

    subscription = subscriptions_collection.find_one({"subscriber_id": current_user["id"]})
    if not subscription:
        raise HTTPException(status_code=404, detail="Subscriber has no active subscription")

    if subscription["status"] != "active":
        raise HTTPException(status_code=400, detail="Cannot report issue: subscriber's subscription is inactive")

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

    result = []
    for issue in issues:
        subscriber = users_collection.find_one({"_id": ObjectId(issue["subscriber_id"])})
        subscriber_name = subscriber["name"] if subscriber else "Unknown Subscriber"

        result.append(
            IssueOut(
                id=str(issue["_id"]),
                subscriber_id=issue["subscriber_id"],
                description=issue["description"],
                status=issue["status"],
                created_at=issue["created_at"],
                subscriber_name=subscriber_name,
            )
        )

    return result

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

    result = []
    for user in users:
        subscription_status = None
        if user["role"] == "subscriber":
            subscription = subscriptions_collection.find_one({"subscriber_id": str(user["_id"])})
            subscription_status = subscription["status"] if subscription else "none"

        result.append(
            UserOut(
                id=str(user["_id"]),
                name=user["name"],
                email=user["email"],
                role=user["role"],
                subscription_status=subscription_status,
            )
        )

    return result

@app.patch("/admin/users/{user_id}", response_model=UserOut)
def admin_update_user(user_id: str, update: AdminUserUpdate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admin can update users")

    if user_id == current_user["id"] and update.role != "admin":
        raise HTTPException(status_code=400, detail="Cannot change your own admin role")

    user = users_collection.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    normalized_email = update.email.lower().strip()

    existing = users_collection.find_one({
        "email": normalized_email,
        "_id": {"$ne": ObjectId(user_id)},
    })
    if existing:
        raise HTTPException(status_code=400, detail="Email already in use")

    try:
        users_collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"name": update.name, "email": normalized_email, "role": update.role}},
        )
    except DuplicateKeyError:
        raise HTTPException(status_code=400, detail="Email already registered")

    return UserOut(
        id=user_id,
        name=update.name,
        email=normalized_email,
        role=update.role,
    )

@app.patch("/admin/users/{user_id}/reset-password")
def admin_reset_password(user_id: str, reset: AdminPasswordReset, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admin can reset passwords")

    user = users_collection.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    hashed_password = hash_password(reset.new_password)
    users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"password": hashed_password}},
    )

    return {"message": "Password reset successfully"}

@app.delete("/admin/users/{user_id}")
def delete_user(user_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admin can delete users")

    if user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")

    user = users_collection.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    users_collection.delete_one({"_id": ObjectId(user_id)})
    subscriptions_collection.delete_many({"subscriber_id": user_id})
    bills_collection.delete_many({"subscriber_id": user_id})
    meter_readings_collection.delete_many({"subscriber_id": user_id})
    issues_collection.delete_many({"subscriber_id": user_id})

    return {"message": "User and related data deleted successfully"}

@app.get("/admin/subscriptions", response_model=List[SubscriptionOut])
def read_all_subscriptions(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admin can access this")

    subscriptions = subscriptions_collection.find()

    result = []
    for subscription in subscriptions:
        subscriber = users_collection.find_one({"_id": ObjectId(subscription["subscriber_id"])})
        subscriber_name = subscriber["name"] if subscriber else "Unknown Subscriber"

        result.append(
            SubscriptionOut(
                id=str(subscription["_id"]),
                subscriber_id=subscription["subscriber_id"],
                generator_name=subscription["generator_name"],
                ampere=subscription["ampere"],
                tariff_rate=subscription["tariff_rate"],
                status=subscription["status"],
                flat_fee=subscription.get("flat_fee", 0.0),
                address=subscription.get("address", ""),
                building=subscription.get("building", ""),
                phone=subscription.get("phone", ""),
                payment_method=subscription.get("payment_method"),
                start_date=subscription.get("start_date", datetime.utcnow()),
                subscriber_name=subscriber_name,
                pending_ampere_change=subscription.get("pending_ampere_change"),
            )
        )

    return result

@app.patch("/admin/subscriptions/{subscription_id}/toggle-status", response_model=SubscriptionOut)
def toggle_subscription_status(subscription_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admin can change subscription status")

    subscription = subscriptions_collection.find_one({"_id": ObjectId(subscription_id)})
    if not subscription:
        raise HTTPException(status_code=404, detail="Subscription not found")

    new_status = "inactive" if subscription["status"] == "active" else "active"
    subscriptions_collection.update_one(
        {"_id": ObjectId(subscription_id)},
        {"$set": {"status": new_status}},
    )

    subscriber = users_collection.find_one({"_id": ObjectId(subscription["subscriber_id"])})
    subscriber_name = subscriber["name"] if subscriber else "Unknown Subscriber"

    return SubscriptionOut(
        id=str(subscription["_id"]),
        subscriber_id=subscription["subscriber_id"],
        generator_name=subscription["generator_name"],
        ampere=subscription["ampere"],
        tariff_rate=subscription["tariff_rate"],
        status=new_status,
        flat_fee=subscription.get("flat_fee", 0.0),
        address=subscription.get("address", ""),
        building=subscription.get("building", ""),
        phone=subscription.get("phone", ""),
        payment_method=subscription.get("payment_method"),
        start_date=subscription.get("start_date", datetime.utcnow()),
        subscriber_name=subscriber_name,
        pending_ampere_change=subscription.get("pending_ampere_change"),
    )

@app.patch("/admin/subscriptions/{subscription_id}", response_model=SubscriptionOut)
def update_subscription_by_admin(subscription_id: str, update: SubscriptionUpdate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ("admin", "owner"):
        raise HTTPException(status_code=403, detail="Only admin or manager can access this")

    subscription = subscriptions_collection.find_one({"_id": ObjectId(subscription_id)})
    if not subscription:
        raise HTTPException(status_code=404, detail="Subscription not found")

    new_ampere = update.ampere if update.ampere is not None else subscription["ampere"]
    price_per_ampere = get_current_price_per_ampere()
    flat_fee = new_ampere * price_per_ampere

    subscriptions_collection.update_one(
        {"_id": ObjectId(subscription_id)},
        {"$set": {
            "address": update.address,
            "building": update.building,
            "phone": update.phone,
            "ampere": new_ampere,
            "flat_fee": flat_fee,
        }},
    )

    subscriber = users_collection.find_one({"_id": ObjectId(subscription["subscriber_id"])})
    subscriber_name = subscriber["name"] if subscriber else "Unknown Subscriber"

    return SubscriptionOut(
        id=str(subscription["_id"]),
        subscriber_id=subscription["subscriber_id"],
        generator_name=subscription["generator_name"],
        ampere=new_ampere,
        tariff_rate=subscription["tariff_rate"],
        status=subscription["status"],
        flat_fee=flat_fee,
        address=update.address,
        building=update.building,
        phone=update.phone,
        payment_method=subscription.get("payment_method"),
        start_date=subscription.get("start_date", datetime.utcnow()),
        subscriber_name=subscriber_name,
        pending_ampere_change=subscription.get("pending_ampere_change"),
    )

@app.patch("/admin/subscriptions/{subscription_id}/approve-ampere-change")
def approve_ampere_change(subscription_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ("admin", "owner"):
        raise HTTPException(status_code=403, detail="Only admin or manager can access this")

    subscription = subscriptions_collection.find_one({"_id": ObjectId(subscription_id)})
    if not subscription:
        raise HTTPException(status_code=404, detail="Subscription not found")

    pending_ampere_change = subscription.get("pending_ampere_change")
    if pending_ampere_change is None:
        raise HTTPException(status_code=400, detail="No pending ampere change for this subscription")

    price_per_ampere = get_current_price_per_ampere()
    flat_fee = pending_ampere_change * price_per_ampere

    subscriptions_collection.update_one(
        {"_id": ObjectId(subscription_id)},
        {"$set": {
            "ampere": pending_ampere_change,
            "flat_fee": flat_fee,
            "pending_ampere_change": None,
        }},
    )

    return {"message": "Ampere change approved", "ampere": pending_ampere_change, "flat_fee": flat_fee}

@app.get("/owner/subscriptions/pending", response_model=List[SubscriptionOut])
def read_pending_subscriptions(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "owner":
        raise HTTPException(status_code=403, detail="Only managers can access this")

    subscriptions = subscriptions_collection.find({"status": "pending"})

    result = []
    for subscription in subscriptions:
        subscriber = users_collection.find_one({"_id": ObjectId(subscription["subscriber_id"])})
        subscriber_name = subscriber["name"] if subscriber else "Unknown Subscriber"

        result.append(
            SubscriptionOut(
                id=str(subscription["_id"]),
                subscriber_id=subscription["subscriber_id"],
                generator_name=subscription["generator_name"],
                ampere=subscription["ampere"],
                tariff_rate=subscription["tariff_rate"],
                status=subscription["status"],
                flat_fee=subscription.get("flat_fee", 0.0),
                address=subscription.get("address", ""),
                building=subscription.get("building", ""),
                phone=subscription.get("phone", ""),
                payment_method=subscription.get("payment_method"),
                start_date=subscription.get("start_date", datetime.utcnow()),
                subscriber_name=subscriber_name,
                pending_ampere_change=subscription.get("pending_ampere_change"),
            )
        )

    return result

@app.patch("/owner/subscriptions/{subscription_id}/approve", response_model=SubscriptionOut)
def approve_subscription(subscription_id: str, approval: SubscriptionApprove, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "owner":
        raise HTTPException(status_code=403, detail="Only managers can access this")

    subscription = subscriptions_collection.find_one({"_id": ObjectId(subscription_id)})
    if not subscription:
        raise HTTPException(status_code=404, detail="Subscription not found")

    subscriptions_collection.update_one(
        {"_id": ObjectId(subscription_id)},
        {"$set": {"status": "active", "payment_method": approval.payment_method}},
    )

    subscriber = users_collection.find_one({"_id": ObjectId(subscription["subscriber_id"])})
    subscriber_name = subscriber["name"] if subscriber else "Unknown Subscriber"

    return SubscriptionOut(
        id=str(subscription["_id"]),
        subscriber_id=subscription["subscriber_id"],
        generator_name=subscription["generator_name"],
        ampere=subscription["ampere"],
        tariff_rate=subscription["tariff_rate"],
        status="active",
        flat_fee=subscription.get("flat_fee", 0.0),
        address=subscription.get("address", ""),
        building=subscription.get("building", ""),
        phone=subscription.get("phone", ""),
        payment_method=approval.payment_method,
        start_date=subscription.get("start_date", datetime.utcnow()),
        subscriber_name=subscriber_name,
        pending_ampere_change=subscription.get("pending_ampere_change"),
    )

@app.put("/admin/tariff", response_model=TariffOut)
def update_tariff(tariff: TariffUpdate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admin can update pricing")

    settings_collection.find_one_and_update(
        {"_id": "pricing"},
        {"$set": {"price_per_ampere": tariff.price_per_ampere}},
        upsert=True,
    )

    return TariffOut(price_per_ampere=tariff.price_per_ampere)

@app.post("/admin/add-manager", response_model=UserOut)
def add_manager(manager: ManagerCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admin can add managers")

    normalized_email = manager.email.lower().strip()

    if users_collection.find_one({"email": normalized_email}):
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_password = hash_password(manager.password)

    result = users_collection.insert_one({
        "name": manager.name,
        "email": normalized_email,
        "password": hashed_password,
        "role": UserRole.owner,
    })

    return UserOut(
        id=str(result.inserted_id),
        name=manager.name,
        email=normalized_email,
        role=UserRole.owner,
    )

@app.post("/admin/add-subscriber", response_model=UserOut)
def add_subscriber(subscriber: SubscriberCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ("admin", "owner"):
        raise HTTPException(status_code=403, detail="Only admin or manager can access this")

    normalized_email = subscriber.email.lower().strip()

    if users_collection.find_one({"email": normalized_email}):
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_password = hash_password(subscriber.password)

    result = users_collection.insert_one({
        "name": subscriber.name,
        "email": normalized_email,
        "password": hashed_password,
        "role": UserRole.subscriber,
    })

    subscriber_id = str(result.inserted_id)
    price_per_ampere = get_current_price_per_ampere()
    flat_fee = subscriber.ampere * price_per_ampere

    subscriptions_collection.insert_one({
        "subscriber_id": subscriber_id,
        "generator_name": GENERATOR_NAME,
        "ampere": subscriber.ampere,
        "tariff_rate": TARIFF_RATE,
        "flat_fee": flat_fee,
        "address": subscriber.address,
        "building": subscriber.building,
        "phone": subscriber.phone,
        "payment_method": subscriber.payment_method,
        "start_date": datetime.utcnow(),
        "status": "active",
    })

    return UserOut(
        id=subscriber_id,
        name=subscriber.name,
        email=normalized_email,
        role=UserRole.subscriber,
        subscription_status="active",
    )

@app.get("/admin/bills", response_model=List[BillOut])
def read_all_bills(current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ("admin", "owner"):
        raise HTTPException(status_code=403, detail="Only manager or admin can view all bills")

    bills = bills_collection.find()

    result = []
    for bill in bills:
        subscriber = users_collection.find_one({"_id": ObjectId(bill["subscriber_id"])})
        subscriber_name = subscriber["name"] if subscriber else "Unknown Subscriber"

        result.append(
            BillOut(
                id=str(bill["_id"]),
                subscriber_id=bill["subscriber_id"],
                meter_reading_id=bill["meter_reading_id"],
                consumption_kwh=bill["consumption_kwh"],
                amount=bill["amount"],
                status=bill["status"],
                created_at=bill["created_at"],
                due_date=bill.get("due_date", datetime.utcnow()),
                subscriber_name=subscriber_name,
            )
        )

    return result

@app.get("/admin/revenue", response_model=RevenueOut)
def read_revenue(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admin can access this")

    total_collected = 0.0
    total_outstanding = 0.0
    paid_count = 0
    outstanding_count = 0

    for bill in bills_collection.find():
        if bill["status"] == "paid":
            total_collected += bill["amount"]
            paid_count += 1
        elif bill["status"] in ("pending", "disputed"):
            total_outstanding += bill["amount"]
            outstanding_count += 1

    return RevenueOut(
        total_collected=total_collected,
        total_outstanding=total_outstanding,
        paid_count=paid_count,
        outstanding_count=outstanding_count,
    )

@app.patch("/bills/{bill_id}/mark-paid", response_model=BillOut)
def mark_bill_paid(bill_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ("owner", "admin"):
        raise HTTPException(status_code=403, detail="Only manager or admin can mark bills as paid")

    bill = bills_collection.find_one({"_id": ObjectId(bill_id)})
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")

    bills_collection.update_one({"_id": ObjectId(bill_id)}, {"$set": {"status": "paid"}})

    return BillOut(
        id=str(bill["_id"]),
        subscriber_id=bill["subscriber_id"],
        meter_reading_id=bill["meter_reading_id"],
        consumption_kwh=bill["consumption_kwh"],
        amount=bill["amount"],
        status="paid",
        created_at=bill["created_at"],
        due_date=bill.get("due_date", datetime.utcnow()),
    )
