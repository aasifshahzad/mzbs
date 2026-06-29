import AxiosInstance from "@/api/axiosInterceptorInstance";

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace DashboardAPI {
  export const GetUserRoles = async () => {
    try {
      const response = await AxiosInstance.get("/dashboard/user-roles");
      return response;
    } catch (error) {
      throw error;
    }
  };

  export const GetDashboardSummary = async (date?: string, year?: number) => {
    try {
      const params: Record<string, string | number> = {};
      if (date) params.date = date;
      if (year) params.year = year;
      const response = await AxiosInstance.get("/dashboard/summary", { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  export const GetStudentSummary = async (date: string) => {
    try {
      const response = await AxiosInstance.get(
        `/dashboard/student-summary?date=${date}`
      );
      return response;
    } catch (error) {
      throw error;
    }
  };

  export const GetAttendanceSummary = async (date?: string) => {
    try {
      const query = date ? `?date=${date}` : "";
      const response = await AxiosInstance.get(
        `/dashboard/attendance-summary${query}`
      );
      return response;
    } catch (error) {
      throw error;
    }
  };

  export const GetIncomeExpenseSummary = async (year: number) => {
    try {
      const response = await AxiosInstance.get(
        `/dashboard/income-expense-summary?year=${year}`
      );
      return response;
    } catch (error) {
      throw error;
    }
  };

  export const GetFeeSummary = async (year: number) => {
    try {
      const response = await AxiosInstance.get(
        `/dashboard/fee-summary?year=${year}`
      );
      return response;
    } catch (error) {
      throw error;
    }
  };

  export const GetIncomeSummary = async (year: number, month?: number) => {
    try {
      let url = `/dashboard/income-summary?year=${year}`;
      if (month) {
        url += `&month=${month}`;
      }

      const response = await AxiosInstance.get(url);
      return response;
    } catch (error) {
      throw error;
    }
  }

  export const GetExpenseSummary = async (year: number, month?: number) => {
    try {
      let url = `/dashboard/expense-summary?year=${year}`;
      if (month) {
        url += `&month=${month}`;
      }

      const response = await AxiosInstance.get(url);
      return response;
    } catch (error) {
      throw error;
    }
  }
}