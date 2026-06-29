import AxiosInstance from "@/api/axiosInterceptorInstance";
import {AddFeeModel} from "@/models/Fees/Fee";

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
      return response;
    } catch (error) {
      throw error;
    }
  },

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
      throw error;
    }
  },

  Filter: async ({
    student_id,
    class_id,
    fee_month,
    fee_year,
    fee_status,
    page,
    page_size,
  }: {
    student_id?: number;
    class_id?: number;
    fee_month?: string;
    fee_year?: string;
    fee_status?: string;
    page?: number;
    page_size?: number;
  }) => {
    try {
      const params = new URLSearchParams();
      if (student_id) params.append("student_id", String(student_id));
      if (class_id)   params.append("class_id",   String(class_id));
      if (fee_month)  params.append("fee_month",  fee_month);
      if (fee_year)   params.append("fee_year",   fee_year);
      if (fee_status) params.append("fee_status", fee_status);
      if (page)       params.append("page",       String(page));
      if (page_size)  params.append("page_size",  String(page_size));

      const response = await AxiosInstance.post(
        `/fee/filter/?${params.toString()}`
      );
      return response;
    } catch (error) {
      throw error;
    }
  },

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
      return response;
    } catch (error) {
      throw error;
    }
  },

  Delete: async (fee_id: number) => {
    try {
      const response = await AxiosInstance.delete(
        `/fee/delete_fee/${fee_id}`
      );
      return response;
    } catch (error) {
      throw error;
    }
  },
};

// For backward compatibility, also export individual functions
export const { Create, GetClassFeeStatus, Filter, Update, Delete } = FeeAPI;