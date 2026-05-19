"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { SalaryAPI, SalaryLedgerResponse, TeacherSalaryResponse } from "@/api/Salary/SalaryAPI";
import { CardsSkeleton } from "@/components/dashboard/Skeleton";
import { Users, TrendingUp, AlertCircle, DollarSign, RefreshCw } from "lucide-react";

interface MonthlySalaryData {
  month: string;
  payable: number;
  allowance: number;
  deduction: number;
  netSalary: number;
  paid: number;
  remaining: number;
}

interface SalarySummary {
  totalTeachers: number;
  totalBaseSalary: number;
  totalPayable: number;
  totalAllowance: number;
  totalDeduction: number;
  totalNetSalary: number;
  totalActuallyPaid: number;
  totalRemaining: number;
  monthlyData: MonthlySalaryData[];
}

interface MonthRange {
  startMonth: number;
  endMonth: number;
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
  const [isLoading, setIsLoading] = useState(true);
  const [salarySummary, setSalarySummary] = useState<SalarySummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [allTeachers, setAllTeachers] = useState<TeacherSalaryResponse[]>([]);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const currentMonth = new Date().getMonth() + 1;

  // Get days in month
  const getDaysInMonth = (year: number, month: number): number => {
    return new Date(year, month, 0).getDate();
  };

  const getVisibleMonthRange = (
    effectiveDate: string,
    year: number,
    maxMonth: number
  ): MonthRange | null => {
    if (!effectiveDate) {
      return null;
    }

    const startDate = new Date(effectiveDate);
    if (isNaN(startDate.getTime())) {
      return null;
    }

    const effectiveYear = startDate.getFullYear();
    const effectiveMonth = startDate.getMonth() + 1;

    if (year < effectiveYear) {
      return null;
    }

    const startMonth = year === effectiveYear ? effectiveMonth : 1;
    if (startMonth > maxMonth) {
      return null;
    }

    return {
      startMonth,
      endMonth: maxMonth,
    };
  };

  const calculateMonthlyPayable = (
    baseSalary: number,
    effectiveDate: string,
    year: number,
    month: number,
    maxMonth: number
  ): number => {
    baseSalary = Number(baseSalary) || 0;
    if (baseSalary <= 0 || !effectiveDate) {
      return 0;
    }

    try {
      const startDate = new Date(effectiveDate);
      if (isNaN(startDate.getTime())) {
        return 0;
      }

      const visibleRange = getVisibleMonthRange(effectiveDate, year, maxMonth);
      if (!visibleRange || month < visibleRange.startMonth || month > visibleRange.endMonth) {
        return 0;
      }

      const workedDaysStart = month === visibleRange.startMonth && year === startDate.getFullYear()
        ? Math.max(1, startDate.getDate())
        : 1;
      const workedDaysEnd = getDaysInMonth(year, month);
      const workedDaysInMonth = workedDaysEnd - workedDaysStart + 1;
      const perDaySalary = baseSalary / workedDaysEnd;

      return Math.round((perDaySalary * workedDaysInMonth) * 100) / 100;
    } catch (error) {
      console.error("Error calculating monthly payable:", error);
      return 0;
    }
  };

  // Calculate Total Payable using Actual Days Method
  const calculateTotalPayable = (baseSalary: number, effectiveDate: string, year: number, maxMonth: number): number => {
    const visibleRange = getVisibleMonthRange(effectiveDate, year, maxMonth);
    if (!visibleRange) {
      return 0;
    }

    let totalPayable = 0;
    for (let month = visibleRange.startMonth; month <= visibleRange.endMonth; month += 1) {
      totalPayable += calculateMonthlyPayable(baseSalary, effectiveDate, year, month, maxMonth);
    }

    return Math.round(totalPayable * 100) / 100;
  };

  const getChartStartMonth = (teachers: TeacherSalaryResponse[], year: number, maxMonth: number): number => {
    const effectiveMonths = teachers
      .map((teacher) => {
        const date = new Date(teacher.effective_from);
        if (isNaN(date.getTime()) || date.getFullYear() !== year) {
          return null;
        }
        return date.getMonth() + 1;
      })
      .filter((month): month is number => month !== null);

    if (effectiveMonths.length === 0) {
      return 1;
    }

    return Math.min(Math.min(...effectiveMonths), maxMonth);
  };

  // Process salary data using LEFT JOIN pattern
  const processSalaryData = (teachers: TeacherSalaryResponse[], ledgers: SalaryLedgerResponse[]) => {
    // ============================================================
    // STEP 1: Initialize with ALL teachers from salary records
    // ============================================================
    const aggregatedData = new Map<number, {
      teacherName: string;
      baseSalary: number;
      effectiveDate: string;
      monthlyPayables: Map<number, number>;
      monthlyAllowances: Map<number, number>;
      monthlyDeductions: Map<number, number>;
      monthlyPaid: Map<number, number>;
    }>();

    // Initialize with all teachers
    teachers.forEach((teacher) => {
      aggregatedData.set(teacher.teacher_id, {
        teacherName: teacher.teacher_name || "Unknown",
        baseSalary: Number(teacher.base_salary) || 0,
        effectiveDate: teacher.effective_from || new Date().toISOString(),
        monthlyPayables: new Map(),
        monthlyAllowances: new Map(),
        monthlyDeductions: new Map(),
        monthlyPaid: new Map(),
      });
    });

    // ============================================================
    // STEP 2: Merge ledger data (LEFT JOIN with ledger table)
    // ============================================================
    ledgers.forEach((ledger: SalaryLedgerResponse) => {
      if (ledger.year !== selectedYear) {
        return;
      }

      if (!aggregatedData.has(ledger.teacher_id)) {
        aggregatedData.set(ledger.teacher_id, {
          teacherName: ledger.teacher_name || "Unknown",
          baseSalary: Number(ledger.base_salary) || 0,
          effectiveDate: new Date().toISOString(),
          monthlyPayables: new Map(),
          monthlyAllowances: new Map(),
          monthlyDeductions: new Map(),
          monthlyPaid: new Map(),
        });
      }

      const existing = aggregatedData.get(ledger.teacher_id)!;
      const month = ledger.month;
      
      existing.monthlyAllowances.set(month, (existing.monthlyAllowances.get(month) || 0) + (Number(ledger.allowance_total) || 0));
      existing.monthlyDeductions.set(month, (existing.monthlyDeductions.get(month) || 0) + (Number(ledger.deduction_total) || 0));
      existing.monthlyPaid.set(month, (existing.monthlyPaid.get(month) || 0) + (Number(ledger.total_paid) || 0));
    });

    // ============================================================
    // STEP 3: Calculate aggregated totals
    // ============================================================
    let totalTeachers = aggregatedData.size;
    let totalBaseSalary = 0;
    let totalPayable = 0;
    let totalAllowance = 0;
    let totalDeduction = 0;
    let totalNetSalary = 0;
    let totalPaid = 0;
    let totalRemaining = 0;

    const monthlyMap = new Map<number, { payable: number; allowance: number; deduction: number; netSalary: number; paid: number; remaining: number }>();
    const maxMonth = selectedYear === currentYear ? currentMonth : 12;
    const chartStartMonth = getChartStartMonth(teachers, selectedYear, maxMonth);
    let hasVisibleData = false;

    aggregatedData.forEach((data) => {
      const baseSalary = data.baseSalary || 0;
      totalBaseSalary += baseSalary;

      const visibleRange = getVisibleMonthRange(data.effectiveDate, selectedYear, maxMonth);
      if (!visibleRange) {
        return;
      }

      hasVisibleData = true;

      // Calculate total payable for selected year
      const yearPayable = calculateTotalPayable(baseSalary, data.effectiveDate, selectedYear, maxMonth);
      totalPayable += yearPayable;

      // Calculate monthly payables for the selected year
      for (let month = visibleRange.startMonth; month <= visibleRange.endMonth; month += 1) {
        const monthPayable = calculateMonthlyPayable(baseSalary, data.effectiveDate, selectedYear, month, maxMonth);
        const allowance = data.monthlyAllowances.get(month) || 0;
        const deduction = data.monthlyDeductions.get(month) || 0;
        const paid = data.monthlyPaid.get(month) || 0;
        const netSalary = monthPayable + allowance - deduction;
        const remaining = netSalary - paid;

        totalAllowance += allowance;
        totalDeduction += deduction;
        totalNetSalary += netSalary;
        totalPaid += paid;
        totalRemaining += remaining;

        const existing = monthlyMap.get(month) || { payable: 0, allowance: 0, deduction: 0, netSalary: 0, paid: 0, remaining: 0 };
        monthlyMap.set(month, {
          payable: existing.payable + monthPayable,
          allowance: existing.allowance + allowance,
          deduction: existing.deduction + deduction,
          netSalary: existing.netSalary + netSalary,
          paid: existing.paid + paid,
          remaining: existing.remaining + remaining,
        });
      }
    });

    const monthlyData: MonthlySalaryData[] = [];
    const startMonth = hasVisibleData ? chartStartMonth : 1;
    for (let month = startMonth; month <= maxMonth; month += 1) {
      const data = monthlyMap.get(month) || { payable: 0, allowance: 0, deduction: 0, netSalary: 0, paid: 0, remaining: 0 };
      monthlyData.push({
        month: monthNames[month - 1].slice(0, 3),
        payable: Math.round(data.payable),
        allowance: Math.round(data.allowance),
        deduction: Math.round(data.deduction),
        netSalary: Math.round(data.netSalary),
        paid: Math.round(data.paid),
        remaining: Math.round(data.remaining),
      });
    }

    setSalarySummary({
      totalTeachers,
      totalBaseSalary: Math.round(totalBaseSalary),
      totalPayable: Math.round(totalPayable),
      totalAllowance: Math.round(totalAllowance),
      totalDeduction: Math.round(totalDeduction),
      totalNetSalary: Math.round(totalNetSalary),
      totalActuallyPaid: Math.round(totalPaid),
      totalRemaining: Math.round(totalRemaining),
      monthlyData,
    });
  };

  // Fetch salary data (exposed so header button can refresh)
  const fetchSalaryData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [teacherSalaries, ledgers] = await Promise.all([
        SalaryAPI.getAllTeacherSalaries(),
        SalaryAPI.getAllSalaryLedgers(),
      ]);

      setAllTeachers(teacherSalaries);
      processSalaryData(teacherSalaries, ledgers);
    } catch (error) {
      console.error("Error fetching salary data:", error);
      setError("Failed to load salary records");
      setSalarySummary(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load
  useEffect(() => { fetchSalaryData(); }, []);

  // Reprocess when year changes
  useEffect(() => {
    if (allTeachers.length > 0) {
      const fetchLedgers = async () => {
        try {
          const ledgers = await SalaryAPI.getAllSalaryLedgers();
          processSalaryData(allTeachers, ledgers);
        } catch (error) {
          console.error("Error fetching ledgers:", error);
        }
      };
      fetchLedgers();
    }
  }, [selectedYear, allTeachers]);

  // Get available years from teachers
  const availableYears = Array.from(
    new Set(
      allTeachers
        .map((teacher) => {
          const date = new Date(teacher.effective_from || new Date());
          return date.getFullYear();
        })
        .concat([currentYear])
    )
  ).sort((a, b) => b - a);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.6 }}
      className="bg-white p-6 rounded-xl shadow-md border border-gray-100 hover:shadow-lg transition-shadow duration-300"
    >
      {/* Header with title, year selector and refresh */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800">Salary Records & Summary</h2>
        <div className="flex items-center gap-2">
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
          <button
            onClick={() => fetchSalaryData()}
            title="Refresh"
            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition text-gray-500"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
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
              <p className="text-xs font-medium text-gray-600 truncate w-full">Total Payable</p>
              <p className="text-lg font-bold text-green-600 truncate w-full">
                Rs.{salarySummary.totalPayable.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Total Allowances */}
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-xl shadow-sm min-w-0">
            <div className="flex flex-col items-start min-w-0">
              <div className="p-2 rounded-full bg-blue-500 text-white mb-2">
                <TrendingUp className="h-5 w-5" />
              </div>
              <p className="text-xs font-medium text-gray-600 truncate w-full">Total Allowances</p>
              <p className="text-lg font-bold text-blue-600 truncate w-full">
                Rs.{salarySummary.totalAllowance.toLocaleString()}
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
                Rs.{salarySummary.totalDeduction.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Total Net Salary */}
          <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 p-4 rounded-xl shadow-sm min-w-0">
            <div className="flex flex-col items-start min-w-0">
              <div className="p-2 rounded-full bg-indigo-500 text-white mb-2">
                <DollarSign className="h-5 w-5" />
              </div>
              <p className="text-xs font-medium text-gray-600 truncate w-full">Total Net Salary</p>
              <p className="text-lg font-bold text-indigo-600 truncate w-full">
                Rs.{salarySummary.totalNetSalary.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Total Paid */}
          <div className="bg-gradient-to-r from-cyan-50 to-cyan-100 p-4 rounded-xl shadow-sm min-w-0">
            <div className="flex flex-col items-start min-w-0">
              <div className="p-2 rounded-full bg-cyan-500 text-white mb-2">
                <DollarSign className="h-5 w-5" />
              </div>
              <p className="text-xs font-medium text-gray-600 truncate w-full">Total Paid</p>
              <p className="text-lg font-bold text-cyan-600 truncate w-full">
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
                  <Bar dataKey="payable" fill="#3b82f6" name="Total Payable" />
                  <Bar dataKey="allowance" fill="#10b981" name="Allowances" />
                  <Bar dataKey="deduction" fill="#f97316" name="Deductions" />
                  <Bar dataKey="netSalary" fill="#8b5cf6" name="Net Salary" />
                  <Bar dataKey="paid" fill="#06b6d4" name="Paid Amount" />
                  <Bar dataKey="remaining" fill="#ec4899" name="Remaining Balance" />
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
