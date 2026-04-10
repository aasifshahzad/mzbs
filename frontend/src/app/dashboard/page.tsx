"use client";
import React, { useState, useEffect } from "react";
import { useRole } from "@/context/RoleContext";
import { TeacherDashboard } from "@/components/dashboard/TeacherDashboard";
import { AccountantDashboard } from "@/components/dashboard/AccountantDashboard";
import { StudentDashboard } from "@/components/dashboard/StudentDashboard";
import { PrincipalDashboard } from "@/components/dashboard/PrincipalDashboard";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  Area,
} from "recharts";
import { DashboardAPI } from "@/api/Dashboard/dashboardAPI";
import {
  CardsSkeleton,
  ChartSkeleton,
  Skeleton,
} from "@/components/dashboard/Skeleton";
import { Header } from "@/components/dashboard/Header";
import { motion } from "framer-motion";

// API Response Type Definitions
interface ApiResponse<T> {
  data: T;
  message?: string;
  status?: number;
}

interface UserRolesData {
  summary: {
    Roll: string;
    Total: number;
  }[];
  graph: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      backgroundColor: string[];
      borderColor: string;
      borderWidth: number;
    }[];
    title: string;
  };
}

interface StudentSummaryData {
  summary: {
    total_students: number;
    present: number;
    absent: number;
    late: number;
    leave: number;
  };
  graph: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      backgroundColor: string[];
      borderColor: string[];
      borderWidth: number;
    }[];
    title: string;
  };
}
interface AttendanceSummaryData {
  summary: {
    date: string;
    class_name: string;
    attendance_values: {
      Present: number;
      Absent: number;
      Late: number;
      Leave: number;
    };
  }[];
  graph: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      backgroundColor: string;
      borderColor: string | null;
      borderWidth: number | null;
    }[];
    title: string;
  };
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
interface FeeSummaryData {
  year: number;
  monthly_data: {
    [key: string]: number;
  };
  total: number;
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

const getTodayDate = () => {
  const today = new Date();
  return today.toISOString().split("T")[0];
};

// Custom tooltip styles
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-100">
        <p className="font-medium text-gray-700">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color || entry.fill }}>
            {`${entry.name}: ${entry.value}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function DashboardRouter() {
  const { role, isLoading } = useRole();
  
  // Show loading state while role is being determined
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  // Route to appropriate dashboard based on role
  switch (role) {
    case "ADMIN":
      return <AdminDashboardView />;
    case "PRINCIPAL":
      return <PrincipalDashboard />;
    case "TEACHER":
      return <TeacherDashboard />;
    case "ACCOUNTANT":
    case "FEE_MANAGER":
      return <AccountantDashboard />;
    case "USER":
      return <StudentDashboard />;
    default:
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-xl text-gray-600">Unknown role. Please log in again.</p>
          </div>
        </div>
      );
  }
}

/**
 * Full Admin/Principal Dashboard with all statistics
 */
function AdminDashboardView() {
  const { role } = useRole();
  const [userRolesData, setUserRolesData] = useState<UserRolesData | null>(
    null
  );
  const [studentSummaryData, setStudentSummaryData] =
    useState<StudentSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [studentSummaryLoading, setStudentSummaryLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [attendanceSummaryData, setAttendanceSummaryData] =
    useState<AttendanceSummaryData | null>(null);
  const [attendanceSummaryLoading, setAttendanceSummaryLoading] =
    useState(true);
  const [incomeExpenseSummaryData, setIncomeExpenseSummaryData] =
    useState<IncomeExpenseSummaryData | null>(null);
  const [incomeExpenseLoading, setIncomeExpenseLoading] = useState(true);
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [feeSummaryData, setFeeSummaryData] = useState<FeeSummaryData | null>(
    null
  );
  const [feeSummaryLoading, setFeeSummaryLoading] = useState(true);
  const [incomeSummaryData, setIncomeSummaryData] =
    useState<IncomeSummaryData | null>(null);
  const [incomeSummaryLoading, setIncomeSummaryLoading] = useState(true);
  const [expenseSummaryData, setExpenseSummaryData] =
    useState<ExpenseSummaryData | null>(null);
  const [expenseSummaryLoading, setExpenseSummaryLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedExpenseMonth, setSelectedExpenseMonth] = useState<
    number | null
  >(null);
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

  // Helper: access attendance_values by key, case-insensitively
  const getAttVal = (
    values: Record<string, number>,
    key: string
  ): number => {
    // Try exact match first, then lowercase, then capitalized
    return (
      values[key] ??
      values[key.toLowerCase()] ??
      values[key.charAt(0).toUpperCase() + key.slice(1).toLowerCase()] ??
      0
    );
  };

  // Fetch user roles data when component mounts
  useEffect(() => {
    if (!role) return;  // wait until role is confirmed
    const fetchUserRolesData = async () => {
      try {
        const response = (await DashboardAPI.GetUserRoles()) as ApiResponse<UserRolesData>;
        if (response && response.data) {
          setUserRolesData(response.data);
        }
      } catch (error) {
        console.error("Error fetching user roles data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserRolesData();
  }, [role]);
  useEffect(() => {
    if (!role) return;  // wait until role is confirmed
    const fetchStudentSummaryData = async () => {
      setStudentSummaryLoading(true);
      try {
        const response = (await DashboardAPI.GetStudentSummary(
          selectedDate
        )) as ApiResponse<StudentSummaryData>;
        if (response && response.data) {
          setStudentSummaryData(response.data);
        }
      } catch (error) {
        console.error("Error fetching student summary data:", error);
      } finally {
        setStudentSummaryLoading(false);
      }
    };

    fetchStudentSummaryData();
  }, [selectedDate, role]);
  useEffect(() => {
    if (!role) return;  // wait until role is confirmed
    const fetchAttendanceSummary = async () => {
      setAttendanceSummaryLoading(true);
      try {
        const response = (await DashboardAPI.GetAttendanceSummary()) as ApiResponse<AttendanceSummaryData>;
        console.log("📊 Raw attendance response:", response);
        console.log("📊 Response.data:", response?.data);
        console.log("📊 Response.data.summary:", response?.data?.summary);
        
        if (response && response.data) {
          console.log("✅ Setting attendance data with", response.data.summary?.length || 0, "records");
          setAttendanceSummaryData(response.data);
        } else if (response?.data === undefined || response?.data === null) {
          console.error("❌ Response exists but data is null/undefined:", response);
          setAttendanceSummaryData(null);
        } else {
          console.warn("⚠️ Attendance summary: empty or unexpected response", response);
          setAttendanceSummaryData(null);
        }
      } catch (error) {
        console.error("❌ Error fetching attendance summary:", error);
        setAttendanceSummaryData(null);
      } finally {
        setAttendanceSummaryLoading(false);
      }
    };

    console.log("🔄 Fetching attendance summary, role:", role);
    fetchAttendanceSummary();
  }, [role]);
  useEffect(() => {
    if (!role) return;  // wait until role is confirmed
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
  useEffect(() => {
    if (!role) return;  // wait until role is confirmed
    const fetchFeeSummary = async () => {
      setFeeSummaryLoading(true);
      try {
        const response = (await DashboardAPI.GetFeeSummary(selectedYear)) as ApiResponse<FeeSummaryData>;
        if (response && response.data) {
          setFeeSummaryData(response.data);
        }
      } catch (error) {
        console.error("Error fetching fee summary:", error);
      } finally {
        setFeeSummaryLoading(false);
      }
    };

    fetchFeeSummary();
  }, [selectedYear, role]);
  useEffect(() => {
    if (!role) return;  // wait until role is confirmed
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
  useEffect(() => {
    if (!role) return;  // wait until role is confirmed
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
  // Transform API data for the pie chart
  const transformedPieData =
    userRolesData?.graph.labels.map((label, index) => ({
      name: label,
      value: userRolesData.graph.datasets[0].data[index],
      color: userRolesData.graph.datasets[0].backgroundColor[index],
    })) || [];
  const transformedBarData =
    studentSummaryData?.graph.labels
      .map((label, index) => ({
        name: label,
        value: studentSummaryData.graph.datasets[0].data[index],
        color:
          studentSummaryData.graph.datasets[0].backgroundColor[index] || "#000",
      }))
      || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Header value="Dashboard" />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8">
          {/* Student Attendance Summary Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white p-6 rounded-xl shadow-md border border-gray-100 hover:shadow-lg transition-shadow duration-300"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">
                {studentSummaryData?.graph.title || "Student Attendance Summary"}
              </h2>
              <div className="flex items-center bg-gray-100 p-2 rounded-lg">
                <label
                  htmlFor="date-select"
                  className="mr-2 text-sm font-medium text-gray-600"
                >
                  Select Date:
                </label>
                <input
                  id="date-select"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-white border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
            </div>
            
            {studentSummaryData && (
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 mb-8">
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-xl shadow-sm">
                  <div className="flex items-center justify-center mb-2 text-blue-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-600 text-center">Total</p>
                  <p className="font-bold text-xl text-center text-gray-800">
                    {studentSummaryData.summary.total_students}
                  </p>
                </div>
                <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-xl shadow-sm">
                  <div className="flex items-center justify-center mb-2 text-green-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-600 text-center">Present</p>
                  <p className="font-bold text-xl text-center text-gray-800">
                    {studentSummaryData.summary.present}
                  </p>
                </div>
                <div className="bg-gradient-to-r from-red-50 to-red-100 p-4 rounded-xl shadow-sm">
                  <div className="flex items-center justify-center mb-2 text-red-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-600 text-center">Absent</p>
                  <p className="font-bold text-xl text-center text-gray-800">
                    {studentSummaryData.summary.absent}
                  </p>
                </div>
                <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 p-4 rounded-xl shadow-sm">
                  <div className="flex items-center justify-center mb-2 text-yellow-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-600 text-center">Late</p>
                  <p className="font-bold text-xl text-center text-gray-800">
                    {studentSummaryData.summary.late}
                  </p>
                </div>
                <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-4 rounded-xl shadow-sm">
                  <div className="flex items-center justify-center mb-2 text-orange-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-600 text-center">Leave</p>
                  <p className="font-bold text-xl text-center text-gray-800">
                    {studentSummaryData.summary.leave}
                  </p>
                </div>
              </div>
            )}
            
            <div className="h-64 mt-4">
              {studentSummaryLoading ? (
                <div className="flex items-center justify-center h-full">
                  <ChartSkeleton />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={transformedBarData} barSize={40}>
                    <defs>
                      {transformedBarData.map((entry, index) => (
                        <linearGradient key={`gradient-${index}`} id={`colorValue${index}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={entry.color} stopOpacity={0.8}/>
                          <stop offset="95%" stopColor={entry.color} stopOpacity={0.4}/>
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconType="circle" />
                    <Bar dataKey="value" name="Count" radius={[4, 4, 0, 0]}>
                      {transformedBarData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={`url(#colorValue${index})`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </motion.div>
          
          <div className="grid gap-8 md:grid-cols-2">
            {/* User Roles Overview Card - Hidden for PRINCIPAL and ACCOUNTANT */}
            {role !== "PRINCIPAL" && role !== "ACCOUNTANT" && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-white p-6 rounded-xl shadow-md border border-gray-100 hover:shadow-lg transition-shadow duration-300"
            >
              <h2 className="text-xl font-bold text-gray-800 mb-6">
                {userRolesData?.graph.title || "User Roles Overview"}
              </h2>
              <div className="h-64">
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <ChartSkeleton />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <defs>
                        {transformedPieData.map((entry, index) => (
                          <linearGradient key={`pieGradient-${index}`} id={`pieColorGradient${index}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={entry.color} stopOpacity={1}/>
                            <stop offset="100%" stopColor={entry.color} stopOpacity={0.7}/>
                          </linearGradient>
                        ))}
                      </defs>
                      <Pie
                        data={transformedPieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        animationBegin={0}
                        animationDuration={1500}
                      >
                        {transformedPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={`url(#pieColorGradient${index})`} stroke="#fff" strokeWidth={2} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </motion.div>
            )}
            
            {/* Fee Collection Trends Card */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-white p-6 rounded-xl shadow-md border border-gray-100 hover:shadow-lg transition-shadow duration-300"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">
                  {feeSummaryData?.graph.title || "Fee Collection Trends"}
                </h2>
                <div className="flex items-center bg-gray-100 p-2 rounded-lg">
                  <label
                    htmlFor="fee-year-select"
                    className="mr-2 text-sm font-medium text-gray-600"
                  >
                    Year:
                  </label>
                  <select
                    id="fee-year-select"
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
              </div>

              {/* Fee summary total */}
              {!feeSummaryLoading && feeSummaryData && (
                <div className="mb-6 bg-gradient-to-r from-blue-50 to-blue-100 p-5 rounded-xl shadow-sm">
                  <div className="flex items-center">
                    <div className="p-3 rounded-full bg-blue-500 text-white mr-4">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Fee Collection</p>
                      <p className="text-xl font-bold text-blue-600">
                        Rs.{feeSummaryData.total.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="h-64">
                {feeSummaryLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Skeleton className="mb-4 h-16 w-full rounded-md" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={
                        feeSummaryData?.graph.labels.map((month, index) => ({
                          name: month,
                          amount: feeSummaryData.graph.datasets[0].data[index],
                        })) || []
                      }
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <defs>
                        <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} />
                      <YAxis axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend iconType="circle" />
                      <Line
                        type="monotone"
                        dataKey="amount"
                        name={
                          feeSummaryData?.graph.datasets[0].label ||
                          "Fee Collection"
                        }
                        stroke="#3b82f6"
                        activeDot={{ r: 8, strokeWidth: 0, fill: "#2563eb" }}
                        strokeWidth={2}
                        dot={{ r: 4, strokeWidth: 2, fill: "#fff", stroke: "#3b82f6" }}
                      />
                      <Area type="monotone" dataKey="amount" stroke="none" fillOpacity={1} fill="url(#colorAmount)" />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </motion.div>
          </div>

          {/* Class Attendance Summary Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="bg-white p-6 rounded-xl shadow-md border border-gray-100 hover:shadow-lg transition-shadow duration-300"
          >
            <h2 className="text-xl font-bold text-gray-800 mb-6">
              {attendanceSummaryData?.graph.title || "Class Attendance Summary"}
            </h2>
            <div className="h-80">
              {attendanceSummaryLoading ? (
                <div className="flex items-center justify-center h-full">
                  <ChartSkeleton height="h-80" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={
                      attendanceSummaryData?.graph.labels.map(
                        (label, index) => {
                          const dataPoint: { name: string; [key: string]: string | number } = { name: label };
                          attendanceSummaryData.graph.datasets.forEach(
                            (dataset) => {
                              dataPoint[dataset.label] = dataset.data[index];
                            }
                          );
                          return dataPoint;
                        }
                      ) || []
                    }
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    barSize={20}
                  >
                    <defs>
                      {attendanceSummaryData?.graph.datasets.map((dataset, index) => (
                        <linearGradient key={`gradientAttendance-${index}`} id={`colorAttendance${index}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={dataset.backgroundColor} stopOpacity={0.8}/>
                          <stop offset="95%" stopColor={dataset.backgroundColor} stopOpacity={0.4}/>
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconType="circle" />
                    {attendanceSummaryData?.graph.datasets.map((dataset, index) => (
                      <Bar
                        key={dataset.label}
                        dataKey={dataset.label}
                        stackId="a"
                        fill={`url(#colorAttendance${index})`}
                        radius={[0, 0, 0, 0]}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Optional: Add a table view for detailed numbers with improved styling */}
            {!attendanceSummaryLoading && attendanceSummaryData && (
              <div className="mt-8 overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 rounded-lg overflow-hidden">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Class
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Present
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Absent
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Late
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Leave
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {attendanceSummaryData.summary && attendanceSummaryData.summary.length > 0 ? (
                      attendanceSummaryData.summary.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50 transition-colors duration-150">
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                            {item.class_name}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                            <span className="px-2 py-1 rounded-full bg-green-100 text-green-800">{getAttVal(item.attendance_values, "present")}</span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                            <span className="px-2 py-1 rounded-full bg-red-100 text-red-800">{getAttVal(item.attendance_values, "absent")}</span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                            <span className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-800">{getAttVal(item.attendance_values, "late")}</span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                            <span className="px-2 py-1 rounded-full bg-orange-100 text-orange-800">{getAttVal(item.attendance_values, "leave")}</span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                          No attendance data available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
          
          {/* Financial Summary Card - Hidden for PRINCIPAL */}
          {role !== "PRINCIPAL" && (
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
                      // Handle array of colors for profit/loss bars
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
          )}
          
          {/* Income Category Details Card - Hidden for PRINCIPAL */}
          {role !== "PRINCIPAL" && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="bg-white p-6 rounded-xl shadow-md border border-gray-100 hover:shadow-lg transition-shadow duration-300"
          >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800 mb-2 sm:mb-0">
                {incomeSummaryData?.graph.title || "Income Category Details"}
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
                        incomeSummaryData?.graph.datasets[0].label || "Income"
                      }
                      fill="url(#colorIncomeAmount)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </motion.div>
          )}
          
          {/* Expense Category Details Card - Hidden for PRINCIPAL */}
          {role !== "PRINCIPAL" && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="bg-white p-6 rounded-xl shadow-md border border-gray-100 hover:shadow-lg transition-shadow duration-300"
          >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800 mb-2 sm:mb-0">
                {expenseSummaryData?.graph.title || "Expense Category Details"}
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
          )}
        </div>
      </main>
    </div>
  );
}
