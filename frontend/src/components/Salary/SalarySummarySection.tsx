"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";
import { SalaryAPI, SalaryLedgerResponse } from "@/api/Salary/SalaryAPI";
import { CardsSkeleton } from "@/components/dashboard/Skeleton";
import { Users, TrendingUp, AlertCircle, DollarSign } from "lucide-react";

interface MonthlySalaryData {
  month: string;
  salary: number;
  allowance: number;
  deduction: number;
  paid: number;
  remaining: number;
}

interface SalarySummary {
  totalBaseSalary: number;
  totalAllowancePaid: number;
  totalDeductionsPaid: number;
  totalActuallyPaid: number;
  totalRemaining: number;
  totalTeachers: number;
  monthlyData: MonthlySalaryData[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-100">
        <p className="font-medium text-gray-700">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color }}>
            {entry.name}: Rs.{entry.value?.toLocaleString()}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const SalarySummarySection: React.FC = () => {
  const [salaryRecords, setSalaryRecords] = useState<SalaryLedgerResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [salarySummary, setSalarySummary] = useState<SalarySummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Process salary data
  const processSalaryData = (records: SalaryLedgerResponse[]) => {
    // Filter by selected year
    const yearRecords = records.filter((record) => record.year === selectedYear);

    // Calculate totals
    const totalBaseSalary = yearRecords.reduce((sum, record) => sum + Number(record.base_salary || 0), 0);
    const totalAllowancePaid = yearRecords.reduce((sum, record) => sum + Number(record.allowance_total || 0), 0);
    const totalDeductionsPaid = yearRecords.reduce((sum, record) => sum + Number(record.deduction_total || 0), 0);
    const totalActuallyPaid = yearRecords.reduce((sum, record) => sum + Number(record.total_paid || 0), 0);
    const totalRemaining = yearRecords.reduce((sum, record) => sum + Number(record.remaining || 0), 0);

    // Get unique teachers
    const uniqueTeachers = new Set(yearRecords.map((record) => record.teacher_id)).size;

    // Group by month
    const monthlyMap = new Map<number, { salary: number; allowance: number; deduction: number; paid: number; remaining: number }>();

    yearRecords.forEach((record) => {
      const existing = monthlyMap.get(record.month) || { salary: 0, allowance: 0, deduction: 0, paid: 0, remaining: 0 };
      const newData = {
        salary: existing.salary + Number(record.base_salary || 0),
        allowance: existing.allowance + Number(record.allowance_total || 0),
        deduction: existing.deduction + Number(record.deduction_total || 0),
        paid: existing.paid + Number(record.total_paid || 0),
        remaining: existing.remaining + Number(record.remaining || 0),
      };
      monthlyMap.set(record.month, newData);
      console.log(`Month ${record.month}:`, newData);
    });

    // Convert to array
    const monthlyData: MonthlySalaryData[] = [];
    for (let month = 1; month <= 12; month++) {
      const data = monthlyMap.get(month) || { salary: 0, allowance: 0, deduction: 0, paid: 0, remaining: 0 };
      monthlyData.push({
        month: monthNames[month - 1].slice(0, 3),
        salary: Math.round(data.salary),
        allowance: Math.round(data.allowance),
        deduction: Math.round(data.deduction),
        paid: Math.round(data.paid),
        remaining: Math.round(data.remaining),
      });
    }
    console.log("Monthly Data:", monthlyData);

    setSalarySummary({
      totalBaseSalary: Math.round(totalBaseSalary),
      totalAllowancePaid: Math.round(totalAllowancePaid),
      totalDeductionsPaid: Math.round(totalDeductionsPaid),
      totalActuallyPaid: Math.round(totalActuallyPaid),
      totalRemaining: Math.round(totalRemaining),
      totalTeachers: uniqueTeachers,
      monthlyData,
    });
  };

  // Fetch salary records
  useEffect(() => {
    const fetchSalaryRecords = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const records = await SalaryAPI.getAllSalaryLedgers();
        console.log("Fetched salary records:", records);
        setSalaryRecords(records);
        processSalaryData(records);
      } catch (error) {
        console.error("Error fetching salary records:", error);
        setError("Failed to load salary records");
        setSalaryRecords([]);
        setSalarySummary(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSalaryRecords();
  }, []);

  // Reprocess data when year changes
  useEffect(() => {
    if (salaryRecords.length > 0) {
      processSalaryData(salaryRecords);
    }
  }, [selectedYear]);

  // Get available years
  const availableYears = Array.from(
    new Set(salaryRecords.map((record) => record.year))
  ).sort((a, b) => b - a);

  if (availableYears.length === 0 && !isLoading) {
    availableYears.push(currentYear);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.6 }}
      className="bg-white p-6 rounded-xl shadow-md border border-gray-100 hover:shadow-lg transition-shadow duration-300"
    >
      {/* Header with title and year selector */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800">Salary Records & Summary</h2>
        <div className="flex items-center bg-gray-100 p-2 rounded-lg">
          <label htmlFor="salary-year-select" className="mr-2 text-sm font-medium text-gray-600">
            Select Year:
          </label>
          <select
            id="salary-year-select"
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="bg-white border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          >
            {availableYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      {!isLoading && salarySummary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {/* Total Teachers */}
          <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-xl shadow-sm min-w-0">
            <div className="flex flex-col items-start min-w-0">
              <div className="p-2 rounded-full bg-purple-500 text-white mb-2">
                <Users className="h-5 w-5" />
              </div>
              <p className="text-xs font-medium text-gray-600 truncate w-full">Total Teachers</p>
              <p className="text-lg font-bold text-purple-600">{salarySummary.totalTeachers}</p>
            </div>
          </div>

          {/* Total Base Salary */}
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-xl shadow-sm min-w-0">
            <div className="flex flex-col items-start min-w-0">
              <div className="p-2 rounded-full bg-blue-500 text-white mb-2">
                <DollarSign className="h-5 w-5" />
              </div>
              <p className="text-xs font-medium text-gray-600 truncate w-full">Total Base Salary</p>
              <p className="text-lg font-bold text-blue-600 truncate w-full">
                Rs.{salarySummary.totalBaseSalary.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Total Allowance Paid */}
          <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-xl shadow-sm min-w-0">
            <div className="flex flex-col items-start min-w-0">
              <div className="p-2 rounded-full bg-green-500 text-white mb-2">
                <TrendingUp className="h-5 w-5" />
              </div>
              <p className="text-xs font-medium text-gray-600 truncate w-full">Total Allowance</p>
              <p className="text-lg font-bold text-green-600 truncate w-full">
                Rs.{salarySummary.totalAllowancePaid.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Total Deductions */}
          <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-4 rounded-xl shadow-sm min-w-0">
            <div className="flex flex-col items-start min-w-0">
              <div className="p-2 rounded-full bg-orange-500 text-white mb-2">
                <AlertCircle className="h-5 w-5" />
              </div>
              <p className="text-xs font-medium text-gray-600 truncate w-full">Total Deductions</p>
              <p className="text-lg font-bold text-orange-600 truncate w-full">
                Rs.{salarySummary.totalDeductionsPaid.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Total Actually Paid */}
          <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 p-4 rounded-xl shadow-sm min-w-0">
            <div className="flex flex-col items-start min-w-0">
              <div className="p-2 rounded-full bg-indigo-500 text-white mb-2">
                <DollarSign className="h-5 w-5" />
              </div>
              <p className="text-xs font-medium text-gray-600 truncate w-full">Total Paid</p>
              <p className="text-lg font-bold text-indigo-600 truncate w-full">
                Rs.{salarySummary.totalActuallyPaid.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Total Remaining */}
          <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 p-4 rounded-xl shadow-sm min-w-0">
            <div className="flex flex-col items-start min-w-0">
              <div className="p-2 rounded-full bg-emerald-500 text-white mb-2">
                <DollarSign className="h-5 w-5" />
              </div>
              <p className="text-xs font-medium text-gray-600 truncate w-full">Total Remaining</p>
              <p className="text-lg font-bold text-emerald-600 truncate w-full">
                Rs.{salarySummary.totalRemaining.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center h-96">
          <CardsSkeleton />
        </div>
      )}

      {/* Error State */}
      {!isLoading && error && (
        <div className="flex items-center justify-center h-80 bg-red-50 rounded-lg">
          <div className="text-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12 text-red-400 mx-auto mb-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-red-600 font-medium">{error}</p>
            <p className="text-sm text-red-500 mt-2">Please try refreshing the page or contact support.</p>
          </div>
        </div>
      )}

      {/* Chart */}
      {!isLoading && !error && salarySummary && (
        <div className="space-y-6">
          {/* Monthly Trends Chart */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Monthly Salary Trends</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={salarySummary.monthlyData}
                  margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: "#6b7280", fontSize: 12 }}
                  />
                  <YAxis
                    tick={{ fill: "#6b7280", fontSize: 12 }}
                    tickFormatter={(value) => `Rs.${(value / 1000).toFixed(0)}K`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{ paddingTop: "20px" }}
                    iconType="square"
                  />
                  <Bar dataKey="salary" fill="#3b82f6" name="Base Salary" />
                  <Bar dataKey="allowance" fill="#10b981" name="Allowance" />
                  <Bar dataKey="deduction" fill="#f97316" name="Deductions" />
                  <Bar dataKey="paid" fill="#8b5cf6" name="Total Paid" />
                  <Bar dataKey="remaining" fill="#06b6d4" name="Total Remaining" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && (!salarySummary || salarySummary.totalTeachers === 0) && (
        <div className="flex flex-col items-center justify-center h-80 text-gray-500 space-y-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-16 w-16 text-gray-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <div className="text-center">
            <p className="text-lg font-medium text-gray-600">No salary records found for {selectedYear}</p>
            <p className="text-sm text-gray-400 mt-2">
              Salary records will appear here once you add salary data through the salary management pages.
            </p>
            <p className="text-xs text-gray-400 mt-3">
              Start by setting up teacher salaries or recording salary payments.
            </p>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default SalarySummarySection;
