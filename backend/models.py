from pydantic import BaseModel, EmailStr
from typing import Optional
from enum import Enum

class UserRole(str, Enum):
    subscriber = "subscriber"
    owner = "owner"
    admin = "admin"

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: UserRole

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: str
    name: str
    email: str
    role: UserRole

class SubscriptionCreate(BaseModel):
    ampere: int

class SubscriptionOut(BaseModel):
    id: str
    subscriber_id: str
    generator_name: str
    ampere: int
    tariff_rate: float
    status: str
