from sqlalchemy.orm import Session

from app.models import Report
from app.schemas import ReportCreate, ReportUpdate
from app.services.exceptions import NotFoundError


def create_report(db: Session, payload: ReportCreate) -> Report:
    report = Report(**payload.model_dump())
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


def list_reports(db: Session, skip: int = 0, limit: int = 20) -> list[Report]:
    return db.query(Report).offset(skip).limit(limit).all()


def get_report_or_raise(db: Session, report_id: int) -> Report:
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise NotFoundError("Report not found")
    return report


def update_report(db: Session, report_id: int, payload: ReportUpdate) -> Report:
    report = get_report_or_raise(db=db, report_id=report_id)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(report, key, value)
    db.commit()
    db.refresh(report)
    return report


def delete_report(db: Session, report_id: int) -> None:
    report = get_report_or_raise(db=db, report_id=report_id)
    db.delete(report)
    db.commit()
