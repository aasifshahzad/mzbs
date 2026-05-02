"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/dashboard/Header";
import { CardsSkeleton, ChartSkeleton } from "@/components/dashboard/Skeleton";
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
import { CalendarDays, RefreshCw } from "lucide-react";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

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

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/** Returns today as YYYY-MM-DD in local time — avoids UTC offset bugs */
const getTodayString = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** Formats YYYY-MM-DD → "Mon, 13 Apr 2026" for display */
const formatDisplayDate = (dateStr: string): string => {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

/** Case-insensitive lookup for attendance_values */
const getAttVal = (values: Record<string, number>, key: string): number =>
  values[key] ??
  values[key.toLowerCase()] ??
  values[key.charAt(0).toUpperCase() + key.slice(1).toLowerCase()] ??
  0;

// ─────────────────────────────────────────────
// Shared sub-components
// ─────────────────────────────────────────────

const DateSelector = ({
  id,
  value,
  onChange,
  label = "Select Date:",
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  label?: string;
}) => (
  <div className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-lg">
    <CalendarDays className="w-4 h-4 text-gray-500 shrink-0" />
    <label htmlFor={id} className="text-sm font-medium text-gray-600 whitespace-nowrap">
      {label}
    </label>
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

const StatCard = ({
  label,
  value,
  icon,
  colorClasses,
  percentage,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  colorClasses: string;
  percentage?: string;
}) => (
  <div className={`${colorClasses} p-4 rounded-xl shadow-sm flex flex-col items-center gap-1`}>
    <div className="mb-1">{icon}</div>
    <p className="text-sm text-gray-600 text-center font-medium">{label}</p>
    <p className="font-bold text-2xl text-center text-gray-800">{value}</p>
    {percentage && (
      <p className="text-xs text-gray-500 text-center">{percentage}</p>
    )}
  </div>
);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-100">
        <p className="font-medium text-gray-700 mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color || entry.fill }}>
            {entry.name}: <span className="font-semibold">{entry.value}</span>
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

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────

export function PrincipalDashboard() {
  const today = getTodayString();

  // Section 1 — Student Attendance Distribution
  const [distDate, setDistDate] = useState(today);
  const [studentSummaryData, setStudentSummaryData] = useState<StudentSummaryData | null>(null);
  const [studentSummaryLoading, setStudentSummaryLoading] = useState(true);
  const [distError, setDistError] = useState(false);

  // Section 2 — Class-wise Attendance Summary (FIX: own independent date state)
  const [classDate, setClassDate] = useState(today);
  const [attendanceSummaryData, setAttendanceSummaryData] = useState<AttendanceSummaryData | null>(null);
  const [attendanceSummaryLoading, setAttendanceSummaryLoading] = useState(true);
  const [classError, setClassError] = useState(false);

  // ── Fetch Section 1 ──
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

  // ── Fetch Section 2 ──
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

  // Re-fetch each section independently when its own date changes
  useEffect(() => { fetchStudentSummary(distDate); }, [distDate, fetchStudentSummary]);
  useEffect(() => { fetchAttendanceSummary(classDate); }, [classDate, fetchAttendanceSummary]);

  // Derived chart data for Section 1
  const transformedBarData =
    studentSummaryData?.graph.labels.map((label, i) => ({
      name: label,
      value: studentSummaryData.graph.datasets[0].data[i],
      color: studentSummaryData.graph.datasets[0].backgroundColor[i] || "#6366f1",
    })) ?? [];

  // Derived totals for percentage display
  const total = studentSummaryData?.summary.total_students || 0;
  const pct = (n: number) => total > 0 ? `${((n / total) * 100).toFixed(1)}%` : "—";

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Header value="Principal Dashboard" />

      <main className="container mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8">

          {/* ══════════════════════════════════════════
              SECTION 1 — Student Attendance Distribution
              ══════════════════════════════════════════ */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white p-6 rounded-xl shadow-md border border-gray-100 hover:shadow-lg transition-shadow duration-300"
          >
            {/* Header row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-800">
                  Student Attendance Distribution
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  {formatDisplayDate(distDate)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <DateSelector
                  id="dist-date-select"
                  value={distDate}
                  onChange={setDistDate}
                />
                <button
                  onClick={() => fetchStudentSummary(distDate)}
                  title="Refresh"
                  className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition text-gray-500"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Stat cards */}
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
                    label="Total Students"
                    value={studentSummaryData.summary.total_students}
                    colorClasses="bg-gradient-to-br from-blue-50 to-blue-100"
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
                  />
                  <StatCard
                    label="Present"
                    value={studentSummaryData.summary.present}
                    percentage={pct(studentSummaryData.summary.present)}
                    colorClasses="bg-gradient-to-br from-green-50 to-green-100"
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                  />
                  <StatCard
                    label="Absent"
                    value={studentSummaryData.summary.absent}
                    percentage={pct(studentSummaryData.summary.absent)}
                    colorClasses="bg-gradient-to-br from-red-50 to-red-100"
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                  />
                  <StatCard
                    label="Late"
                    value={studentSummaryData.summary.late}
                    percentage={pct(studentSummaryData.summary.late)}
                    colorClasses="bg-gradient-to-br from-yellow-50 to-yellow-100"
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                  />
                  <StatCard
                    label="On Leave"
                    value={studentSummaryData.summary.leave}
                    percentage={pct(studentSummaryData.summary.leave)}
                    colorClasses="bg-gradient-to-br from-orange-50 to-orange-100"
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                  />
                </div>

                {/* Bar Chart */}
                <div className="h-64">
                  {transformedBarData.length === 0 ? (
                    <EmptyState message="No chart data available" />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={transformedBarData} barSize={44}>
                        <defs>
                          {transformedBarData.map((entry, i) => (
                            <linearGradient key={`grad-${i}`} id={`colorVal${i}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={entry.color} stopOpacity={0.85} />
                              <stop offset="95%" stopColor={entry.color} stopOpacity={0.4} />
                            </linearGradient>
                          ))}
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 13 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="value" name="Students" radius={[6, 6, 0, 0]}>
                          {transformedBarData.map((entry, i) => (
                            <Cell key={`cell-${i}`} fill={`url(#colorVal${i})`} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </>
            )}
          </motion.div>

          {/* ══════════════════════════════════════════
              SECTION 2 — Class-wise Attendance Summary
              FIX: own date selector, independent state
              ══════════════════════════════════════════ */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-white p-6 rounded-xl shadow-md border border-gray-100 hover:shadow-lg transition-shadow duration-300"
          >
            {/* Header row — FIX: own date selector */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-800">
                  {attendanceSummaryData?.graph.title || "Class Attendance Summary"}
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  {formatDisplayDate(classDate)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <DateSelector
                  id="class-date-select"
                  value={classDate}
                  onChange={setClassDate}
                />
                <button
                  onClick={() => fetchAttendanceSummary(classDate)}
                  title="Refresh"
                  className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition text-gray-500"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Stacked Bar Chart */}
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
                      attendanceSummaryData.graph.datasets.forEach((ds) => {
                        point[ds.label] = ds.data[i];
                      });
                      return point;
                    })}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    barSize={22}
                  >
                    <defs>
                      {attendanceSummaryData.graph.datasets.map((ds, i) => (
                        <linearGradient key={`gradClass-${i}`} id={`colorClass${i}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={ds.backgroundColor} stopOpacity={0.85} />
                          <stop offset="95%" stopColor={ds.backgroundColor} stopOpacity={0.45} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 13 }} />
                    {attendanceSummaryData.graph.datasets.map((ds, i) => (
                      <Bar
                        key={ds.label}
                        dataKey={ds.label}
                        stackId="a"
                        fill={`url(#colorClass${i})`}
                        radius={i === attendanceSummaryData.graph.datasets.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Detail Table */}
            {!attendanceSummaryLoading && !classError && attendanceSummaryData && attendanceSummaryData.summary.length > 0 && (
              <div className="mt-8 overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 rounded-lg overflow-hidden">
                  <thead className="bg-gray-50">
                    <tr>
                      {["Class", "Total Students", "Present", "Absent", "Late", "Leave"].map((col) => (
                        <th key={col} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {attendanceSummaryData.summary.map((item, i) => (
                      <tr key={i} className="hover:bg-gray-50 transition-colors duration-150">
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900 whitespace-nowrap">
                          {item.class_name}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-700 whitespace-nowrap">
                          {item.total_students || 0}
                        </td>
                        <td className="px-4 py-3 text-sm whitespace-nowrap">
                          <span className="px-2.5 py-1 rounded-full bg-green-100 text-green-800 font-medium">
                            {getAttVal(item.attendance_values, "present")}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm whitespace-nowrap">
                          <span className="px-2.5 py-1 rounded-full bg-red-100 text-red-800 font-medium">
                            {getAttVal(item.attendance_values, "absent")}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm whitespace-nowrap">
                          <span className="px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-800 font-medium">
                            {getAttVal(item.attendance_values, "late")}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm whitespace-nowrap">
                          <span className="px-2.5 py-1 rounded-full bg-orange-100 text-orange-800 font-medium">
                            {getAttVal(item.attendance_values, "leave")}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>

        </div>
      </main>
    </div>
  );
}
