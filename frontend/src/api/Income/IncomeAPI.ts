import AxiosInstance from "@/api/axiosInterceptorInstance";
import { AddIncomeModel, CreateIncomeCat } from "@/models/income/income";

// Helper function to get standard headers
// const getHeaders = () => ({
//   "Content-Type": "application/json",
//   Authorization: `Bearer ${localStorage.getItem("access_token")}`,
// });

// Export as a single API object
export const IncomeAPI = {
  GetIncomeData: async (category_id: number) => {
    try {
      const response = await AxiosInstance.get(
        `/income/filter_income?category_id=${category_id}`
      );
      console.log("API Response:", response.data)
      return response;
    } catch (error) {
      console.error("API Error:", error);
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
      console.log("API Response:", response);
      return response;
    } catch (error) {
      console.error("API Error:", error);
      throw error; 
    }
  },

  GetIncomeCategory: async () => {
    try {
      const response = await AxiosInstance.get(
        "/income_cat_names/income-cat-names-all/"
      );
      // console.log("API Response:", response.data);
      return response;
    } catch (error) {
      console.error("API Error:", error);
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
      console.log("API Response:", response);
      return response;
    } catch (error) {
      console.error("API Error:", error);
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
      console.error("API Error:", error);
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
      console.log("API Response:", response);
      return response;
    } catch (error) {
      console.error("API Error:", error);
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
      console.error("API Error:", error);
      throw error;
    }
  }
};

// For backward compatibility, also export individual functions
export const { GetIncomeData, AddIncome, GetIncomeCategory, AddIncomeCategory, DeleteIncomeCategory } = IncomeAPI;