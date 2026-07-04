export interface ViewMarksStudentMark {
  exam_date: string;
  obtained_marks: number | null;
  total_marks?: number | null;
}

export interface ViewMarksStudentRow {
  student_id: number;
  student_name: string;
  marks: ViewMarksStudentMark[];
  total_obtained_marks: number;
  total_marks: number;
  position: number;
}

export interface ViewMarksResponse {
  class_name_id: number;
  subject_name: string;
  exam_type: string;
  dates: string[];
  students: ViewMarksStudentRow[];
}
