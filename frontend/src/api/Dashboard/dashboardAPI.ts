import AxiosInstance from "@/api/axiosInterceptorInstance";

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace DashboardAPI {
  export const GetUserRoles = async () => {
    try {
      const response = await AxiosInstance.get("/dashboard/user-roles");
      console.log("API Response:", response);
      return response;
    } catch (error) {
      return error;
    }
  };
  export const GetStudentSummary = async (date: string) => {
    try {
      const response = await AxiosInstance.get(
        `/dashboard/student-summary?date=${date}`
      );
      console.log("Student Summary API Response:", response);
      return response;
    } catch (error) {
      return error;
    }
  };
  export const GetAttendanceSummary = async (date?: string) => {
    try {
      const query = date ? `?date=${date}` : "";
      const response = await AxiosInstance.get(
        `/dashboard/attendance-summary${query}`
      );
      console.log("Attendance Summary API Response:", response);
      return response;
    } catch (error) {
      console.error("Attendance Summary API Error:", error);
      throw error;
    }
  };
  export const GetIncomeExpenseSummary = async (year: number) => {
    try {
      const response = await AxiosInstance.get(
        `/dashboard/income-expense-summary?year=${year}`
      );
      console.log("Income Expense Summary API Response:", response);
      return response;
    } catch (error) {
      return error;
    }
  };
  export const GetFeeSummary = async (year: number) => {
    try {
      const response = await AxiosInstance.get(
        `/dashboard/fee-summary?year=${year}`
      );
      console.log("Fee Summary API Response:", response);
      return response;
    } catch (error) {
      return error;
    }
  };
  export const GetIncomeSummary = async (year: number, month?: number) => {
    try {
      let url = `/dashboard/income-summary?year=${year}`;
      if (month) {
        url += `&month=${month}`;
      }
      
      const response = await AxiosInstance.get(url);
      console.log("Income Summary API Response:", response);
      return response;
    } catch (error) {
      return error;
    }
  }
  export const GetExpenseSummary = async (year: number, month?: number) => {
    try {
      let url = `/dashboard/expense-summary?year=${year}`;
      if (month) {
        url += `&month=${month}`;
      }
      
      const response = await AxiosInstance.get(url);
      console.log("Expense Summary API Response:", response);
      return response;
    } catch (error) {
      return error;
    }
  }
}