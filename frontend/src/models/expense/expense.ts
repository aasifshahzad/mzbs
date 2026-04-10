export interface AddExpenseModel {
  recipt_number: number;
  date: string; // ISO date string format
  category_id: number;
  to_whom: string;
  description?: string;
  amount: number;
}

export interface ExpenseCategory {
  expense_cat_name_id: number;
  expense_cat_name: string;
}

export interface ExpenseData {
  receipt_number: number;
  date: string; // ISO date string format
  category: string;
  to_whom: string;
  description: string;
  amount: number;
}