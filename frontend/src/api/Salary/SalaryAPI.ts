import axiosInstance from "@/api/axiosInterceptorInstance";

// ============================================================================
// LEGACY INTERFACES (Keep for backward compatibility)
// ============================================================================

export interface SalaryResponse {
  salary_id: number;
  teacher_id: number;
  teacher_name: string;
  monthly_salary: number;
  effective_date: string;
  created_at: string;
}

export interface SalaryCreate {
  teacher_id: number;
  monthly_salary: number;
  effective_date: string;
}

// ============================================================================
// NEW PAYROLL SYSTEM INTERFACES
// ============================================================================

export interface TeacherSalaryResponse {
  id: number;
  teacher_id: number;
  teacher_name?: string;
  base_salary: number;
  effective_from: string;
  created_at: string;
}

export interface TeacherSalaryCreate {
  teacher_id: number;
  base_salary: number;
  effective_from: string;
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
  export const getAll = async (): Promise<SalaryResponse[]> => {
    try {
      const response = await axiosInstance.get<SalaryResponse[]>("/salary/all");
      return response.data;
    } catch (error) {
      console.error("Error fetching salaries:", error);
      throw error;
    }
  };

  export const create = async (data: SalaryCreate): Promise<SalaryResponse> => {
    try {
      const response = await axiosInstance.post<SalaryResponse>("/salary/add", {
        teacher_id: data.teacher_id,
        monthly_salary: data.monthly_salary,
        effective_date: data.effective_date,
      });
      return response.data;
    } catch (error) {
      console.error("Error creating salary:", error);
      throw error;
    }
  };

  export const getById = async (id: number): Promise<SalaryResponse> => {
    try {
      const response = await axiosInstance.get<SalaryResponse>(
        `/salary/${id}`
      );
      return response.data;
    } catch (error) {
      console.error(`Error fetching salary ${id}:`, error);
      throw error;
    }
  };

  export const update = async (
    id: number,
    data: Partial<SalaryCreate>
  ): Promise<SalaryResponse> => {
    try {
      const response = await axiosInstance.put<SalaryResponse>(
        `/salary/${id}`,
        data
      );
      return response.data;
    } catch (error) {
      console.error(`Error updating salary ${id}:`, error);
      throw error;
    }
  };

  export const delete_salary = async (id: number): Promise<void> => {
    try {
      await axiosInstance.delete(`/salary/${id}`);
    } catch (error) {
      console.error(`Error deleting salary ${id}:`, error);
      throw error;
    }
  };

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

  export const createSalaryLedger = async (data: any): Promise<SalaryLedgerResponse> => {
    try {
      const response = await axiosInstance.post<SalaryLedgerResponse>("/salary/ledger/add", data);
      return response.data;
    } catch (error) {
      console.error("Error creating salary ledger:", error);
      throw error;
    }
  };

  export const getTeacherSalaryLedgers = async (
    teacherId: number,
    month?: number,
    year?: number
  ): Promise<SalaryLedgerResponse[]> => {
    try {
      const params = new URLSearchParams();
      if (month) params.append('month', month.toString());
      if (year) params.append('year', year.toString());

      const url = `/salary/ledger/teacher/${teacherId}${params.toString() ? '?' + params.toString() : ''}`;
      const response = await axiosInstance.get<SalaryLedgerResponse[]>(url);
      return response.data;
    } catch (error) {
      console.error(`Error fetching teacher salary ledgers for ${teacherId}:`, error);
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
}
