import AxiosInstance from "@/api/axiosInterceptorInstance";
import {AddFeeModel} from "@/models/Fees/Fee";

// Export as a single API object
export const FeeAPI = {
  Create: async (AddFee: AddFeeModel) => {
    try {
      const response = await AxiosInstance.post<AddFeeModel>(
        "/fee/add_fee",
        JSON.stringify(AddFee),
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      console.log("API Response:", response);
      return response;
    } catch (error) {
      console.error("API Error:", error);
      throw error; 
    }
  },

  // New API for class fee status
  GetClassFeeStatus: async ({
    class_id,
    fee_month,
    fee_year,
  }: {
    class_id: number | string;
    fee_month: string;
    fee_year: string | number;
  }) => {
    try {
      const response = await AxiosInstance.get(
        `/fee/class-fee-status/${class_id}?fee_month=${fee_month}&fee_year=${fee_year}`
      );
      return response;
    } catch (error) {
      console.error("API Error:", error);
      throw error;
    }
  },

  // New API for filtering with all 5 filter parameters
  Filter: async ({
    student_id,
    class_id,
    fee_month,
    fee_year,
    fee_status,
  }: {
    student_id?: number;
    class_id?: number;
    fee_month?: string;
    fee_year?: string;
    fee_status?: string;
  }) => {
    try {
      const params = new URLSearchParams();
      if (student_id) params.append("student_id", String(student_id));
      if (class_id)   params.append("class_id",   String(class_id));
      if (fee_month)  params.append("fee_month",  fee_month);
      if (fee_year)   params.append("fee_year",   fee_year);
      if (fee_status) params.append("fee_status", fee_status);

      const response = await AxiosInstance.post(
        `/fee/filter/?${params.toString()}`
      );
      return response;
    } catch (error) {
      console.error("API Error:", error);
      throw error;
    }
  },

  // Update fee record - only paid fees can be edited
  Update: async (
    fee_id: number,
    updateData: {
      fee_amount?: number;
      fee_month?: string;
      fee_year?: string;
    }
  ) => {
    try {
      const response = await AxiosInstance.put(
        `/fee/update_fee/${fee_id}`,
        JSON.stringify(updateData),
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      console.log("Update Response:", response);
      return response;
    } catch (error) {
      console.error("API Error:", error);
      throw error;
    }
  },

  // Delete fee record
  Delete: async (fee_id: number) => {
    try {
      const response = await AxiosInstance.delete(
        `/fee/delete_fee/${fee_id}`
      );
      console.log("Delete Response:", response);
      return response;
    } catch (error) {
      console.error("API Error:", error);
      throw error;
    }
  },
};

// For backward compatibility, also export individual functions
export const { Create, GetClassFeeStatus, Filter, Update, Delete } = FeeAPI;