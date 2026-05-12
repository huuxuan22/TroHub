from datetime import datetime
from decimal import Decimal
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field, field_validator


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
    full_name: str = Field(..., min_length=1, max_length=150)
    email: str = Field(..., min_length=3, max_length=255)
    role: UserRoleSchema = UserRoleSchema.tenant
    phone_number: str | None = Field(default=None, max_length=20)
    status: UserStatusSchema = UserStatusSchema.active

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, v: object) -> str:
        if v is None:
            raise ValueError("email is required")
        s = str(v).strip().lower()
        if not s:
            raise ValueError("email is required")
        return s

    @field_validator("full_name", mode="before")
    @classmethod
    def strip_full_name(cls, v: object) -> str:
        if v is None:
            return ""
        return str(v).strip()

    @field_validator("phone_number", mode="before")
    @classmethod
    def normalize_phone(cls, v: object) -> str | None:
        if v is None:
            return None
        s = str(v).strip()
        return s if s else None


class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=256)


class UserRegister(BaseModel):
    """Đăng ký công khai — bắt buộc số điện thoại."""

    full_name: str = Field(..., min_length=1, max_length=150)
    email: str = Field(..., min_length=3, max_length=255)
    password: str = Field(..., min_length=8, max_length=256)
    phone_number: str = Field(..., min_length=8, max_length=20)
    role: UserRoleSchema = UserRoleSchema.tenant

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, v: object) -> str:
        if v is None:
            raise ValueError("email is required")
        s = str(v).strip().lower()
        if not s:
            raise ValueError("email is required")
        return s

    @field_validator("full_name", mode="before")
    @classmethod
    def strip_full_name(cls, v: object) -> str:
        if v is None:
            return ""
        return str(v).strip()

    @field_validator("phone_number", mode="before")
    @classmethod
    def normalize_phone_required(cls, v: object) -> str:
        if v is None:
            raise ValueError("Số điện thoại là bắt buộc")
        s = str(v).strip()
        if not s:
            raise ValueError("Số điện thoại là bắt buộc")
        digits = "".join(c for c in s if c.isdigit())
        if len(digits) < 9:
            raise ValueError("Số điện thoại phải có ít nhất 9 chữ số")
        return s


class UserUpdate(BaseModel):
    full_name: str | None = None
    email: str | None = None
    role: UserRoleSchema | None = None
    phone_number: str | None = None
    status: UserStatusSchema | None = None
    password: str | None = None


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


class UserOut(UserBase):
    id: int
    created_at: datetime
    landlord_profile: LandlordProfileOut | None = None

    model_config = ConfigDict(from_attributes=True)


class LandlordApplicationIn(BaseModel):
    """Đăng ký làm chủ phòng — không gửi user_id (lấy từ token)."""

    business_name: str = Field(..., min_length=1, max_length=255)
    national_id: str = Field(..., min_length=6, max_length=50)
    business_license: str | None = Field(default=None, max_length=255)


class RoomListingFields(BaseModel):
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
    expires_at: datetime | None = None


class RoomBase(RoomListingFields):
    landlord_id: int


class RoomCreate(RoomBase):
    pass


class RoomCreateRequest(RoomListingFields):
    """Phần body khi chủ nhà/admin tạo phòng; landlord_id do server gán (trừ khi là admin chỉ định)."""

    landlord_id: int | None = None


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
