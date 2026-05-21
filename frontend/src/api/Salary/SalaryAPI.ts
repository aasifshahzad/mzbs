import axiosInstance from "@/api/axiosInterceptorInstance";

// ============================================================================
// NEW PAYROLL SYSTEM INTERFACES
// ============================================================================

export interface TeacherSalaryResponse {
  id: number;
  teacher_id: number;
  teacher_name?: string;
  base_salary: number;
  effective_from: string;
  effective_till?: string | null;  // NULL = currently active
  created_at: string;
}

export interface TeacherSalaryCreate {
  teacher_id: number;
  base_salary: number;
  effective_from: string;
}

// New interfaces for salary history feature
export interface SalaryPeriod {
  id: number;
  base_salary: number;
  effective_from: string;
  effective_till: string | null;  // null = currently active
  days: number;
  period_payable: number;
}

export interface TeacherSalarySummary {
  teacher_id: number;
  teacher_name: string;
  current_base_salary: number;
  latest_effective_from: string;
  total_payable: number;
  total_allowance: number;
  total_deduction: number;
  total_net_salary: number;
  total_paid: number;
  remaining: number;
  salary_history: SalaryPeriod[];
}

export interface SalaryLedgerResponse {
  id: number;
  teacher_id: number;
  teacher_name?: string;
  month: number;
  year: number;
  base_salary: number;
  allowance_total: number;
  deduction_total: number;
  net_salary: number;
  total_paid: number;
  remaining: number;
  created_at: string;
}

export interface SalaryPaymentResponse {
  id: number;
  teacher_id: number;
  teacher_name?: string;
  ledger_id: number;
  amount: number;
  payment_date: string;
  created_at: string;
}

export interface SalaryPaymentCreate {
  teacher_id: number;
  ledger_id: number;
  amount: number;
  payment_date: string;
}

export interface AllowanceResponse {
  id: number;
  teacher_id: number;
  teacher_name?: string;
  month: number;
  year: number;
  amount: number;
  reason?: string;
  created_at: string;
}

export interface AllowanceCreate {
  teacher_id: number;
  month: number;
  year: number;
  amount: number;
  reason?: string;
}

export interface DeductionResponse {
  id: number;
  teacher_id: number;
  teacher_name?: string;
  month: number;
  year: number;
  amount: number;
  type: string;
  reason?: string;
  created_at: string;
}

export interface DeductionCreate {
  teacher_id: number;
  month: number;
  year: number;
  amount: number;
  type: string;
  reason?: string;
}

export namespace SalaryAPI {
  // ============================================================================
  // NEW PAYROLL SYSTEM API METHODS
  // ============================================================================

  // Teacher Salary Management
  export const getAllTeacherSalaries = async (): Promise<TeacherSalaryResponse[]> => {
    try {
      const response = await axiosInstance.get<TeacherSalaryResponse[]>("/salary/teacher-salary/all");
      return response.data;
    } catch (error) {
      console.error("Error fetching teacher salaries:", error);
      throw error;
    }
  };

  export const createTeacherSalary = async (data: TeacherSalaryCreate): Promise<TeacherSalaryResponse> => {
    try {
      const response = await axiosInstance.post<TeacherSalaryResponse>("/salary/teacher-salary/add", data);
      return response.data;
    } catch (error) {
      console.error("Error creating teacher salary:", error);
      throw error;
    }
  };

  export const updateTeacherSalary = async (
    salaryId: number,
    data: Partial<TeacherSalaryCreate>
  ): Promise<TeacherSalaryResponse> => {
    try {
      const response = await axiosInstance.put<TeacherSalaryResponse>(
        `/salary/teacher-salary/${salaryId}`,
        data
      );
      return response.data;
    } catch (error) {
      console.error(`Error updating teacher salary ${salaryId}:`, error);
      throw error;
    }
  };

  export const getTeacherSalarySummary = async (teacherId: number): Promise<TeacherSalarySummary> => {
    try {
      const response = await axiosInstance.get<TeacherSalarySummary>(`/salary/teacher-summary/${teacherId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching teacher salary summary for ${teacherId}:`, error);
      throw error;
    }
  };

  export const getTeacherSalaryHistory = async (teacherId: number): Promise<TeacherSalaryResponse[]> => {
    try {
      const response = await axiosInstance.get<TeacherSalaryResponse[]>(`/salary/teacher-salary/${teacherId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching teacher salary history for ${teacherId}:`, error);
      throw error;
    }
  };

  export const deleteTeacherSalary = async (salaryId: number): Promise<void> => {
    try {
      await axiosInstance.delete(`/salary/teacher-salary/${salaryId}`);
    } catch (error) {
      console.error(`Error deleting teacher salary ${salaryId}:`, error);
      throw error;
    }
  };

  // Salary Ledger Management
  export const getAllSalaryLedgers = async (): Promise<SalaryLedgerResponse[]> => {
    try {
      const response = await axiosInstance.get<SalaryLedgerResponse[]>("/salary/ledger/all");
      return response.data;
    } catch (error) {
      console.error("Error fetching salary ledgers:", error);
      throw error;
    }
  };

  export const createSalaryLedger = async (data: { teacher_id: number; month: number; year: number }): Promise<SalaryLedgerResponse> => {
    try {
      const response = await axiosInstance.post<SalaryLedgerResponse>("/salary/ledger/add", data);
      return response.data;
    } catch (error) {
      console.error("Error creating salary ledger:", error);
      throw error;
    }
  };

  export const ensureTeacherLedger = async (
    teacherId: number,
    month: number,
    year: number
  ): Promise<SalaryLedgerResponse> => {
    try {
      const response = await axiosInstance.post<SalaryLedgerResponse>(
        `/salary/ledger/ensure/${teacherId}/${month}/${year}`
      );
      return response.data;
    } catch (error) {
      console.error(`Error ensuring salary ledger for ${teacherId}/${month}/${year}:`, error);
      throw error;
    }
  };

  export const deleteSalaryLedger = async (ledgerId: number): Promise<void> => {
    try {
      await axiosInstance.delete(`/salary/ledger/${ledgerId}`);
    } catch (error) {
      console.error(`Error deleting salary ledger ${ledgerId}:`, error);
      throw error;
    }
  };

  export const updateSalaryLedger = async (ledgerId: number, data: Partial<SalaryLedgerResponse>): Promise<SalaryLedgerResponse> => {
    try {
      const response = await axiosInstance.put<SalaryLedgerResponse>(`/salary/ledger/${ledgerId}`, data);
      return response.data;
    } catch (error) {
      console.error(`Error updating salary ledger ${ledgerId}:`, error);
      throw error;
    }
  };

  // Payment Management
  export const createSalaryPayment = async (data: SalaryPaymentCreate): Promise<SalaryPaymentResponse> => {
    try {
      const response = await axiosInstance.post<SalaryPaymentResponse>("/salary/payment/add", data);
      return response.data;
    } catch (error) {
      console.error("Error creating salary payment:", error);
      throw error;
    }
  };

  export const getLedgerPayments = async (ledgerId: number): Promise<SalaryPaymentResponse[]> => {
    try {
      const response = await axiosInstance.get<SalaryPaymentResponse[]>(`/salary/payment/ledger/${ledgerId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching payments for ledger ${ledgerId}:`, error);
      throw error;
    }
  };

  export const getAllSalaryPayments = async (): Promise<SalaryPaymentResponse[]> => {
    try {
      const response = await axiosInstance.get<SalaryPaymentResponse[]>("/salary/payment/all");
      return response.data;
    } catch (error) {
      console.error("Error fetching all salary payments:", error);
      throw error;
    }
  };

  // Allowance Management
  export const createAllowance = async (data: AllowanceCreate): Promise<AllowanceResponse> => {
    try {
      const response = await axiosInstance.post<AllowanceResponse>("/salary/allowance/add", data);
      return response.data;
    } catch (error) {
      console.error("Error creating allowance:", error);
      throw error;
    }
  };

  export const getTeacherAllowances = async (
    teacherId: number,
    month?: number,
    year?: number
  ): Promise<AllowanceResponse[]> => {
    try {
      const params = new URLSearchParams();
      if (month) params.append('month', month.toString());
      if (year) params.append('year', year.toString());

      const url = `/salary/allowance/teacher/${teacherId}${params.toString() ? '?' + params.toString() : ''}`;
      const response = await axiosInstance.get<AllowanceResponse[]>(url);
      return response.data;
    } catch (error) {
      console.error(`Error fetching allowances for teacher ${teacherId}:`, error);
      throw error;
    }
  };

  export const getAllAllowances = async (): Promise<AllowanceResponse[]> => {
    try {
      const response = await axiosInstance.get<AllowanceResponse[]>("/salary/allowance/all");
      return response.data;
    } catch (error) {
      console.error("Error fetching all allowances:", error);
      throw error;
    }
  };

  // Deduction Management
  export const createDeduction = async (data: DeductionCreate): Promise<DeductionResponse> => {
    try {
      const response = await axiosInstance.post<DeductionResponse>("/salary/deduction/add", data);
      return response.data;
    } catch (error) {
      console.error("Error creating deduction:", error);
      throw error;
    }
  };

  export const getTeacherDeductions = async (
    teacherId: number,
    month?: number,
    year?: number
  ): Promise<DeductionResponse[]> => {
    try {
      const params = new URLSearchParams();
      if (month) params.append('month', month.toString());
      if (year) params.append('year', year.toString());

      const url = `/salary/deduction/teacher/${teacherId}${params.toString() ? '?' + params.toString() : ''}`;
      const response = await axiosInstance.get<DeductionResponse[]>(url);
      return response.data;
    } catch (error) {
      console.error(`Error fetching deductions for teacher ${teacherId}:`, error);
      throw error;
    }
  };

  export const getAllDeductions = async (): Promise<DeductionResponse[]> => {
    try {
      const response = await axiosInstance.get<DeductionResponse[]>("/salary/deduction/all");
      return response.data;
    } catch (error) {
      console.error("Error fetching all deductions:", error);
      throw error;
    }
  };

  // Delete Methods
  export const deleteSalaryPayment = async (paymentId: number): Promise<void> => {
    try {
      await axiosInstance.delete(`/salary/payment/${paymentId}`);
    } catch (error) {
      console.error(`Error deleting salary payment ${paymentId}:`, error);
      throw error;
    }
  };

  export const updateSalaryPayment = async (
    paymentId: number,
    data: Partial<SalaryPaymentResponse>
  ): Promise<SalaryPaymentResponse> => {
    try {
      const response = await axiosInstance.put<SalaryPaymentResponse>(
        `/salary/payment/${paymentId}`,
        {
          amount: data.amount,
          payment_date: data.payment_date,
        }
      );
      return response.data;
    } catch (error) {
      console.error(`Error updating salary payment ${paymentId}:`, error);
      throw error;
    }
  };

  export const deleteAllowance = async (allowanceId: number): Promise<void> => {
    try {
      await axiosInstance.delete(`/salary/allowance/${allowanceId}`);
    } catch (error) {
      console.error(`Error deleting allowance ${allowanceId}:`, error);
      throw error;
    }
  };

  export const updateAllowance = async (
    allowanceId: number,
    data: Partial<AllowanceResponse>
  ): Promise<AllowanceResponse> => {
    try {
      const response = await axiosInstance.put<AllowanceResponse>(
        `/salary/allowance/${allowanceId}`,
        {
          amount: data.amount,
          reason: data.reason,
        }
      );
      return response.data;
    } catch (error) {
      console.error(`Error updating allowance ${allowanceId}:`, error);
      throw error;
    }
  };

  export const deleteDeduction = async (deductionId: number): Promise<void> => {
    try {
      await axiosInstance.delete(`/salary/deduction/${deductionId}`);
    } catch (error) {
      console.error(`Error deleting deduction ${deductionId}:`, error);
      throw error;
    }
  };

  export const updateDeduction = async (
    deductionId: number,
    data: Partial<DeductionResponse>
  ): Promise<DeductionResponse> => {
    try {
      const response = await axiosInstance.put<DeductionResponse>(
        `/salary/deduction/${deductionId}`,
        {
          amount: data.amount,
          type: data.type,
          reason: data.reason,
        }
      );
      return response.data;
    } catch (error) {
      console.error(`Error updating deduction ${deductionId}:`, error);
      throw error;
    }
  };
}
