"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/dashboard/Header";
import { CardsSkeleton, ChartSkeleton, Skeleton } from "@/components/dashboard/Skeleton";
import { motion } from "framer-motion";
import { DashboardAPI } from "@/api/Dashboard/dashboardAPI";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { CalendarDays, RefreshCw, ShieldCheck, Users } from "lucide-react";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface UserRoleSummaryItem {
  Roll: string;
  Total: number;
}

interface UserRolesData {
  summary: UserRoleSummaryItem[];
  graph: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      backgroundColor: string | string[];
      borderColor?: string | string[];
      borderWidth?: number;
    }[];
    title: string;
  };
}

interface AttendanceSummary {
  total_students: number;
  present: number;
  absent: number;
  late: number;
  leave: number;
}

interface StudentSummaryData {
  summary: AttendanceSummary;
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
    attendance_values: Record<string, number>;
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
  monthly_data: { [key: string]: { income: number; expense: number; profit: number } };
  month_names: string[];
  totals: { income: number; expense: number; profit: number };
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

interface CategorySummaryData {
  summary: { year: number; month: number; category_summary: Record<string, number> }[];
  graph: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      backgroundColor: string | string[];
      borderColor: string;
      borderWidth: number;
    }[];
    title: string;
  };
  total: number;
}

interface FeeSummaryData {
  year: number;
  monthly_data: { [key: string]: number };
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

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

const getTodayString = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const formatDisplayDate = (dateStr: string): string => {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
};

const getAttVal = (values: Record<string, number>, key: string): number =>
  values[key] ??
  values[key.toLowerCase()] ??
  values[key.charAt(0).toUpperCase() + key.slice(1).toLowerCase()] ??
  0;

const MONTH_NAMES = [
  "All Months", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const YEAR_RANGE = (current: number) => Array.from({ length: 7 }, (_, i) => current - 4 + i);

// ─────────────────────────────────────────────
// Shared Sub-components
// ─────────────────────────────────────────────

const DateSelector = ({
  id, value, onChange, label = "Select Date:",
}: {
  id: string; value: string; onChange: (v: string) => void; label?: string;
}) => (
  <div className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-lg">
    <CalendarDays className="w-4 h-4 text-gray-500 shrink-0" />
    <label htmlFor={id} className="text-sm font-medium text-gray-600 whitespace-nowrap">{label}</label>
    <input
      id={id}
      type="date"
      value={value}
      max={getTodayString()}
      onChange={(e) => onChange(e.target.value)}
      className="bg-white border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none cursor-pointer"
    />
  </div>
);

const YearMonthSelector = ({
  yearId, monthId, selectedYear, selectedMonth, onYearChange, onMonthChange, currentYear, showMonth = true,
}: {
  yearId: string; monthId?: string; selectedYear: number; selectedMonth?: number | null;
  onYearChange: (y: number) => void; onMonthChange?: (m: number | null) => void;
  currentYear: number; showMonth?: boolean;
}) => (
  <div className="flex flex-wrap items-center gap-3">
    <div className="flex items-center bg-gray-100 p-2 rounded-lg">
      <label htmlFor={yearId} className="mr-2 text-sm font-medium text-gray-600">Year:</label>
      <select
        id={yearId}
        value={selectedYear}
        onChange={(e) => onYearChange(parseInt(e.target.value))}
        className="bg-white border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
      >
        {YEAR_RANGE(currentYear).map((y) => <option key={y} value={y}>{y}</option>)}
      </select>
    </div>
    {showMonth && monthId && onMonthChange && (
      <div className="flex items-center bg-gray-100 p-2 rounded-lg">
        <label htmlFor={monthId} className="mr-2 text-sm font-medium text-gray-600">Month:</label>
        <select
          id={monthId}
          value={selectedMonth === null || selectedMonth === undefined ? 0 : selectedMonth}
          onChange={(e) => {
            const v = parseInt(e.target.value);
            onMonthChange(v === 0 ? null : v);
          }}
          className="bg-white border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        >
          {MONTH_NAMES.map((m, i) => <option key={i} value={i}>{m}</option>)}
        </select>
      </div>
    )}
  </div>
);

const StatCard = ({
  label, value, icon, colorClasses, percentage,
}: {
  label: string; value: number; icon: React.ReactNode; colorClasses: string; percentage?: string;
}) => (
  <div className={`${colorClasses} p-4 rounded-xl shadow-sm flex flex-col items-center gap-1`}>
    <div className="mb-1">{icon}</div>
    <p className="text-sm text-gray-600 text-center font-medium">{label}</p>
    <p className="font-bold text-2xl text-center text-gray-800">{value}</p>
    {percentage && <p className="text-xs text-gray-500 text-center">{percentage}</p>}
  </div>
);

const FinancialCard = ({
  label, amount, colorClasses, iconBg, icon, amountColor,
}: {
  label: string; amount: number; colorClasses: string; iconBg: string; icon: React.ReactNode; amountColor: string;
}) => (
  <div className={`${colorClasses} p-5 rounded-xl shadow-sm`}>
    <div className="flex items-center">
      <div className={`p-3 rounded-full ${iconBg} text-white mr-4`}>{icon}</div>
      <div>
        <p className="text-sm font-medium text-gray-600">{label}</p>
        <p className={`text-2xl font-bold ${amountColor}`}>Rs.{amount.toLocaleString()}</p>
      </div>
    </div>
  </div>
);

const AttendanceTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-100">
        <p className="font-medium text-gray-700 mb-1">{label}</p>
        {payload.map((entry: any, i: number) => (
          <p key={i} className="text-sm" style={{ color: entry.color || entry.fill }}>
            {entry.name}: <span className="font-semibold">{entry.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const FinancialTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-100">
        <p className="font-medium text-gray-700 mb-1">{label}</p>
        {payload.map((entry: any, i: number) => (
          <p key={i} className="text-sm" style={{ color: entry.color || entry.fill }}>
            {entry.name}: <span className="font-semibold">Rs.{entry.value?.toLocaleString()}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const EmptyState = ({ message }: { message: string }) => (
  <div className="flex flex-col items-center justify-center h-40 text-gray-400">
    <CalendarDays className="w-10 h-10 mb-2 opacity-40" />
    <p className="text-sm">{message}</p>
  </div>
);

const SectionCard = ({
  children, delay = 0,
}: { children: React.ReactNode; delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
    className="bg-white p-6 rounded-xl shadow-md border border-gray-100 hover:shadow-lg transition-shadow duration-300"
  >
    {children}
  </motion.div>
);

const SectionHeader = ({
  title, subtitle, controls,
}: { title: string; subtitle?: string; controls?: React.ReactNode }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
    <div>
      <h2 className="text-xl font-bold text-gray-800">{title}</h2>
      {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
    </div>
    {controls && <div className="flex flex-wrap items-center gap-2">{controls}</div>}
  </div>
);

// ─────────────────────────────────────────────
// Role color palette (matches backend palette)
// ─────────────────────────────────────────────
const ROLE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "Admin":        { bg: "bg-rose-50",    text: "text-rose-700",    border: "border-rose-200" },
  "Principal":    { bg: "bg-blue-50",    text: "text-blue-700",    border: "border-blue-200" },
  "Teacher":      { bg: "bg-teal-50",    text: "text-teal-700",    border: "border-teal-200" },
  "Fee Manager":  { bg: "bg-orange-50",  text: "text-orange-700",  border: "border-orange-200" },
  "Accountant":   { bg: "bg-purple-50",  text: "text-purple-700",  border: "border-purple-200" },
  "Student":      { bg: "bg-gray-50",    text: "text-gray-700",    border: "border-gray-200" },
};

const getRoleStyle = (roleName: string) =>
  ROLE_COLORS[roleName] ?? { bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200" };

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────

export function AdminDashboard() {
  const today = getTodayString();
  const currentYear = new Date().getFullYear();

  // ── Section: User Roles ──
  const [userRolesData, setUserRolesData] = useState<UserRolesData | null>(null);
  const [userRolesLoading, setUserRolesLoading] = useState(true);
  const [userRolesError, setUserRolesError] = useState(false);

  // ── Section: Student Attendance Distribution ──
  const [distDate, setDistDate] = useState(today);
  const [studentSummaryData, setStudentSummaryData] = useState<StudentSummaryData | null>(null);
  const [studentSummaryLoading, setStudentSummaryLoading] = useState(true);
  const [distError, setDistError] = useState(false);

  // ── Section: Class-wise Attendance Summary ──
  const [classDate, setClassDate] = useState(today);
  const [attendanceSummaryData, setAttendanceSummaryData] = useState<AttendanceSummaryData | null>(null);
  const [attendanceSummaryLoading, setAttendanceSummaryLoading] = useState(true);
  const [classError, setClassError] = useState(false);

  // ── Section: Financial (shared year) ──
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [incomeExpenseData, setIncomeExpenseData] = useState<IncomeExpenseSummaryData | null>(null);
  const [incomeExpenseLoading, setIncomeExpenseLoading] = useState(true);

  // ── Section: Income Category ──
  const [incomeSummaryData, setIncomeSummaryData] = useState<CategorySummaryData | null>(null);
  const [incomeSummaryLoading, setIncomeSummaryLoading] = useState(true);
  const [selectedIncomeMonth, setSelectedIncomeMonth] = useState<number | null>(null);

  // ── Section: Expense Category ──
  const [expenseSummaryData, setExpenseSummaryData] = useState<CategorySummaryData | null>(null);
  const [expenseSummaryLoading, setExpenseSummaryLoading] = useState(true);
  const [selectedExpenseMonth, setSelectedExpenseMonth] = useState<number | null>(null);

  // ── Section: Fee Collection ──
  const [feeSummaryData, setFeeSummaryData] = useState<FeeSummaryData | null>(null);
  const [feeSummaryLoading, setFeeSummaryLoading] = useState(true);

  // ── Fetch: User Roles ──
  const fetchUserRoles = useCallback(async () => {
    setUserRolesLoading(true);
    setUserRolesError(false);
    try {
      const response = await DashboardAPI.GetUserRoles() as any;
      setUserRolesData(response?.data ?? null);
    } catch {
      setUserRolesError(true);
      setUserRolesData(null);
    } finally {
      setUserRolesLoading(false);
    }
  }, []);

  // ── Fetch: Student Summary ──
  const fetchStudentSummary = useCallback(async (date: string) => {
    setStudentSummaryLoading(true);
    setDistError(false);
    try {
      const response = await DashboardAPI.GetStudentSummary(date) as any;
      setStudentSummaryData(response?.data ?? null);
    } catch {
      setDistError(true);
      setStudentSummaryData(null);
    } finally {
      setStudentSummaryLoading(false);
    }
  }, []);

  // ── Fetch: Attendance Summary ──
  const fetchAttendanceSummary = useCallback(async (date: string) => {
    setAttendanceSummaryLoading(true);
    setClassError(false);
    try {
      const response = await DashboardAPI.GetAttendanceSummary(date) as any;
      setAttendanceSummaryData(response?.data ?? null);
    } catch {
      setClassError(true);
      setAttendanceSummaryData(null);
    } finally {
      setAttendanceSummaryLoading(false);
    }
  }, []);

  // ── Fetch: Income/Expense Summary ──
  const fetchIncomeExpense = useCallback(async (year: number) => {
    setIncomeExpenseLoading(true);
    try {
      const response = await DashboardAPI.GetIncomeExpenseSummary(year) as any;
      setIncomeExpenseData(response?.data ?? null);
    } catch {
      setIncomeExpenseData(null);
    } finally {
      setIncomeExpenseLoading(false);
    }
  }, []);

  // ── Fetch: Income Category ──
  const fetchIncomeSummary = useCallback(async (year: number, month: number | null) => {
    setIncomeSummaryLoading(true);
    try {
      const response = await DashboardAPI.GetIncomeSummary(year, month ?? undefined) as any;
      setIncomeSummaryData(response?.data ?? null);
    } catch {
      setIncomeSummaryData(null);
    } finally {
      setIncomeSummaryLoading(false);
    }
  }, []);

  // ── Fetch: Expense Category ──
  const fetchExpenseSummary = useCallback(async (year: number, month: number | null) => {
    setExpenseSummaryLoading(true);
    try {
      const response = await DashboardAPI.GetExpenseSummary(year, month ?? undefined) as any;
      setExpenseSummaryData(response?.data ?? null);
    } catch {
      setExpenseSummaryData(null);
    } finally {
      setExpenseSummaryLoading(false);
    }
  }, []);

  // ── Fetch: Fee Summary ──
  const fetchFeeSummary = useCallback(async (year: number) => {
    setFeeSummaryLoading(true);
    try {
      const response = await DashboardAPI.GetFeeSummary(year) as any;
      setFeeSummaryData(response?.data ?? null);
    } catch {
      setFeeSummaryData(null);
    } finally {
      setFeeSummaryLoading(false);
    }
  }, []);

  // ── Effects ──
  useEffect(() => { fetchUserRoles(); }, [fetchUserRoles]);
  useEffect(() => { fetchStudentSummary(distDate); }, [distDate, fetchStudentSummary]);
  useEffect(() => { fetchAttendanceSummary(classDate); }, [classDate, fetchAttendanceSummary]);
  useEffect(() => { fetchIncomeExpense(selectedYear); }, [selectedYear, fetchIncomeExpense]);
  useEffect(() => { fetchIncomeSummary(selectedYear, selectedIncomeMonth); }, [selectedYear, selectedIncomeMonth, fetchIncomeSummary]);
  useEffect(() => { fetchExpenseSummary(selectedYear, selectedExpenseMonth); }, [selectedYear, selectedExpenseMonth, fetchExpenseSummary]);
  useEffect(() => { fetchFeeSummary(selectedYear); }, [selectedYear, fetchFeeSummary]);

  // ── Derived Data ──
  const transformedBarData =
    studentSummaryData?.graph.labels.map((label, i) => ({
      name: label,
      value: studentSummaryData.graph.datasets[0].data[i],
      color: studentSummaryData.graph.datasets[0].backgroundColor[i] || "#6366f1",
    })) ?? [];

  const total = studentSummaryData?.summary.total_students || 0;
  const pct = (n: number) => total > 0 ? `${((n / total) * 100).toFixed(1)}%` : "—";

  const userRolesBarData =
    userRolesData?.graph.labels.map((label, i) => ({
      name: label,
      value: userRolesData.graph.datasets[0].data[i],
      color: Array.isArray(userRolesData.graph.datasets[0].backgroundColor)
        ? userRolesData.graph.datasets[0].backgroundColor[i]
        : userRolesData.graph.datasets[0].backgroundColor,
    })) ?? [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Header value="Admin Dashboard" />

      <main className="container mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8">

          {/* ══════════════════════════════════════════
              SECTION 1 — Total Users Role-wise
              ══════════════════════════════════════════ */}
          <SectionCard delay={0}>
            <SectionHeader
              title="Total Users Role-wise"
              subtitle="System-wide user distribution by role"
              controls={
                <button
                  onClick={fetchUserRoles}
                  title="Refresh"
                  className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition text-gray-500"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              }
            />

            {userRolesLoading ? (
              <CardsSkeleton />
            ) : userRolesError || !userRolesData ? (
              <EmptyState message="Failed to load user roles. Try refreshing." />
            ) : (
              <>
                {/* Role summary cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mb-6">
                  {userRolesData.summary.map((item) => {
                    const style = getRoleStyle(item.Roll);
                    return (
                      <div
                        key={item.Roll}
                        className={`${style.bg} border ${style.border} p-4 rounded-xl flex flex-col items-center gap-1 shadow-sm`}
                      >
                        <Users className={`w-5 h-5 mb-1 ${style.text}`} />
                        <p className={`text-xs font-semibold text-center ${style.text}`}>{item.Roll}</p>
                        <p className={`text-2xl font-bold ${style.text}`}>{item.Total}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Bar chart */}
                <div className="h-64">
                  {userRolesBarData.length === 0 ? (
                    <EmptyState message="No chart data available" />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={userRolesBarData} barSize={44}>
                        <defs>
                          {userRolesBarData.map((entry, i) => (
                            <linearGradient key={`grad-role-${i}`} id={`adminRoleColor${i}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={entry.color} stopOpacity={0.85} />
                              <stop offset="95%" stopColor={entry.color} stopOpacity={0.4} />
                            </linearGradient>
                          ))}
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 13 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} allowDecimals={false} />
                        <Tooltip content={<AttendanceTooltip />} />
                        <Bar dataKey="value" name="Users" radius={[6, 6, 0, 0]}>
                          {userRolesBarData.map((_, i) => (
                            <Cell key={`cell-role-${i}`} fill={`url(#adminRoleColor${i})`} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </>
            )}
          </SectionCard>

          {/* ══════════════════════════════════════════
              SECTION 2 — Student Attendance Distribution
              ══════════════════════════════════════════ */}
          <SectionCard delay={0.05}>
            <SectionHeader
              title="Student Attendance Distribution"
              subtitle={formatDisplayDate(distDate)}
              controls={
                <>
                  <DateSelector id="admin-dist-date" value={distDate} onChange={setDistDate} />
                  <button
                    onClick={() => fetchStudentSummary(distDate)}
                    title="Refresh"
                    className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition text-gray-500"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </>
              }
            />

            {studentSummaryLoading ? (
              <CardsSkeleton />
            ) : distError ? (
              <EmptyState message="Failed to load data. Try refreshing." />
            ) : !studentSummaryData ? (
              <EmptyState message={`No attendance data for ${formatDisplayDate(distDate)}`} />
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-6">
                  <StatCard
                    label="Total Students" value={studentSummaryData.summary.total_students}
                    colorClasses="bg-gradient-to-br from-blue-50 to-blue-100"
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
                  />
                  <StatCard
                    label="Present" value={studentSummaryData.summary.present} percentage={pct(studentSummaryData.summary.present)}
                    colorClasses="bg-gradient-to-br from-green-50 to-green-100"
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                  />
                  <StatCard
                    label="Absent" value={studentSummaryData.summary.absent} percentage={pct(studentSummaryData.summary.absent)}
                    colorClasses="bg-gradient-to-br from-red-50 to-red-100"
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                  />
                  <StatCard
                    label="Late" value={studentSummaryData.summary.late} percentage={pct(studentSummaryData.summary.late)}
                    colorClasses="bg-gradient-to-br from-yellow-50 to-yellow-100"
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                  />
                  <StatCard
                    label="On Leave" value={studentSummaryData.summary.leave} percentage={pct(studentSummaryData.summary.leave)}
                    colorClasses="bg-gradient-to-br from-orange-50 to-orange-100"
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                  />
                </div>

                <div className="h-64">
                  {transformedBarData.length === 0 ? (
                    <EmptyState message="No chart data available" />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={transformedBarData} barSize={44}>
                        <defs>
                          {transformedBarData.map((entry, i) => (
                            <linearGradient key={`grad-dist-${i}`} id={`adminDistColor${i}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={entry.color} stopOpacity={0.85} />
                              <stop offset="95%" stopColor={entry.color} stopOpacity={0.4} />
                            </linearGradient>
                          ))}
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 13 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                        <Tooltip content={<AttendanceTooltip />} />
                        <Bar dataKey="value" name="Students" radius={[6, 6, 0, 0]}>
                          {transformedBarData.map((_, i) => (
                            <Cell key={`cell-dist-${i}`} fill={`url(#adminDistColor${i})`} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {/* Admin-only: unmarked alert */}
                {(() => {
                  const unmarked =
                    studentSummaryData.summary.total_students -
                    studentSummaryData.summary.present -
                    studentSummaryData.summary.absent -
                    studentSummaryData.summary.late -
                    studentSummaryData.summary.leave;
                  return unmarked > 0 ? (
                    <div className="mt-4 flex items-center gap-3 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg text-sm">
                      <ShieldCheck className="w-4 h-4 shrink-0 text-amber-500" />
                      <span>
                        <strong>{unmarked} student{unmarked > 1 ? "s" : ""}</strong> still have unmarked attendance for {formatDisplayDate(distDate)}.
                      </span>
                    </div>
                  ) : null;
                })()}
              </>
            )}
          </SectionCard>

          {/* ══════════════════════════════════════════
              SECTION 3 — Class-wise Attendance Summary
              ══════════════════════════════════════════ */}
          <SectionCard delay={0.1}>
            <SectionHeader
              title={attendanceSummaryData?.graph.title || "Class Attendance Summary"}
              subtitle={formatDisplayDate(classDate)}
              controls={
                <>
                  <DateSelector id="admin-class-date" value={classDate} onChange={setClassDate} />
                  <button
                    onClick={() => fetchAttendanceSummary(classDate)}
                    title="Refresh"
                    className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition text-gray-500"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </>
              }
            />

            <div className="h-80">
              {attendanceSummaryLoading ? (
                <ChartSkeleton height="h-80" />
              ) : classError ? (
                <EmptyState message="Failed to load data. Try refreshing." />
              ) : !attendanceSummaryData || attendanceSummaryData.graph.labels.length === 0 ? (
                <EmptyState message={`No class attendance data for ${formatDisplayDate(classDate)}`} />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={attendanceSummaryData.graph.labels.map((label, i) => {
                      const point: { name: string; [key: string]: string | number } = { name: label };
                      attendanceSummaryData.graph.datasets.forEach((ds) => { point[ds.label] = ds.data[i]; });
                      return point;
                    })}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    barSize={22}
                  >
                    <defs>
                      {attendanceSummaryData.graph.datasets.map((ds, i) => (
                        <linearGradient key={`grad-class-${i}`} id={`adminClassColor${i}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={ds.backgroundColor} stopOpacity={0.85} />
                          <stop offset="95%" stopColor={ds.backgroundColor} stopOpacity={0.45} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                    <Tooltip content={<AttendanceTooltip />} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 13 }} />
                    {attendanceSummaryData.graph.datasets.map((ds, i) => (
                      <Bar
                        key={ds.label}
                        dataKey={ds.label}
                        stackId="a"
                        fill={`url(#adminClassColor${i})`}
                        radius={i === attendanceSummaryData.graph.datasets.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Detail Table — Admin includes Unmarked column */}
            {!attendanceSummaryLoading && !classError && attendanceSummaryData && attendanceSummaryData.summary.length > 0 && (
              <div className="mt-8 overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 rounded-lg overflow-hidden">
                  <thead className="bg-gray-50">
                    <tr>
                      {["Class", "Present", "Absent", "Late", "Leave", "Unmarked"].map((col) => (
                        <th key={col} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {attendanceSummaryData.summary.map((item, i) => {
                      const present = getAttVal(item.attendance_values, "present");
                      const absent  = getAttVal(item.attendance_values, "absent");
                      const late    = getAttVal(item.attendance_values, "late");
                      const leave   = getAttVal(item.attendance_values, "leave");
                      const unmarked = Math.max(0, present + absent + late + leave);
                      return (
                        <tr key={i} className="hover:bg-gray-50 transition-colors duration-150">
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900 whitespace-nowrap">{item.class_name}</td>
                          <td className="px-4 py-3 text-sm whitespace-nowrap"><span className="px-2.5 py-1 rounded-full bg-green-100 text-green-800 font-medium">{present}</span></td>
                          <td className="px-4 py-3 text-sm whitespace-nowrap"><span className="px-2.5 py-1 rounded-full bg-red-100 text-red-800 font-medium">{absent}</span></td>
                          <td className="px-4 py-3 text-sm whitespace-nowrap"><span className="px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-800 font-medium">{late}</span></td>
                          <td className="px-4 py-3 text-sm whitespace-nowrap"><span className="px-2.5 py-1 rounded-full bg-orange-100 text-orange-800 font-medium">{leave}</span></td>
                          <td className="px-4 py-3 text-sm whitespace-nowrap">
                            <span className={`px-2.5 py-1 rounded-full font-medium ${unmarked > 0 ? "bg-gray-200 text-gray-800" : "bg-gray-100 text-gray-600"}`}>
                              {unmarked}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          {/* ══════════════════════════════════════════
              SECTION 4 — Financial Summary (Income vs Expense)
              ══════════════════════════════════════════ */}
          <SectionCard delay={0.15}>
            <SectionHeader
              title={incomeExpenseData?.graph.title || "Financial Summary"}
              controls={
                <YearMonthSelector
                  yearId="fin-year"
                  selectedYear={selectedYear}
                  onYearChange={setSelectedYear}
                  currentYear={currentYear}
                  showMonth={false}
                />
              }
            />

            {!incomeExpenseLoading && incomeExpenseData && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <FinancialCard
                  label="Total Income" amount={incomeExpenseData.totals.income}
                  colorClasses="bg-gradient-to-r from-green-50 to-green-100"
                  iconBg="bg-green-500" amountColor="text-green-600"
                  icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                />
                <FinancialCard
                  label="Total Expense" amount={incomeExpenseData.totals.expense}
                  colorClasses="bg-gradient-to-r from-red-50 to-red-100"
                  iconBg="bg-red-500" amountColor="text-red-600"
                  icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>}
                />
                <FinancialCard
                  label="Net Profit/Loss" amount={incomeExpenseData.totals.profit}
                  colorClasses="bg-gradient-to-r from-blue-50 to-blue-100"
                  iconBg={incomeExpenseData.totals.profit >= 0 ? "bg-blue-500" : "bg-red-500"}
                  amountColor={incomeExpenseData.totals.profit >= 0 ? "text-blue-600" : "text-red-600"}
                  icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={incomeExpenseData.totals.profit >= 0 ? "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" : "M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"} /></svg>}
                />
              </div>
            )}

            <div className="h-80">
              {incomeExpenseLoading ? (
                <div className="flex items-center justify-center h-full"><CardsSkeleton /></div>
              ) : !incomeExpenseData ? (
                <EmptyState message="No financial data available." />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={incomeExpenseData.graph.labels.map((month, i) => ({
                      name: month,
                      Income: incomeExpenseData.graph.datasets[0]?.data[i] ?? 0,
                      Expense: incomeExpenseData.graph.datasets[1]?.data[i] ?? 0,
                      Profit: incomeExpenseData.graph.datasets[2]?.data[i] ?? 0,
                    }))}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    barSize={20}
                    barGap={8}
                  >
                    <defs>
                      <linearGradient id="finColorIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="rgba(0, 200, 83, 0.8)" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="rgba(0, 200, 83, 0.8)" stopOpacity={0.4} />
                      </linearGradient>
                      <linearGradient id="finColorExpense" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="rgba(244, 67, 54, 0.8)" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="rgba(244, 67, 54, 0.8)" stopOpacity={0.4} />
                      </linearGradient>
                      <linearGradient id="finColorProfit" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="rgba(33, 150, 243, 0.8)" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="rgba(33, 150, 243, 0.8)" stopOpacity={0.4} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                    <Tooltip content={<FinancialTooltip />} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 13 }} />
                    <Bar dataKey="Income"  fill="url(#finColorIncome)"  radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Expense" fill="url(#finColorExpense)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Profit"  fill="url(#finColorProfit)"  radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </SectionCard>

          {/* ══════════════════════════════════════════
              SECTION 5 — Income Category Details
              ══════════════════════════════════════════ */}
          <SectionCard delay={0.2}>
            <SectionHeader
              title={incomeSummaryData?.graph.title || `Income Category Details for ${selectedYear}`}
              controls={
                <YearMonthSelector
                  yearId="income-year" monthId="income-month"
                  selectedYear={selectedYear} selectedMonth={selectedIncomeMonth}
                  onYearChange={setSelectedYear} onMonthChange={setSelectedIncomeMonth}
                  currentYear={currentYear}
                />
              }
            />

            {!incomeSummaryLoading && incomeSummaryData && (
              <div className="mb-6 bg-gradient-to-r from-green-50 to-green-100 p-5 rounded-xl shadow-sm">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-green-500 text-white mr-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Total Income {selectedIncomeMonth ? `for ${MONTH_NAMES[selectedIncomeMonth]}` : ""} {selectedYear}
                    </p>
                    <p className="text-2xl font-bold text-green-600">Rs.{incomeSummaryData.total.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="h-80">
              {incomeSummaryLoading ? (
                <div className="flex items-center justify-center h-full"><Skeleton className="mb-4 h-16 w-full rounded-md" /></div>
              ) : !incomeSummaryData ? (
                <EmptyState message="No income data available." />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={incomeSummaryData.graph.labels.map((cat, i) => ({
                      name: cat,
                      amount: incomeSummaryData.graph.datasets[0].data[i],
                    }))}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    barSize={40}
                  >
                    <defs>
                      <linearGradient id="catColorIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="rgba(0, 200, 83, 0.8)" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="rgba(0, 200, 83, 0.8)" stopOpacity={0.4} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                    <Tooltip content={<FinancialTooltip />} />
                    <Legend iconType="circle" />
                    <Bar dataKey="amount" name={incomeSummaryData.graph.datasets[0].label || "Amount"} fill="url(#catColorIncome)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </SectionCard>

          {/* ══════════════════════════════════════════
              SECTION 6 — Expense Category Details
              ══════════════════════════════════════════ */}
          <SectionCard delay={0.25}>
            <SectionHeader
              title={expenseSummaryData?.graph.title || `Expense Category Details for ${selectedYear}`}
              controls={
                <YearMonthSelector
                  yearId="expense-year" monthId="expense-month"
                  selectedYear={selectedYear} selectedMonth={selectedExpenseMonth}
                  onYearChange={setSelectedYear} onMonthChange={setSelectedExpenseMonth}
                  currentYear={currentYear}
                />
              }
            />

            {!expenseSummaryLoading && expenseSummaryData && (
              <div className="mb-6 bg-gradient-to-r from-red-50 to-red-100 p-5 rounded-xl shadow-sm">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-red-500 text-white mr-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Total Expenses {selectedExpenseMonth ? `for ${MONTH_NAMES[selectedExpenseMonth]}` : ""} {selectedYear}
                    </p>
                    <p className="text-2xl font-bold text-red-600">Rs.{expenseSummaryData.total.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="h-80">
              {expenseSummaryLoading ? (
                <div className="flex items-center justify-center h-full"><Skeleton className="mb-4 h-16 w-full rounded-md" /></div>
              ) : !expenseSummaryData ? (
                <EmptyState message="No expense data available." />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={expenseSummaryData.graph.labels.map((cat, i) => ({
                      name: cat,
                      amount: expenseSummaryData.graph.datasets[0].data[i],
                    }))}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    barSize={40}
                  >
                    <defs>
                      <linearGradient id="catColorExpense" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="rgba(244, 67, 54, 0.8)" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="rgba(244, 67, 54, 0.8)" stopOpacity={0.4} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                    <Tooltip content={<FinancialTooltip />} />
                    <Legend iconType="circle" />
                    <Bar dataKey="amount" name={expenseSummaryData.graph.datasets[0].label || "Expense"} fill="url(#catColorExpense)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </SectionCard>

          {/* ══════════════════════════════════════════
              SECTION 7 — Fee Collection Summary
              ══════════════════════════════════════════ */}
          <SectionCard delay={0.3}>
            <SectionHeader
              title={`Fee Collection Summary for ${selectedYear}`}
              controls={
                <YearMonthSelector
                  yearId="fee-year"
                  selectedYear={selectedYear}
                  onYearChange={setSelectedYear}
                  currentYear={currentYear}
                  showMonth={false}
                />
              }
            />

            {!feeSummaryLoading && feeSummaryData && (
              <div className="mb-6 bg-gradient-to-r from-purple-50 to-purple-100 p-5 rounded-xl shadow-sm">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-purple-500 text-white mr-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Fee Collection {selectedYear}</p>
                    <p className="text-2xl font-bold text-purple-600">Rs.{feeSummaryData.total.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="h-80">
              {feeSummaryLoading ? (
                <div className="flex items-center justify-center h-full"><CardsSkeleton /></div>
              ) : !feeSummaryData ? (
                <EmptyState message="No fee data available." />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={feeSummaryData.graph.labels.map((month, i) => ({
                      name: month,
                      fees: feeSummaryData.graph.datasets[0].data[i],
                    }))}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    barSize={35}
                  >
                    <defs>
                      <linearGradient id="colorFees" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="rgba(168, 85, 247, 0.8)" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="rgba(168, 85, 247, 0.8)" stopOpacity={0.4} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                    <Tooltip content={<FinancialTooltip />} />
                    <Legend iconType="circle" />
                    <Bar dataKey="fees" name={feeSummaryData.graph.datasets[0].label || "Fees Collected"} fill="url(#colorFees)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </SectionCard>

        </div>
      </main>
    </div>
  );
}
