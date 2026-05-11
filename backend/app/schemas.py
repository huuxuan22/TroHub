from datetime import datetime
from decimal import Decimal
from enum import Enum

from pydantic import BaseModel, ConfigDict


class UserRoleSchema(str, Enum):
    tenant = "tenant"
    landlord = "landlord"
    admin = "admin"


class UserStatusSchema(str, Enum):
    active = "active"
    inactive = "inactive"
    banned = "banned"


class RoomStatusSchema(str, Enum):
    draft = "draft"
    available = "available"
    rented = "rented"
    hidden = "hidden"
    expired = "expired"


class ReportStatusSchema(str, Enum):
    pending = "pending"
    reviewed = "reviewed"
    resolved = "resolved"
    rejected = "rejected"


class CrawlStatusSchema(str, Enum):
    queued = "queued"
    running = "running"
    done = "done"
    failed = "failed"


class UserBase(BaseModel):
    full_name: str
    email: str
    role: UserRoleSchema = UserRoleSchema.tenant
    phone_number: str | None = None
    status: UserStatusSchema = UserStatusSchema.active


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    full_name: str | None = None
    email: str | None = None
    role: UserRoleSchema | None = None
    phone_number: str | None = None
    status: UserStatusSchema | None = None
    password: str | None = None


class UserOut(UserBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LandlordProfileBase(BaseModel):
    user_id: int
    business_name: str | None = None
    national_id: str | None = None
    business_license: str | None = None
    is_verified: bool = False


class LandlordProfileCreate(LandlordProfileBase):
    pass


class LandlordProfileUpdate(BaseModel):
    business_name: str | None = None
    national_id: str | None = None
    business_license: str | None = None
    is_verified: bool | None = None


class LandlordProfileOut(LandlordProfileBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RoomBase(BaseModel):
    title: str
    room_type: str = "Phòng trọ"
    description: str | None = None
    price: Decimal
    area_sqm: Decimal | None = None
    address: str
    latitude: Decimal | None = None
    longitude: Decimal | None = None
    status: RoomStatusSchema = RoomStatusSchema.draft
    source: str = "owner"
    landlord_id: int
    expires_at: datetime | None = None


class RoomCreate(RoomBase):
    pass


class RoomUpdate(BaseModel):
    title: str | None = None
    room_type: str | None = None
    description: str | None = None
    price: Decimal | None = None
    area_sqm: Decimal | None = None
    address: str | None = None
    latitude: Decimal | None = None
    longitude: Decimal | None = None
    status: RoomStatusSchema | None = None
    source: str | None = None
    landlord_id: int | None = None
    expires_at: datetime | None = None


class RoomOut(RoomBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RoomImageBase(BaseModel):
    room_id: int
    image_url: str


class RoomImageCreate(RoomImageBase):
    pass


class RoomImageOut(RoomImageBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


class AmenityBase(BaseModel):
    name: str


class AmenityCreate(AmenityBase):
    pass


class AmenityUpdate(BaseModel):
    name: str | None = None


class AmenityOut(AmenityBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


class RoomAmenityBase(BaseModel):
    room_id: int
    amenity_id: int


class RoomAmenityCreate(RoomAmenityBase):
    pass


class RoomAmenityOut(RoomAmenityBase):
    model_config = ConfigDict(from_attributes=True)


class FavoriteBase(BaseModel):
    user_id: int
    room_id: int


class FavoriteCreate(FavoriteBase):
    pass


class FavoriteOut(FavoriteBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ReportBase(BaseModel):
    user_id: int
    room_id: int
    reason: str
    status: ReportStatusSchema = ReportStatusSchema.pending


class ReportCreate(ReportBase):
    pass


class ReportUpdate(BaseModel):
    reason: str | None = None
    status: ReportStatusSchema | None = None


class ReportOut(ReportBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ConversationBase(BaseModel):
    user_id: int
    other_user_id: int
    room_id: int


class ConversationCreate(ConversationBase):
    pass


class ConversationOut(ConversationBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MessageBase(BaseModel):
    sender_id: int
    receiver_id: int
    room_id: int | None = None
    content: str
    is_read: bool = False


class MessageCreate(MessageBase):
    pass


class MessageUpdate(BaseModel):
    content: str | None = None
    is_read: bool | None = None


class MessageOut(MessageBase):
    id: int
    sent_at: datetime

    model_config = ConfigDict(from_attributes=True)


class NotificationBase(BaseModel):
    user_id: int
    content: str
    is_read: bool = False


class NotificationCreate(NotificationBase):
    pass


class NotificationUpdate(BaseModel):
    content: str | None = None
    is_read: bool | None = None


class NotificationOut(NotificationBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SearchHistoryBase(BaseModel):
    user_id: int
    keyword: str | None = None
    filters: dict | None = None


class SearchHistoryCreate(SearchHistoryBase):
    pass


class SearchHistoryOut(SearchHistoryBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CrawlHistoryBase(BaseModel):
    source_url: str
    status: CrawlStatusSchema = CrawlStatusSchema.queued


class CrawlHistoryCreate(CrawlHistoryBase):
    pass


class CrawlHistoryUpdate(BaseModel):
    status: CrawlStatusSchema | None = None


class CrawlHistoryOut(CrawlHistoryBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
