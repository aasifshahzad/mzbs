from pydantic import BaseModel
from typing import List, Dict, Optional, Union, Any

class UserLoginSummary(BaseModel):
    Roll: str
    Total: int

class AttendanceSummary(BaseModel):
    date: str
    class_name: str
    attendance_values: Dict[str, int]  # e.g., {"present": 10, "absent": 5}

class StudentSummary(BaseModel):
    total_students: int
    present: int
    absent: int
    late: int
    leave: int

class IncomeExpenseCategorySummary(BaseModel):
    year: int
    month: int
    category_summary: Dict[str, float]

class GraphDataPoint(BaseModel):
    label: str
    value: float

class Dataset(BaseModel):
    label: str
    data: List[float]
    backgroundColor: Union[str, List[str]]
    borderColor: Optional[Union[str, List[str]]] = None
    borderWidth: Optional[int] = None
    type: Optional[str] = None          # some datasets pass type="bar"

class GraphData(BaseModel):
    labels: List[str]
    datasets: List[Dataset]
    title: str
    options: Optional[Dict[str, Any]] = None   # FIX: was missing, caused validation error

class LoginGraphData(BaseModel):
    summary: List[UserLoginSummary]
    graph: GraphData

class AttendanceGraphData(BaseModel):
    summary: List[AttendanceSummary]
    graph: GraphData

class StudentGraphData(BaseModel):
    summary: StudentSummary
    graph: GraphData

class CategoryGraphData(BaseModel):
    summary: List[IncomeExpenseCategorySummary]
    graph: GraphData
    total: float
