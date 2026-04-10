"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/dashboard/Header";
import { toast } from "sonner";
import { ExpenseAPI as API } from "@/api/Expense/ExpenseAPI";
import { AddExpenseModel, ExpenseCategory } from "@/models/expense/expense";
import { AxiosResponse } from "axios";

const AddExpense = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<AddExpenseModel>();

  const [isLoading, setIsLoading] = useState(false);
  const [expenseCategory, setExpenseCategory] = useState<ExpenseCategory[]>([]);

  useEffect(() => {
    getCategories();
  }, []);

  const getCategories = async () => {
    setIsLoading(true);
    try {
      const res: AxiosResponse<ExpenseCategory[]> = await API.GetExpenseCategory();
      const data = res.data.map((item: ExpenseCategory) => ({
        expense_cat_name_id: item.expense_cat_name_id,
        expense_cat_name: item.expense_cat_name,
      }));
      // console.log("Categories:", data);
      setExpenseCategory(data); // Ensure this is an array
    } catch (error) {
      console.error("Error fetching expense categories:", error);
      setExpenseCategory([]); // Fallback to an empty array
    } finally {
      setIsLoading(false);
    }
  };

  const AddExpenseFunction = async (data: AddExpenseModel) => {
    setIsLoading(true);
    try {
      // Convert empty strings to null for optional fields
      const cleanedData = {
        ...data,
        description: data.description === '' ? null : data.description,
      };
      const response = await API.AddExpense(cleanedData);
      if (response.status === 200 || response.status === 201) {
        toast.success("expense record added successfully");
        reset();
      } else {
        toast.error("Failed to add expense record");
      }
    } catch (error) {
      console.error("Error adding expense:", error);
      toast.error("Failed to add expense record");
    } finally {
      setIsLoading(false);
    }
  };
  const onSubmit = async (data: AddExpenseModel) => {
    console.log("Form Data:", data);
    await AddExpenseFunction(data);
  };

  return (
    <div className="mx-auto w-auto px-2 sm:px-4">
      <Header value="Add Expense Record" />
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="bg-white dark:bg-background rounded-xl shadow-sm border border-gray-200 dark:border-secondary p-3 sm:p-6 mt-2 sm:mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
            <div className="space-y-1 sm:space-y-2">
              <label className="font-medium text-xs sm:text-sm dark:text-gray-300">
                Receipt Number
              </label>
              <Input
                type="number"
                {...register("recipt_number", {
                  valueAsNumber: true,
                  required: "Receipt number is required",
                })}
                placeholder="Enter receipt number"
                className="h-8 sm:h-10 text-sm"
              />
              <p className="text-red-500 text-xs">
                {errors.recipt_number?.message}
              </p>
            </div>

            <div className="space-y-1 sm:space-y-2">
              <label className="font-medium text-xs sm:text-sm dark:text-gray-300">
                Date
              </label>
              <Input
                type="date"
                {...register("date", { required: "Date is required" })}
                className="h-8 sm:h-10 text-sm"
              />
              <p className="text-red-500 text-xs">{errors.date?.message}</p>
            </div>

            <div className="space-y-1 sm:space-y-2">
              <label className="font-medium text-xs sm:text-sm dark:text-gray-300">
                Category
              </label>
              <select
                {...register("category_id", {
                  valueAsNumber: true,
                  required: "Category is required",
                })}
                className="w-full border bg-white rounded-md px-3 py-1 sm:py-2 h-8 sm:h-10 text-sm focus:ring focus:ring-indigo-300 dark:bg-gray-800 dark:text-gray-300"
              >
                <option disabled selected value="">
                  Select Category
                </option>
                {expenseCategory.map((category) => (
                  <option
                    key={category.expense_cat_name_id}
                    value={category.expense_cat_name_id}
                  >
                    {category.expense_cat_name}
                  </option>
                ))}
              </select>
              <p className="text-red-500 text-xs">
                {errors.category_id?.message}
              </p>
            </div>

            <div className="space-y-1 sm:space-y-2">
              <label className="font-medium text-xs sm:text-sm dark:text-gray-300">
                To Whom
              </label>
              <Input
                {...register("to_whom", { required: "Source is required" })}
                placeholder="e.g. Donation, Sponsorship"
                className="h-8 sm:h-10 text-sm"
              />
              <p className="text-red-500 text-xs">{errors.to_whom?.message}</p>
            </div>

            <div className="space-y-1 sm:space-y-2">
              <label className="font-medium text-xs sm:text-sm dark:text-gray-300">
                Description
              </label>
              <Input
                {...register("description")}
                placeholder="Enter description"
                className="h-8 sm:h-10 text-sm"
              />
              <p className="text-red-500 text-xs">
                {errors.description?.message}
              </p>
            </div>

            <div className="space-y-1 sm:space-y-2">
              <label className="font-medium text-xs sm:text-sm dark:text-gray-300">
                Amount
              </label>
              <Input
                type="number"
                {...register("amount", {
                  valueAsNumber: true,
                  required: "Amount is required",
                  min: { value: 1, message: "Amount must be at least 1" },
                })}
                placeholder="Enter amount"
                className="h-8 sm:h-10 text-sm"
              />
              <p className="text-red-500 text-xs">{errors.amount?.message}</p>
            </div>
          </div>

          <div className="mt-4 sm:mt-6 flex justify-end">
            <Button type="submit" disabled={isLoading} className="h-8 sm:h-10 text-sm px-3 sm:px-4">
              {isLoading ? (
                <>
                  <div className="animate-spin h-3 w-3 sm:h-4 sm:w-4 mr-2 border-2 border-t-transparent rounded-full" />
                  Saving...
                </>
              ) : (
                "Add expense"
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AddExpense;
