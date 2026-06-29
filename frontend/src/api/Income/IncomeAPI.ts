import AxiosInstance from "@/api/axiosInterceptorInstance";
import { AddIncomeModel, CreateIncomeCat } from "@/models/income/income";

export const IncomeAPI = {
  GetAllIncomeData: async (page = 1, pageSize = 10) => {
    try {
      const response = await AxiosInstance.get("/income/all", {
        params: { page, page_size: pageSize },
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  GetIncomeData: async (category_id: number, page = 1, pageSize = 10) => {
    try {
      const response = await AxiosInstance.get(
        "/income/filter_income",
        {
          params: { category_id, page, page_size: pageSize },
        }
      );
      return response;
    } catch (error) {
      throw error;
    }
  },

  AddIncome: async (AddFee: AddIncomeModel) => {
    try {
      const response = await AxiosInstance.post<AddIncomeModel>(
        "/income/",
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

  GetIncomeCategory: async () => {
    try {
      const response = await AxiosInstance.get(
        "/income_cat_names/income-cat-names-all/"
      );
      return response;
    } catch (error) {
      throw error;
    }
  },

  AddIncomeCategory: async (AddIncomeCat: CreateIncomeCat) => {
    try {
      const response = await AxiosInstance.post<CreateIncomeCat>(
        "/income_cat_names/add_income_cat_name/",
        JSON.stringify(AddIncomeCat),
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

  DeleteIncomeCategory: async (income_cat_id: number) => {
    try {
      const response = await AxiosInstance.delete(
        `/income_cat_names/del/${income_cat_id}`
      );
      return response;
    } catch (error) {
      throw error;
    }
  },

  UpdateIncome: async (incomeId: number, incomeData: any) => {
    try {
      const response = await AxiosInstance.patch(
        `/income/update/${incomeId}`,
        JSON.stringify(incomeData),
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

  DeleteIncome: async (incomeId: number) => {
    try {
      const response = await AxiosInstance.delete(
        `/income/delete/${incomeId}`
      );
      return response;
    } catch (error) {
      throw error;
    }
  }
};

// For backward compatibility, also export individual functions
export const { GetIncomeData, AddIncome, GetIncomeCategory, AddIncomeCategory, DeleteIncomeCategory } = IncomeAPI;