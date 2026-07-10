from datetime import date, datetime
from typing import List, Optional
from sqlmodel import Field, SQLModel
from sqlalchemy import UniqueConstraint


class StaffAttendance(SQLModel, table=True):
    staff_attendance_id: Optional[int] = Field(default=None, primary_key=True)
    staff_id: int = Field(foreign_key="teachernames.teacher_name_id", nullable=False, index=True)
    attendance_date: date = Field(default_factory=date.today, index=True)
    attendance_status: str = Field(index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("staff_id", "attendance_date", name="uq_staff_attendance_staff_date"),
    )


class StaffAttendanceCreate(SQLModel):
    staff_id: int
    attendance_date: date = Field(default_factory=date.today)
    attendance_status: str


class StaffAttendanceBulkCreate(SQLModel):
    attendance_date: date = Field(default_factory=date.today)
    records: List[StaffAttendanceCreate]


class StaffAttendanceUpdate(SQLModel):
    attendance_status: Optional[str] = None
    attendance_date: Optional[date] = None


class StaffListItem(SQLModel):
    staff_id: int
    staff_name: str
    joining_date: datetime
    total_stay: str


class StaffAttendanceRow(SQLModel):
    staff_id: int
    staff_name: str
    joining_date: datetime
    total_stay: str
    attendance_id: Optional[int] = None
    attendance_date: Optional[date] = None
    attendance_status: Optional[str] = None
    is_marked: bool = False


class StaffAttendanceResponse(SQLModel):
    staff_attendance_id: int
    staff_id: int
    attendance_date: date
    attendance_status: str
    staff_name: str
    joining_date: datetime
    total_stay: str
    created_at: datetime
    updated_at: datetime


class StaffAttendanceSaveSummary(SQLModel):
    created_count: int
    updated_count: int
    skipped_count: int


class StaffAttendanceBulkResponse(SQLModel):
    summary: StaffAttendanceSaveSummary
    records: List[StaffAttendanceResponse]
