from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import ReportCreate, ReportOut, ReportUpdate
from app.services.exceptions import NotFoundError
from app.services.reports_service import (
    create_report as create_report_service,
    delete_report as delete_report_service,
    get_report_or_raise,
    list_reports as list_reports_service,
    update_report as update_report_service,
)

router = APIRouter(prefix="/trohub/reports", tags=["reports"])


@router.post("", response_model=ReportOut, status_code=status.HTTP_201_CREATED)
def create_report(payload: ReportCreate, db: Session = Depends(get_db)):
    return create_report_service(db=db, payload=payload)


@router.get("", response_model=list[ReportOut])
def list_reports(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    return list_reports_service(db=db, skip=skip, limit=limit)


@router.get("/{report_id}", response_model=ReportOut)
def get_report(report_id: int, db: Session = Depends(get_db)):
    try:
        return get_report_or_raise(db=db, report_id=report_id)
    except NotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")


@router.put("/{report_id}", response_model=ReportOut)
def update_report(report_id: int, payload: ReportUpdate, db: Session = Depends(get_db)):
    try:
        return update_report_service(db=db, report_id=report_id, payload=payload)
    except NotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")


@router.delete("/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_report(report_id: int, db: Session = Depends(get_db)):
    try:
        delete_report_service(db=db, report_id=report_id)
    except NotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    return None
