import { EntityBase } from "../EntityBase";

export interface AddIncomeModel {
  recipt_number: number;
  date: string; // ISO date string format
  category_id: number;
  source: string;
  description?: string;
  contact?: string;
  amount: number;
}
export interface ViewIncomeModel {
  attendance_date: string; // ISO date string format
  attendance_time: string;
  attendance_class: string;
  attendance_teacher: string;
  attendance_student: string;
  attendance_std_fname: string;
  attendance_value: string;
}
export interface IncomeCategory {
  income_cat_name_id: number; // Updated key
  income_cat_name: string; // Updated key
  created_at: string; // ISO date string format
}

export interface CreateIncomeCat {
  income_cat_name: string;
  created_at?: Date;
  updated_at?: Date;
}

// export interface GetFeeModel {
//     fee_status: number,
//     student_id: number,
//     class_id: number,
//     fee_amount: number,
//     fee_month: string,
//     fee_year: number
// }
