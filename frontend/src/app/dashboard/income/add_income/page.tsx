"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/dashboard/Header";
import { toast } from "sonner";
import { IncomeAPI as API } from "@/api/Income/IncomeAPI";
import { IncomeCategory, AddIncomeModel } from "@/models/income/income";
import { extractArrayData } from "@/utils/apiResponse";

const AddIncome = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<AddIncomeModel>();

  const [isLoading, setIsLoading] = useState(false);
  const [incomeCategory, setIncomeCategory] = useState<IncomeCategory[]>([]);

  useEffect(() => {
    getCategories();
  }, []);

  const getCategories = async () => {
    setIsLoading(true);
    try {
      const res = await API.GetIncomeCategory();
      const data = extractArrayData<IncomeCategory>(res).map((item) => ({
        income_cat_name_id: item.income_cat_name_id,
        income_cat_name: item.income_cat_name,
        created_at: item.created_at,
      }));
      setIncomeCategory(data); // Ensure this is an array
    } catch (error) {
      console.error("Error fetching income categories:", error);
      setIncomeCategory([]); // Fallback to an empty array
    } finally {
      setIsLoading(false);
    }
  };

  const AddIncomeFunction = async (data: AddIncomeModel) => {
    setIsLoading(true);
    try {
      const response = await API.AddIncome(data);
      if (response.status === 201) {
        toast.success("Income record added successfully");
        reset();
      } else {
        toast.error("Failed to add income record");
      }
    } catch (error) {
      console.error("Error adding income:", error);
      toast.error("Failed to add income record");
    } finally {
      setIsLoading(false);
    }
  }
  const onSubmit = async (data: AddIncomeModel) => {
    console.log("Form Data:", data);
    try {
      AddIncomeFunction(data);
      setIsLoading(true);
      // toast.success("Income record added successfully");
      reset();
    } catch (error) {
      console.error("Error adding income:", error);
      toast.error("Failed to add income record");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto w-auto px-2">
      <Header value="Add Income Record" />
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="bg-white dark:bg-background rounded-lg shadow-sm border border-gray-200 dark:border-secondary p-4 mt-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium dark:text-gray-300">
                Receipt Number
              </label>
              <Input
                type="number"
                {...register("recipt_number", {
                  valueAsNumber: true,
                  required: "Required",
                })}
                placeholder="Enter receipt number"
                className="h-9 text-sm"
              />
              {errors.recipt_number && (
                <span className="text-red-500 text-xs inline-block">
                  {errors.recipt_number.message}
                </span>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium dark:text-gray-300">
                Date
              </label>
              <Input
                type="date"
                {...register("date", { required: "Required" })}
                className="h-9 text-sm"
              />
              {errors.date && (
                <span className="text-red-500 text-xs inline-block">
                  {errors.date.message}
                </span>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium dark:text-gray-300">
                Category
              </label>
              <select
                {...register("category_id", {
                  valueAsNumber: true,
                  required: "Required",
                })}
                className="w-full border bg-white rounded-md h-9 px-3 text-sm focus:ring focus:ring-indigo-300 dark:bg-gray-800 dark:text-gray-300"
              >
                <option disabled value="">Select Category</option>
                {incomeCategory.map((category) => (
                  <option key={category.income_cat_name_id} value={category.income_cat_name_id}>
                    {category.income_cat_name}
                  </option>
                ))}
              </select>
              {errors.category_id && (
                <span className="text-red-500 text-xs inline-block">
                  {errors.category_id.message}
                </span>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium dark:text-gray-300">
                Source
              </label>
              <Input
                {...register("source", { required: "Required" })}
                placeholder="e.g. Donation, Sponsorship"
                className="h-9 text-sm"
              />
              {errors.source && (
                <span className="text-red-500 text-xs inline-block">
                  {errors.source.message}
                </span>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium dark:text-gray-300">
                Description
              </label>
              <Input
                {...register("description")}
                placeholder="Enter description"
                className="h-9 text-sm"
              />
              {errors.description && (
                <span className="text-red-500 text-xs inline-block">
                  {errors.description.message}
                </span>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium dark:text-gray-300">
                Contact
              </label>
              <Input
                {...register("contact")}
                placeholder="Enter contact"
                className="h-9 text-sm"
              />
              {errors.contact && (
                <span className="text-red-500 text-xs inline-block">
                  {errors.contact.message}
                </span>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium dark:text-gray-300">
                Amount
              </label>
              <Input
                type="number"
                {...register("amount", {
                  valueAsNumber: true,
                  required: "Required",
                  min: { value: 1, message: "Min: 1" },
                })}
                placeholder="Enter amount"
                className="h-9 text-sm"
              />
              {errors.amount && (
                <span className="text-red-500 text-xs inline-block">
                  {errors.amount.message}
                </span>
              )}
            </div>
          </div>

          <div className="mt-3 flex justify-end">
            <Button type="submit" disabled={isLoading} size="sm">
              {isLoading ? (
                <>
                  <div className="animate-spin h-3 w-3 mr-1 border-2 border-t-transparent rounded-full" />
                  Saving...
                </>
              ) : (
                "Add Income"
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AddIncome;
