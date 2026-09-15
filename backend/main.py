from fastapi import FastAPI, HTTPException, Depends
from pymongo import MongoClient
from dotenv import load_dotenv
import os

from models import UserCreate, UserLogin, UserOut
from auth import hash_password, verify_password, create_access_token, get_current_user
from bson import ObjectId

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("DB_NAME")

client = MongoClient(MONGO_URI)
db = client[DB_NAME]

users_collection = db["users"]

app = FastAPI()

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
