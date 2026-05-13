from datetime import datetime
from decimal import Decimal
from enum import Enum

from sqlalchemy import JSON, Boolean, DateTime, Enum as SqlEnum, ForeignKey, Numeric, SmallInteger, String, Text, UniqueConstraint, text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class UserRole(str, Enum):
    TENANT = "tenant"
    LANDLORD = "landlord"
    ADMIN = "admin"


class UserStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    BANNED = "banned"


class RoomStatus(str, Enum):
    DRAFT = "draft"
    AVAILABLE = "available"
    RENTED = "rented"
    HIDDEN = "hidden"
    EXPIRED = "expired"


class ReportStatus(str, Enum):
    PENDING = "pending"
    REVIEWED = "reviewed"
    RESOLVED = "resolved"
    REJECTED = "rejected"


class CrawlStatus(str, Enum):
    QUEUED = "queued"
    RUNNING = "running"
    DONE = "done"
    FAILED = "failed"


def _mysql_pep_enum(py_enum: type[Enum], sqlalchemy_name: str) -> SqlEnum:
    """Alembic tạo ENUM MySQL theo tên hội viên (TENANT, ACTIVE, …); khớp với PEP-435 `.name`."""
    return SqlEnum(
        py_enum,
        name=sqlalchemy_name,
        values_callable=lambda cls: [m.name for m in cls],
    )


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    full_name: Mapped[str] = mapped_column(String(150))
    email: Mapped[str] = mapped_column(String(255), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[UserRole] = mapped_column(_mysql_pep_enum(UserRole, "userrole"), default=UserRole.TENANT)
    phone_number: Mapped[str | None] = mapped_column(String(20))
    status: Mapped[UserStatus] = mapped_column(_mysql_pep_enum(UserStatus, "userstatus"), default=UserStatus.ACTIVE)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    landlord_profile: Mapped["LandlordProfile | None"] = relationship(back_populates="user", uselist=False)
    rooms: Mapped[list["Room"]] = relationship(back_populates="landlord")


class LandlordProfile(Base):
    __tablename__ = "landlord_profiles"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    business_name: Mapped[str | None] = mapped_column(String(255))
    national_id: Mapped[str | None] = mapped_column(String(50))
    business_license: Mapped[str | None] = mapped_column(String(255))
    # 0 = chưa duyệt, 1 = admin đã duyệt (MySQL TINYINT; API trả JSON số 0/1).
    is_verified: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=0, server_default=text("0"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped["User"] = relationship(back_populates="landlord_profile")


class Room(Base):
    __tablename__ = "rooms"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(255))
    room_type: Mapped[str] = mapped_column(String(100), default="Phòng trọ")
    description: Mapped[str | None] = mapped_column(Text)
    price: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    area_sqm: Mapped[Decimal | None] = mapped_column(Numeric(8, 2))
    address: Mapped[str] = mapped_column(String(500))
    latitude: Mapped[Decimal | None] = mapped_column(Numeric(10, 7))
    longitude: Mapped[Decimal | None] = mapped_column(Numeric(10, 7))
    status: Mapped[RoomStatus] = mapped_column(_mysql_pep_enum(RoomStatus, "roomstatus"), default=RoomStatus.DRAFT)
    source: Mapped[str] = mapped_column(String(100), default="owner")
    landlord_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime)

    landlord: Mapped["User"] = relationship(back_populates="rooms")
    images: Mapped[list["RoomImage"]] = relationship(back_populates="room", cascade="all, delete-orphan")
    room_amenities: Mapped[list["RoomAmenity"]] = relationship(back_populates="room", cascade="all, delete-orphan")


class RoomImage(Base):
    __tablename__ = "room_images"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    room_id: Mapped[int] = mapped_column(ForeignKey("rooms.id", ondelete="CASCADE"))
    image_url: Mapped[str] = mapped_column(String(600))

    room: Mapped["Room"] = relationship(back_populates="images")


class Amenity(Base):
    __tablename__ = "amenities"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(120), unique=True)

    room_amenities: Mapped[list["RoomAmenity"]] = relationship(back_populates="amenity", cascade="all, delete-orphan")


class RoomAmenity(Base):
    __tablename__ = "room_amenities"

    room_id: Mapped[int] = mapped_column(ForeignKey("rooms.id", ondelete="CASCADE"), primary_key=True)
    amenity_id: Mapped[int] = mapped_column(ForeignKey("amenities.id", ondelete="CASCADE"), primary_key=True)

    room: Mapped["Room"] = relationship(back_populates="room_amenities")
    amenity: Mapped["Amenity"] = relationship(back_populates="room_amenities")


class Favorite(Base):
    __tablename__ = "favorites"
    __table_args__ = (UniqueConstraint("user_id", "room_id", name="uq_favorites_user_room"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    room_id: Mapped[int] = mapped_column(ForeignKey("rooms.id", ondelete="CASCADE"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    room: Mapped["Room"] = relationship(foreign_keys=[room_id])


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    room_id: Mapped[int] = mapped_column(ForeignKey("rooms.id", ondelete="CASCADE"))
    reason: Mapped[str] = mapped_column(Text)
    status: Mapped[ReportStatus] = mapped_column(_mysql_pep_enum(ReportStatus, "reportstatus"), default=ReportStatus.PENDING)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Conversation(Base):
    __tablename__ = "conversations"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    other_user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    room_id: Mapped[int] = mapped_column(ForeignKey("rooms.id", ondelete="CASCADE"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    sender_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    receiver_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    room_id: Mapped[int | None] = mapped_column(ForeignKey("rooms.id", ondelete="SET NULL"))
    content: Mapped[str] = mapped_column(Text)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    sent_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    content: Mapped[str] = mapped_column(Text)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class SearchHistory(Base):
    __tablename__ = "search_history"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    keyword: Mapped[str | None] = mapped_column(String(255))
    filters: Mapped[dict | None] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class CrawlHistory(Base):
    __tablename__ = "crawl_history"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    source_url: Mapped[str] = mapped_column(String(700))
    status: Mapped[CrawlStatus] = mapped_column(_mysql_pep_enum(CrawlStatus, "crawlstatus"), default=CrawlStatus.QUEUED)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
