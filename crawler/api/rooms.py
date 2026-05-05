"""REST routes for room listings."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from api.deps import get_db
from api.schemas.error import ErrorResponse
from api.schemas.room import RoomRead
from services import room_service

router = APIRouter(prefix="/rooms", tags=["rooms"])


@router.get(
    "",
    response_model=list[RoomRead],
    summary="Danh sách bản ghi crawl",
    description="Trả về các bản ghi `crawl_history` mới nhất trước (`created_at` giảm dần).",
)
def list_rooms(
    skip: int = Query(0, ge=0, description="Bỏ qua N bản ghi đầu (phân trang)."),
    limit: int = Query(50, ge=1, le=200, description="Số bản ghi tối đa (1–200)."),
    db: Session = Depends(get_db),
) -> list[RoomRead]:
    rows = room_service.list_crawl_history(db, skip=skip, limit=limit)
    return [RoomRead.model_validate(r) for r in rows]


@router.get(
    "/{room_id}",
    response_model=RoomRead,
    summary="Chi tiết một bản ghi",
    description="Lấy một dòng `crawl_history` theo id.",
    responses={
        404: {
            "model": ErrorResponse,
            "description": "Không tìm thấy id.",
        },
    },
)
def get_room(room_id: int, db: Session = Depends(get_db)) -> RoomRead:
    row = room_service.get_crawl_history_by_id(db, room_id)
    return RoomRead.model_validate(row)
