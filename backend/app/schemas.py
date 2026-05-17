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
    address: str | None = Field(default=None, max_length=500)
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
    address: str | None = Field(default=None, max_length=500)
    status: UserStatusSchema | None = None
    password: str | None = None


class UserLocationSave(BaseModel):
    """Lưu địa chỉ sau khi người dùng đã đăng nhập bấm lấy vị trí."""

    address: str = Field(..., min_length=1, max_length=500)

    @field_validator("address", mode="before")
    @classmethod
    def strip_address(cls, v: object) -> str:
        if v is None:
            raise ValueError("address is required")
        s = str(v).strip()
        if not s:
            raise ValueError("address is required")
        return s


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
    is_verified: int = Field(default=0, ge=0, le=1, description="0 = chưa duyệt, 1 = đã duyệt")


class LandlordProfileCreate(LandlordProfileBase):
    pass


class LandlordProfileUpdate(BaseModel):
    business_name: str | None = None
    national_id: str | None = None
    business_license: str | None = None
    is_verified: int | None = Field(default=None, ge=0, le=1)


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
    image_urls: list[str] = Field(default_factory=list, description="Danh sách URL ảnh đã upload")
    amenity_ids: list[int] = Field(default_factory=list, description="ID tiện ích đính kèm")


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


class RoomImageBase(BaseModel):
    room_id: int
    image_url: str


class RoomImageCreate(RoomImageBase):
    pass


class RoomImageOut(RoomImageBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


class RoomImageAddIn(BaseModel):
    image_url: str = Field(..., min_length=1, max_length=600)


class RoomOut(RoomBase):
    id: int
    created_at: datetime
    images: list[RoomImageOut] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class NearbyCrawlRoomOut(RoomOut):
    distance_km: float | None = None


class AmenityBriefOut(BaseModel):
    id: int
    name: str

    model_config = ConfigDict(from_attributes=True)


class FeaturedHotRoomOut(RoomOut):
    amenities: list[AmenityBriefOut] = Field(default_factory=list)


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


class FavoriteCreate(BaseModel):
    """Client sends only room_id; user_id is taken from JWT."""

    room_id: int = Field(..., ge=1)


class FavoriteOut(BaseModel):
    id: int
    user_id: int
    room_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class FavoriteWithRoomOut(BaseModel):
    id: int
    room_id: int
    created_at: datetime
    room: RoomOut

    model_config = ConfigDict(from_attributes=True)


class FavoriteRoomIdsOut(BaseModel):
    room_ids: list[int]


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


class MessageCreateIn(BaseModel):
    receiver_id: int = Field(..., ge=1)
    room_id: int | None = Field(default=None, ge=1)
    content: str = Field(..., min_length=1)

    @field_validator("content", mode="before")
    @classmethod
    def strip_content(cls, value: object) -> str:
        text = str(value or "").strip()
        if not text:
            raise ValueError("Nội dung tin nhắn không được để trống")
        return text


class MessageUpdate(BaseModel):
    content: str | None = None
    is_read: bool | None = None


class MessageOut(MessageBase):
    id: int
    sent_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MessageThreadReadIn(BaseModel):
    other_user_id: int = Field(..., ge=1)
    room_id: int | None = Field(default=None, ge=1)


class MessageThreadReadOut(BaseModel):
    updated: int


class MessageConversationOut(BaseModel):
    other_user_id: int
    other_user_name: str
    room_id: int | None = None
    last_message: str
    last_message_at: datetime
    unread_count: int = 0


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


class SearchHistoryLogIn(BaseModel):
    """Body ghi nhận một lần tìm kiếm từ frontend."""

    keyword: str | None = Field(default=None, max_length=255)
    city: str | None = Field(default=None, max_length=120)
    filters: dict | None = None
    result_count: int | None = Field(default=None, ge=0)


class SearchHistoryOut(BaseModel):
    id: int
    keyword: str | None = None
    filters: dict | None = None
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


# === Admin dashboard ===

class DistrictStatOut(BaseModel):
    name: str
    count: int


class AdminStatsOut(BaseModel):
    """Số liệu tổng quan cho trang quản trị."""

    total_users: int
    total_tenants: int
    total_landlords: int
    total_admins: int
    pending_landlord_applications: int
    verified_landlords: int
    verification_rate_percent: float
    total_rooms: int
    rooms_pending: int
    rooms_available: int
    rooms_hidden: int
    rooms_by_status: dict[str, int]
    average_rent_price: float | None
    top_district_name: str | None
    top_district_count: int
    top_districts: list[DistrictStatOut]
    total_reports: int
    violations_count: int
    pending_reports: int


class LandlordApplicationOut(BaseModel):
    """Hồ sơ chủ nhà kèm thông tin user — dùng cho admin xét duyệt."""

    id: int
    user_id: int
    business_name: str | None = None
    national_id: str | None = None
    business_license: str | None = None
    is_verified: int
    created_at: datetime
    user: UserOut

    model_config = ConfigDict(from_attributes=True)


class UserStatusPatch(BaseModel):
    status: UserStatusSchema


class RoomStatusPatch(BaseModel):
    status: RoomStatusSchema


class ReportStatusPatch(BaseModel):
    status: ReportStatusSchema


class LandlordRejectIn(BaseModel):
    """Body tuỳ chọn khi admin từ chối hồ sơ — kèm lý do để gửi vào Notification."""

    reason: str | None = Field(default=None, max_length=500)


class LandlordProfileCounts(BaseModel):
    pending: int
    verified: int
    total: int
