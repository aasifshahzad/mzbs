export interface ExamMarkEntry {
  student_id: number;
  obtained_marks: number | null;
}

export interface ExamMarksSubmitPayload {
  exam_date: string;
  class_name_id: number;
  teacher_name_id: number;
  subject_name: string;
  exam_type: string;
  total_marks: number;
  marks: ExamMarkEntry[];
}

export interface ExamMarkRecord {
  exam_mark_id: number;
  exam_date: string;
  class_name_id: number;
  teacher_name_id: number;
  subject_name: string;
  exam_type: string;
  total_marks: number;
  student_id: number;
  obtained_marks: number | null;
  created_at: string;
}
