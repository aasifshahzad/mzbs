"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Header } from "@/components/dashboard/Header";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { TeacherNameAPI } from "@/api/Teacher/TeachetAPI";
import { TeacherModel } from "@/models/teacher/Teacher";
import { SalaryAPI, SalaryPaymentCreate, AllowanceCreate, DeductionCreate } from "@/api/Salary/SalaryAPI";
import { ChevronDown, ChevronUp } from "lucide-react";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const DEDUCTION_TYPES = [
  "Late Fine",
  "Leave Deduction",
  "Advance Adjustment",
  "Loan Deduction",
  "Other"
];

interface PaySalaryForm {
  teacher_id: string;
  amount: string;
  payment_date: string;
}

interface PayAllowanceForm {
  teacher_id: string;
  month: string;
  year: string;
  amount: string;
  reason: string;
}

interface DeductAmountForm {
  teacher_id: string;
  month: string;
  year: string;
  amount: string;
  type: string;
  reason: string;
}

const ManageSalary = () => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PaySalaryForm>();

  const {
    register: registerAllowance,
    handleSubmit: handleSubmitAllowance,
    reset: resetAllowance,
    formState: { errors: errorsAllowance },
  } = useForm<PayAllowanceForm>({
    defaultValues: {
      year: new Date().getFullYear().toString(),
      month: (new Date().getMonth() + 1).toString(),
    },
  });

  const {
    register: registerDeduction,
    handleSubmit: handleSubmitDeduction,
    reset: resetDeduction,
    formState: { errors: errorsDeduction },
  } = useForm<DeductAmountForm>({
    defaultValues: {
      year: new Date().getFullYear().toString(),
      month: (new Date().getMonth() + 1).toString(),
      type: "",
      reason: "",
    },
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingAllowance, setIsLoadingAllowance] = useState(false);
  const [isLoadingDeduction, setIsLoadingDeduction] = useState(false);
  const [teachers, setTeachers] = useState<TeacherModel[]>([]);
  const [isFetchingTeachers, setIsFetchingTeachers] = useState(true);

  // Section expand/collapse states
  const [isPaySalaryExpanded, setIsPaySalaryExpanded] = useState(true);
  const [isPayAllowanceExpanded, setIsPayAllowanceExpanded] = useState(false);
  const [isDeductAmountExpanded, setIsDeductAmountExpanded] = useState(false);

  const fetchTeachers = async () => {
    try {
      setIsFetchingTeachers(true);
      const response = await TeacherNameAPI.Get();
      console.log("Teacher API Response:", response);
      
      if (response && response.data) {
        let teachersList: TeacherModel[] = [];
        
        if (Array.isArray(response.data)) {
          teachersList = response.data;
        } else if (response.data && typeof response.data === 'object') {
          teachersList = [response.data as TeacherModel];
        }
        
        console.log("Processed Teachers List:", teachersList);
        setTeachers(teachersList);
        
        if (teachersList.length === 0) {
          toast.warning("No teachers found");
        }
      } else {
        console.warn("No data in response:", response);
        toast.error("Failed to load teachers");
      }
    } catch (error) {
      console.error("Error fetching teachers:", error);
      toast.error("Failed to load teachers");
      setTeachers([]);
    } finally {
      setIsFetchingTeachers(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  const onSubmit = async (data: PaySalaryForm) => {
    setIsLoading(true);
    try {
      const selectedTeacher = teachers.find(
        (t) => t.teacher_name_id.toString() === data.teacher_id
      );

      if (!selectedTeacher) {
        toast.error("Please select a valid teacher");
        setIsLoading(false);
        return;
      }

      if (!data.amount || isNaN(parseFloat(data.amount)) || !Number.isInteger(Number(data.amount))) {
        toast.error("Please enter a valid integer payment amount");
        setIsLoading(false);
        return;
      }

      // Ensure ledger exists for current month/year, or create it
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1; // JavaScript months are 0-based
      const currentYear = currentDate.getFullYear();

      // Ensure ledger exists for this teacher/month/year
      const ledger = await SalaryAPI.ensureTeacherLedger(
        parseInt(data.teacher_id),
        currentMonth,
        currentYear
      );

      // Create salary payment
      const paymentData: SalaryPaymentCreate = {
        teacher_id: parseInt(data.teacher_id),
        ledger_id: ledger.id,
        amount: parseFloat(data.amount),
        payment_date: data.payment_date,
      };

      await SalaryAPI.createSalaryPayment(paymentData);
      toast.success("Salary payment recorded successfully!");

      // Reset form
      reset();
    } catch (error) {
      console.error("Error recording salary payment:", error);
      toast.error("Failed to record salary payment");
    } finally {
      setIsLoading(false);
    }
  };

  const onAllowanceSubmit = async (data: PayAllowanceForm) => {
    setIsLoadingAllowance(true);
    try {
      const selectedTeacher = teachers.find(
        (t) => t.teacher_name_id.toString() === data.teacher_id
      );

      if (!selectedTeacher) {
        toast.error("Please select a valid teacher");
        setIsLoadingAllowance(false);
        return;
      }

      if (!data.amount || isNaN(parseFloat(data.amount)) || !Number.isInteger(Number(data.amount))) {
        toast.error("Please enter a valid integer allowance amount");
        setIsLoadingAllowance(false);
        return;
      }

      // Create allowance record
      const allowanceData: AllowanceCreate = {
        teacher_id: parseInt(data.teacher_id),
        month: parseInt(data.month),
        year: parseInt(data.year),
        amount: parseFloat(data.amount),
        reason: data.reason || undefined,
      };

      await SalaryAPI.createAllowance(allowanceData);
      toast.success("Allowance recorded successfully!");

      // Reset form
      resetAllowance({
        year: new Date().getFullYear().toString(),
        month: (new Date().getMonth() + 1).toString()
      });
    } catch (error) {
      console.error("Error recording allowance:", error);
      toast.error("Failed to record allowance");
    } finally {
      setIsLoadingAllowance(false);
    }
  };

  const onDeductionSubmit = async (data: DeductAmountForm) => {
    setIsLoadingDeduction(true);
    try {
      const selectedTeacher = teachers.find(
        (t) => t.teacher_name_id.toString() === data.teacher_id
      );

      if (!selectedTeacher) {
        toast.error("Please select a valid teacher");
        setIsLoadingDeduction(false);
        return;
      }

      if (!data.amount || isNaN(parseFloat(data.amount)) || !Number.isInteger(Number(data.amount))) {
        toast.error("Please enter a valid integer deduction amount");
        setIsLoadingDeduction(false);
        return;
      }

      if (!data.type) {
        toast.error("Please select a deduction type");
        setIsLoadingDeduction(false);
        return;
      }

      // Create deduction record
      const deductionData: DeductionCreate = {
        teacher_id: parseInt(data.teacher_id),
        month: parseInt(data.month),
        year: parseInt(data.year),
        amount: parseFloat(data.amount),
        type: data.type,
        reason: data.reason || undefined,
      };

      await SalaryAPI.createDeduction(deductionData);
      toast.success("Deduction applied successfully!");

      // Reset form
      resetDeduction({
        year: new Date().getFullYear().toString(),
        month: (new Date().getMonth() + 1).toString(),
        type: "",
        reason: "",
      });
    } catch (error) {
      console.error("Error applying deduction:", error);
      toast.error("Failed to apply deduction");
    } finally {
      setIsLoadingDeduction(false);
    }
  };

  return (
    <div className="w-full">
      <Header value="Manage Salary" />
      
      <div className="p-4 sm:p-6 space-y-6">
        {/* Pay Salary Section */}
        <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-md p-4 sm:p-6">
          <button
            onClick={() => setIsPaySalaryExpanded(!isPaySalaryExpanded)}
            className="w-full flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-neutral-800 rounded-lg p-2 -m-2 mb-4"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Pay Salary
            </h3>
            {isPaySalaryExpanded ? (
              <ChevronUp className="h-5 w-5 text-gray-500" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-500" />
            )}
          </button>
          
          {isPaySalaryExpanded && (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Teacher Name Dropdown */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-200">
                Teacher Name
              </label>
              <select
                {...register("teacher_id", {
                  required: "Teacher is required",
                })}
                disabled={isFetchingTeachers}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-neutral-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">
                  {isFetchingTeachers ? "Loading teachers..." : teachers.length === 0 ? "No teachers available" : "Choose a teacher"}
                </option>
                {teachers && teachers.length > 0 && teachers.map((teacher) => (
                  <option 
                    key={teacher.teacher_name_id} 
                    value={String(teacher.teacher_name_id)}
                  >
                    {teacher.teacher_name}
                  </option>
                ))}
              </select>
              {errors.teacher_id && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors.teacher_id.message}
                </p>
              )}
            </div>

            {/* Payment Amount */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-200">
                Payment Amount
              </label>
              <Input
                type="number"
                step="1"
                placeholder="Enter payment amount"
                {...register("amount", {
                  required: "Payment amount is required",
                  pattern: {
                    value: /^[0-9]+$/,
                    message: "Amount must be a valid integer",
                  },
                })}
                className="w-full"
              />
              {errors.amount && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors.amount.message}
                </p>
              )}
            </div>

            {/* Payment Date */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-200">
                Payment Date
              </label>
              <Input
                type="date"
                {...register("payment_date", {
                  required: "Payment date is required",
                })}
                className="w-full"
              />
              {errors.payment_date && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors.payment_date.message}
                </p>
              )}
            </div>

            {/* Button */}
            <div className="flex gap-4">
              <Button type="submit" disabled={isLoading || isFetchingTeachers} className="px-6">
                {isLoading ? "Recording..." : "Pay"}
              </Button>
            </div>
          </form>
          )}
        </div>

        {/* Pay Allowance Section */}
        <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-md p-4 sm:p-6">
          <button
            onClick={() => setIsPayAllowanceExpanded(!isPayAllowanceExpanded)}
            className="w-full flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-neutral-800 rounded-lg p-2 -m-2 mb-4"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Pay Allowance
            </h3>
            {isPayAllowanceExpanded ? (
              <ChevronUp className="h-5 w-5 text-gray-500" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-500" />
            )}
          </button>
          
          {isPayAllowanceExpanded && (
            <form onSubmit={handleSubmitAllowance(onAllowanceSubmit)} className="space-y-4">
            {/* Teacher Name Dropdown */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-200">
                Teacher Name
              </label>
              <select
                {...registerAllowance("teacher_id", {
                  required: "Teacher is required",
                })}
                disabled={isFetchingTeachers}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-neutral-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">
                  {isFetchingTeachers ? "Loading teachers..." : teachers.length === 0 ? "No teachers available" : "Choose a teacher"}
                </option>
                {teachers && teachers.length > 0 && teachers.map((teacher) => (
                  <option 
                    key={teacher.teacher_name_id} 
                    value={String(teacher.teacher_name_id)}
                  >
                    {teacher.teacher_name}
                  </option>
                ))}
              </select>
              {errorsAllowance.teacher_id && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errorsAllowance.teacher_id.message}
                </p>
              )}
            </div>

            {/* Month Dropdown */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-200">
                Month
              </label>
              <select
                {...registerAllowance("month", {
                  required: "Month is required",
                })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-neutral-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select a month</option>
                {MONTHS.map((month, index) => (
                  <option key={index} value={(index + 1).toString()}>
                    {month}
                  </option>
                ))}
              </select>
              {errorsAllowance.month && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errorsAllowance.month.message}
                </p>
              )}
            </div>

            {/* Year Field */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-200">
                Year
              </label>
              <Input
                type="number"
                placeholder="Enter year"
                {...registerAllowance("year", {
                  required: "Year is required",
                  pattern: {
                    value: /^\d{4}$/,
                    message: "Please enter a valid year (YYYY)",
                  },
                })}
                className="w-full"
              />
              {errorsAllowance.year && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errorsAllowance.year.message}
                </p>
              )}
            </div>

            {/* Allowance Amount */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-200">
                Allowance Amount
              </label>
              <Input
                type="number"
                step="1"
                placeholder="Enter allowance amount"
                {...registerAllowance("amount", {
                  required: "Allowance amount is required",
                  pattern: {
                    value: /^[0-9]+$/,
                    message: "Amount must be a valid integer",
                  },
                })}
                className="w-full"
              />
              {errorsAllowance.amount && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errorsAllowance.amount.message}
                </p>
              )}
            </div>

            {/* Reason */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-200">
                Reason (Optional)
              </label>
              <Input
                type="text"
                placeholder="Enter reason for allowance"
                {...registerAllowance("reason")}
                className="w-full"
              />
            </div>

            {/* Button */}
            <div className="flex gap-4">
              <Button type="submit" disabled={isLoadingAllowance || isFetchingTeachers} className="px-6">
                {isLoadingAllowance ? "Recording..." : "Pay"}
              </Button>
            </div>
          </form>
          )}
        </div>

        {/* Deduct Amount Section */}
        <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-md p-4 sm:p-6">
          <button
            onClick={() => setIsDeductAmountExpanded(!isDeductAmountExpanded)}
            className="w-full flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-neutral-800 rounded-lg p-2 -m-2 mb-4"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Deduct Amount
            </h3>
            {isDeductAmountExpanded ? (
              <ChevronUp className="h-5 w-5 text-gray-500" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-500" />
            )}
          </button>
          
          {isDeductAmountExpanded && (
            <form onSubmit={handleSubmitDeduction(onDeductionSubmit)} className="space-y-4">
            {/* Teacher Name Dropdown */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-200">
                Teacher Name
              </label>
              <select
                {...registerDeduction("teacher_id", {
                  required: "Teacher is required",
                })}
                disabled={isFetchingTeachers}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-neutral-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">
                  {isFetchingTeachers ? "Loading teachers..." : teachers.length === 0 ? "No teachers available" : "Choose a teacher"}
                </option>
                {teachers && teachers.length > 0 && teachers.map((teacher) => (
                  <option 
                    key={teacher.teacher_name_id} 
                    value={String(teacher.teacher_name_id)}
                  >
                    {teacher.teacher_name}
                  </option>
                ))}
              </select>
              {errorsDeduction.teacher_id && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errorsDeduction.teacher_id.message}
                </p>
              )}
            </div>

            {/* Month Dropdown */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-200">
                Month
              </label>
              <select
                {...registerDeduction("month", {
                  required: "Month is required",
                })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-neutral-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select a month</option>
                {MONTHS.map((month, index) => (
                  <option key={index} value={(index + 1).toString()}>
                    {month}
                  </option>
                ))}
              </select>
              {errorsDeduction.month && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errorsDeduction.month.message}
                </p>
              )}
            </div>

            {/* Year Field */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-200">
                Year
              </label>
              <Input
                type="number"
                placeholder="Enter year"
                {...registerDeduction("year", {
                  required: "Year is required",
                  pattern: {
                    value: /^\d{4}$/,
                    message: "Please enter a valid year (YYYY)",
                  },
                })}
                className="w-full"
              />
              {errorsDeduction.year && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errorsDeduction.year.message}
                </p>
              )}
            </div>

            {/* Deduction Amount */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-200">
                Deduction Amount
              </label>
              <Input
                type="number"
                step="1"
                placeholder="Enter deduction amount"
                {...registerDeduction("amount", {
                  required: "Deduction amount is required",
                  pattern: {
                    value: /^[0-9]+$/,
                    message: "Amount must be a valid integer",
                  },
                })}
                className="w-full"
              />
              {errorsDeduction.amount && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errorsDeduction.amount.message}
                </p>
              )}
            </div>

            {/* Deduction Type Dropdown */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-200">
                Deduction Type
              </label>
              <select
                {...registerDeduction("type", {
                  required: "Deduction type is required",
                })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-neutral-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select deduction type</option>
                {DEDUCTION_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              {errorsDeduction.type && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errorsDeduction.type.message}
                </p>
              )}
            </div>

            {/* Reason / Description - Optional */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-200">
                Reason / Description
                <span className="text-gray-500 ml-1">(Optional)</span>
              </label>
              <textarea
                {...registerDeduction("reason")}
                placeholder="Example: Absent for 3 days / Advance salary recovery"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-neutral-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                rows={3}
              />
            </div>

            {/* Button */}
            <div className="flex gap-4">
              <Button type="submit" disabled={isLoadingDeduction || isFetchingTeachers} className="px-6">
                {isLoadingDeduction ? "Applying..." : "Apply Deduction"}
              </Button>
            </div>
          </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManageSalary;
