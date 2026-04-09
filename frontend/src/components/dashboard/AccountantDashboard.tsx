"use client";

import React, { useState, useEffect } from "react";
import { useRole } from "@/context/RoleContext";
import { Header } from "@/components/dashboard/Header";
import { DashboardAPI } from "@/api/Dashboard/dashboardAPI";
import { CardsSkeleton, Skeleton } from "@/components/dashboard/Skeleton";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";

// API Response Type Definitions
interface ApiResponse<T> {
  data: T;
  message?: string;
  status?: number;
}

interface IncomeExpenseSummaryData {
  year: number;
  monthly_data: {
    [key: string]: {
      income: number;
      expense: number;
      profit: number;
    };
  };
  month_names: string[];
  totals: {
    income: number;
    expense: number;
    profit: number;
  };
  graph: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      backgroundColor: string | string[];
      borderColor: string | string[];
      borderWidth: number;
    }[];
    title: string;
  };
}

interface IncomeSummaryData {
  summary: {
    year: number;
    month: number;
    category_summary: {
      [category: string]: number;
    };
  }[];
  graph: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      backgroundColor: string;
      borderColor: string;
      borderWidth: number;
    }[];
    title: string;
  };
  total: number;
}

interface ExpenseSummaryData {
  summary: {
    year: number;
    month: number;
    category_summary: {
      [category: string]: number;
    };
  }[];
  graph: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      backgroundColor: string;
      borderColor: string;
      borderWidth: number;
    }[];
    title: string;
  };
  total: number;
}

// Custom tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-100">
        <p className="font-medium text-gray-700">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color || entry.fill }}>
            {entry.name}: Rs.{entry.value?.toLocaleString()}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function AccountantDashboard() {
  const { role } = useRole();
  const [incomeExpenseSummaryData, setIncomeExpenseSummaryData] =
    useState<IncomeExpenseSummaryData | null>(null);
  const [incomeExpenseLoading, setIncomeExpenseLoading] = useState(true);
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [incomeSummaryData, setIncomeSummaryData] =
    useState<IncomeSummaryData | null>(null);
  const [incomeSummaryLoading, setIncomeSummaryLoading] = useState(true);
  const [expenseSummaryData, setExpenseSummaryData] =
    useState<ExpenseSummaryData | null>(null);
  const [expenseSummaryLoading, setExpenseSummaryLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedExpenseMonth, setSelectedExpenseMonth] = useState<number | null>(null);
  
  const monthNames = [
    "All Months",
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  // Fetch Income Expense Summary
  useEffect(() => {
    if (!role) return;
    const fetchIncomeExpenseSummary = async () => {
      setIncomeExpenseLoading(true);
      try {
        const response = (await DashboardAPI.GetIncomeExpenseSummary(
          selectedYear
        )) as ApiResponse<IncomeExpenseSummaryData>;
        if (response && response.data) {
          setIncomeExpenseSummaryData(response.data);
        }
      } catch (error) {
        console.error("Error fetching income expense summary:", error);
      } finally {
        setIncomeExpenseLoading(false);
      }
    };

    fetchIncomeExpenseSummary();
  }, [selectedYear, role]);

  // Fetch Income Summary
  useEffect(() => {
    if (!role) return;
    const fetchIncomeSummary = async () => {
      setIncomeSummaryLoading(true);
      try {
        const response = (await DashboardAPI.GetIncomeSummary(
          selectedYear,
          selectedMonth === null ? undefined : selectedMonth
        )) as ApiResponse<IncomeSummaryData>;
        if (response && response.data) {
          setIncomeSummaryData(response.data);
        }
      } catch (error) {
        console.error("Error fetching income summary:", error);
      } finally {
        setIncomeSummaryLoading(false);
      }
    };

    fetchIncomeSummary();
  }, [selectedYear, selectedMonth, role]);

  // Fetch Expense Summary
  useEffect(() => {
    if (!role) return;
    const fetchExpenseSummary = async () => {
      setExpenseSummaryLoading(true);
      try {
        const response = (await DashboardAPI.GetExpenseSummary(
          selectedYear,
          selectedExpenseMonth === null ? undefined : selectedExpenseMonth
        )) as ApiResponse<ExpenseSummaryData>;
        if (response && response.data) {
          setExpenseSummaryData(response.data);
        }
      } catch (error) {
        console.error("Error fetching expense summary:", error);
      } finally {
        setExpenseSummaryLoading(false);
      }
    };

    fetchExpenseSummary();
  }, [selectedYear, selectedExpenseMonth, role]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Header value="Accountant Dashboard" />
      <main className="container mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8">
          {/* Financial Summary Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="bg-white p-6 rounded-xl shadow-md border border-gray-100 hover:shadow-lg transition-shadow duration-300"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">
                {incomeExpenseSummaryData?.graph.title || "Financial Summary"}
              </h2>
              <div className="flex items-center bg-gray-100 p-2 rounded-lg">
                <label
                  htmlFor="year-select"
                  className="mr-2 text-sm font-medium text-gray-600"
                >
                  Select Year:
                </label>
                <select
                  id="year-select"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="bg-white border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  {Array.from({ length: 7 }, (_, i) => currentYear - 4 + i).map(
                    (year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>

            {/* Financial summary cards with improved styling */}
            {!incomeExpenseLoading && incomeExpenseSummaryData && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-gradient-to-r from-green-50 to-green-100 p-5 rounded-xl shadow-sm">
                  <div className="flex items-center">
                    <div className="p-3 rounded-full bg-green-500 text-white mr-4">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Income</p>
                      <p className="text-2xl font-bold text-green-600">
                        Rs.{incomeExpenseSummaryData.totals.income.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-red-50 to-red-100 p-5 rounded-xl shadow-sm">
                  <div className="flex items-center">
                    <div className="p-3 rounded-full bg-red-500 text-white mr-4">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Expense</p>
                      <p className="text-2xl font-bold text-red-600">
                        Rs.{incomeExpenseSummaryData.totals.expense.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-5 rounded-xl shadow-sm">
                  <div className="flex items-center">
                    <div className={`p-3 rounded-full ${incomeExpenseSummaryData.totals.profit >= 0 ? 'bg-blue-500' : 'bg-red-500'} text-white mr-4`}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={incomeExpenseSummaryData.totals.profit >= 0 
                          ? "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" 
                          : "M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"} />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Net Profit/Loss</p>
                      <p className={`text-2xl font-bold ${incomeExpenseSummaryData.totals.profit >= 0 ? "text-blue-600" : "text-red-600"}`}>
                        Rs.{incomeExpenseSummaryData.totals.profit.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="h-80">
              {incomeExpenseLoading ? (
                <div className="flex items-center justify-center h-full">
                  <CardsSkeleton />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={
                      incomeExpenseSummaryData?.graph.labels.map(
                        (month, index) => ({
                          name: month,
                          Income:
                            incomeExpenseSummaryData.graph.datasets[0].data[
                              index
                            ],
                          Expense:
                            incomeExpenseSummaryData.graph.datasets[1].data[
                              index
                            ],
                          Profit:
                            incomeExpenseSummaryData.graph.datasets[2].data[
                              index
                            ],
                        })
                      ) || []
                    }
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    barSize={20}
                    barGap={8}
                  >
                    <defs>
                      <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="rgba(0, 200, 83, 0.8)" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="rgba(0, 200, 83, 0.8)" stopOpacity={0.4}/>
                      </linearGradient>
                      <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="rgba(244, 67, 54, 0.8)" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="rgba(244, 67, 54, 0.8)" stopOpacity={0.4}/>
                      </linearGradient>
                      <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="rgba(33, 150, 243, 0.8)" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="rgba(33, 150, 243, 0.8)" stopOpacity={0.4}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconType="circle" />
                    <Bar
                      dataKey="Income"
                      fill="url(#colorIncome)"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="Expense"
                      fill="url(#colorExpense)"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="Profit"
                      fill="url(#colorProfit)"
                      radius={[4, 4, 0, 0]}
                      {...(Array.isArray(
                        incomeExpenseSummaryData?.graph.datasets[2]
                          .backgroundColor
                      ) && {
                        fill: undefined,
                        children: incomeExpenseSummaryData?.graph.labels.map(
                          (_, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={
                                Array.isArray(
                                  incomeExpenseSummaryData?.graph.datasets[2]
                                    .backgroundColor
                                )
                                  ? incomeExpenseSummaryData?.graph.datasets[2]
                                      .backgroundColor[index]
                                  : "rgba(33, 150, 243, 0.7)"
                              }
                            />
                          )
                        ),
                      })}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </motion.div>

          {/* Income Category Details Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="bg-white p-6 rounded-xl shadow-md border border-gray-100 hover:shadow-lg transition-shadow duration-300"
          >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800 mb-2 sm:mb-0">
                {incomeSummaryData?.graph.title || "Income Category Details for 2026"}
              </h2>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center bg-gray-100 p-2 rounded-lg">
                  <label
                    htmlFor="income-year-select"
                    className="mr-2 text-sm font-medium text-gray-600"
                  >
                    Year:
                  </label>
                  <select
                    id="income-year-select"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    className="bg-white border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    {Array.from(
                      { length: 7 },
                      (_, i) => currentYear - 4 + i
                    ).map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center bg-gray-100 p-2 rounded-lg">
                  <label
                    htmlFor="income-month-select"
                    className="mr-2 text-sm font-medium text-gray-600"
                  >
                    Month:
                  </label>
                  <select
                    id="income-month-select"
                    value={selectedMonth === null ? 0 : selectedMonth}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      setSelectedMonth(value === 0 ? null : value);
                    }}
                    className="bg-white border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    {monthNames.map((month, index) => (
                      <option key={index} value={index}>
                        {month}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Income summary total */}
            {!incomeSummaryLoading && incomeSummaryData && (
              <div className="mb-6 bg-gradient-to-r from-green-50 to-green-100 p-5 rounded-xl shadow-sm">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-green-500 text-white mr-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Total Income{" "}
                      {selectedMonth ? `for ${monthNames[selectedMonth]}` : ""}{" "}
                      {selectedYear}
                    </p>
                    <p className="text-2xl font-bold text-green-600">
                      Rs.{incomeSummaryData.total.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="h-80">
              {incomeSummaryLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Skeleton className="mb-4 h-16 w-full rounded-md" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={
                      incomeSummaryData?.graph.labels.map(
                        (category, index) => ({
                          name: category,
                          amount:
                            incomeSummaryData.graph.datasets[0].data[index],
                        })
                      ) || []
                    }
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    barSize={40}
                  >
                    <defs>
                      <linearGradient id="colorIncomeAmount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="rgba(0, 200, 83, 0.8)" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="rgba(0, 200, 83, 0.8)" stopOpacity={0.4}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconType="circle" />
                    <Bar
                      dataKey="amount"
                      name={
                        incomeSummaryData?.graph.datasets[0].label || "Amount"
                      }
                      fill="url(#colorIncomeAmount)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </motion.div>

          {/* Expense Category Details Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="bg-white p-6 rounded-xl shadow-md border border-gray-100 hover:shadow-lg transition-shadow duration-300"
          >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800 mb-2 sm:mb-0">
                {expenseSummaryData?.graph.title || "Expense Category Details for 2026"}
              </h2>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center bg-gray-100 p-2 rounded-lg">
                  <label
                    htmlFor="expense-year-select"
                    className="mr-2 text-sm font-medium text-gray-600"
                  >
                    Year:
                  </label>
                  <select
                    id="expense-year-select"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    className="bg-white border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    {Array.from(
                      { length: 7 },
                      (_, i) => currentYear - 4 + i
                    ).map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center bg-gray-100 p-2 rounded-lg">
                  <label
                    htmlFor="expense-month-select"
                    className="mr-2 text-sm font-medium text-gray-600"
                  >
                    Month:
                  </label>
                  <select
                    id="expense-month-select"
                    value={
                      selectedExpenseMonth === null ? 0 : selectedExpenseMonth
                    }
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      setSelectedExpenseMonth(value === 0 ? null : value);
                    }}
                    className="bg-white border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    {monthNames.map((month, index) => (
                      <option key={index} value={index}>
                        {month}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Expense summary total */}
            {!expenseSummaryLoading && expenseSummaryData && (
              <div className="mb-6 bg-gradient-to-r from-red-50 to-red-100 p-5 rounded-xl shadow-sm">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-red-500 text-white mr-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Total Expenses{" "}
                      {selectedExpenseMonth
                        ? `for ${monthNames[selectedExpenseMonth]}`
                        : ""}{" "}
                      {selectedYear}
                    </p>
                    <p className="text-2xl font-bold text-red-600">
                      Rs.{expenseSummaryData.total.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="h-80">
              {expenseSummaryLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Skeleton className="mb-4 h-16 w-full rounded-md" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={
                      expenseSummaryData?.graph.labels.map(
                        (category, index) => ({
                          name: category,
                          amount:
                            expenseSummaryData.graph.datasets[0].data[index],
                        })
                      ) || []
                    }
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    barSize={40}
                  >
                    <defs>
                      <linearGradient id="colorExpenseAmount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="rgba(244, 67, 54, 0.8)" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="rgba(244, 67, 54, 0.8)" stopOpacity={0.4}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconType="circle" />
                    <Bar
                      dataKey="amount"
                      name={
                        expenseSummaryData?.graph.datasets[0].label || "Expense"
                      }
                      fill="url(#colorExpenseAmount)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
