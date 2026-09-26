# All Pydantic models for the API: what clients may send (validation) and what endpoints return.
from pydantic import BaseModel, EmailStr, field_validator, model_validator
from typing import List, Literal, Optional
from enum import Enum
from datetime import datetime
import re

class UserRole(str, Enum):
    subscriber = "subscriber"
    owner = "owner"
    admin = "admin"

class PaymentMethod(str, Enum):
    cash = "cash"
    whish = "whish"
    omt = "omt"

class EmailOrPhoneFields(BaseModel):
    email: Optional[EmailStr] = None
    phone: Optional[str] = None

    @field_validator("email", "phone", mode="before")
    @classmethod
    def blank_to_none(cls, value):
        if isinstance(value, str) and not value.strip():
            return None
        return value

    @field_validator("phone")
    @classmethod
    def validate_lebanese_phone(cls, value):
        if value is None:
            return value
        stripped = value.strip()
        if not re.fullmatch(r"\+961[0-9]{8}", stripped):
            raise ValueError(
                "Phone number must be in the format +961XXXXXXXX (Lebanese number, 8 digits after +961)"
            )
        return stripped

    @model_validator(mode="after")
    def require_email_or_phone(self):
        if not self.email and not self.phone:
            raise ValueError("Either email or phone is required")
        return self

class UserCreate(EmailOrPhoneFields):
    name: str
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
    ampere: int
    payment_method: PaymentMethod

class UserLogin(BaseModel):
    identifier: str
    password: str

class UserOut(BaseModel):
    id: str
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    role: UserRole
    subscription_status: Optional[str] = None

class UserUpdate(EmailOrPhoneFields):
    name: str

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

class AdminUserUpdate(EmailOrPhoneFields):
    name: str
    role: UserRole

class AdminPasswordReset(BaseModel):
    new_password: str

class SubscriptionCreate(BaseModel):
    ampere: int
    address: str
    building: str
    phone: str

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
    payment_method: Optional[PaymentMethod] = None
    start_date: datetime
    subscriber_name: Optional[str] = None
    last_reading: Optional[float] = None
    pending_ampere_change: Optional[int] = None

class SubscriptionUpdate(BaseModel):
    address: str
    building: str
    phone: str
    ampere: Optional[int] = None

class AmpereChangeRequest(BaseModel):
    ampere: int

class SubscriptionApprove(BaseModel):
    payment_method: PaymentMethod

class TariffUpdate(BaseModel):
    price_per_ampere: float

class TariffOut(BaseModel):
    price_per_ampere: float

class ChatMessage(BaseModel):
    role: Literal["user", "model"]
    text: str

class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = []

class ChatResponse(BaseModel):
    reply: str

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
