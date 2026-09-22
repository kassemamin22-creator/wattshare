from pydantic import BaseModel, EmailStr
from typing import Optional
from enum import Enum
from datetime import datetime

class UserRole(str, Enum):
    subscriber = "subscriber"
    owner = "owner"
    admin = "admin"

class PaymentMethod(str, Enum):
    cash = "cash"
    whish = "whish"
    omt = "omt"

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: UserRole

class ManagerCreate(BaseModel):
    name: str
    email: EmailStr
    password: str

class SubscriberCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    address: str
    building: str
    phone: str
    unit_number: str
    ampere: int
    payment_method: PaymentMethod

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: str
    name: str
    email: str
    role: UserRole
    subscription_status: Optional[str] = None

class UserUpdate(BaseModel):
    name: str
    email: EmailStr

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

class AdminUserUpdate(BaseModel):
    name: str
    email: EmailStr
    role: UserRole

class AdminPasswordReset(BaseModel):
    new_password: str

class SubscriptionCreate(BaseModel):
    ampere: int
    address: str
    building: str
    phone: str
    unit_number: str
    payment_method: PaymentMethod

class SubscriptionOut(BaseModel):
    id: str
    subscriber_id: str
    generator_name: str
    ampere: int
    tariff_rate: float
    status: str
    flat_fee: float
    address: str
    building: str
    phone: str
    unit_number: str
    payment_method: PaymentMethod
    start_date: datetime
    subscriber_name: Optional[str] = None
    last_reading: Optional[float] = None

class SubscriptionUpdate(BaseModel):
    address: str
    building: str
    phone: str
    unit_number: str

class TariffUpdate(BaseModel):
    price_per_ampere: float

class TariffOut(BaseModel):
    price_per_ampere: float

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
    due_date: datetime
    subscriber_name: Optional[str] = None

class RevenueOut(BaseModel):
    total_collected: float
    total_outstanding: float
    paid_count: int
    outstanding_count: int

class IssueCreate(BaseModel):
    description: str

class IssueOut(BaseModel):
    id: str
    subscriber_id: str
    description: str
    status: str
    created_at: datetime
    subscriber_name: Optional[str] = None
