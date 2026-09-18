from pydantic import BaseModel, EmailStr
from typing import Optional
from enum import Enum
from datetime import datetime

class UserRole(str, Enum):
    subscriber = "subscriber"
    owner = "owner"
    admin = "admin"

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: UserRole

class ManagerCreate(BaseModel):
    name: str
    email: EmailStr
    password: str

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
    subscriber_name: Optional[str] = None

class MeterReadingCreate(BaseModel):
    subscriber_id: str
    reading_value: float

class MeterReadingOut(BaseModel):
    id: str
    subscriber_id: str
    reading_value: float
    reading_date: datetime

class BillOut(BaseModel):
    id: str
    subscriber_id: str
    meter_reading_id: str
    consumption_kwh: float
    amount: float
    status: str
    created_at: datetime
    subscriber_name: Optional[str] = None

class IssueCreate(BaseModel):
    description: str

class IssueOut(BaseModel):
    id: str
    subscriber_id: str
    description: str
    status: str
    created_at: datetime
    subscriber_name: Optional[str] = None
