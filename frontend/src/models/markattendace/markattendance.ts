import { EntityBase } from "../EntityBase";

export interface MarkAttendance extends EntityBase {
  studentId: string | number;
  date: Date;
  status: 'present' | 'absent' | 'late' | 'leave';
}

export interface MarkAttInput {
  attendance_date: string;
  attendance_time_id: number;
  class_name_id: number;
  teacher_name_id: number;
  attendances: {
    attendance_date: string;
    attendance_time_id: string;
    class_name_id: string;
    teacher_name_id: string;
    student_id: string;
    attendance_value_id: string;
  }[];
}

export interface MarkAttUpdate {
  attendance_id?: number;
  attendance_date?: string;
  attendance_time_id?: number;
  class_name_id?: number;
  teacher_name_id?: number;
  student_id?: number;
  attendance_value_id?: number;
  created_at?: Date;
  updated_at?: Date;
}
