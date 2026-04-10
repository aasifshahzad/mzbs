'use client';

import { useEffect, useState } from 'react';
import { DashboardAPI } from '@/api/Dashboard/dashboardAPI';
import { Header } from '@/components/dashboard/Header';
import { CardsSkeleton, ChartSkeleton, Skeleton } from '@/components/dashboard/Skeleton';
import { motion } from 'framer-motion';
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
} from 'recharts';

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

// Helper: access attendance_values by key, case-insensitively
const getAttVal = (
  values: Record<string, number>,
  key: string
): number => {
  return (
    values[key] ??
    values[key.toLowerCase()] ??
    values[key.charAt(0).toUpperCase() + key.slice(1).toLowerCase()] ??
    0
  );
};

export function PrincipalDashboard() {
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const [studentSummaryData, setStudentSummaryData] = useState<StudentSummaryData | null>(null);
  const [studentSummaryLoading, setStudentSummaryLoading] = useState(true);
  const [attendanceSummaryData, setAttendanceSummaryData] = useState<AttendanceSummaryData | null>(null);
  const [attendanceSummaryLoading, setAttendanceSummaryLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(getTodayDate());

  // Transform data for bar chart
  const transformedBarData =
    studentSummaryData?.graph.labels
      .map((label, index) => ({
        name: label,
        value: studentSummaryData.graph.datasets[0].data[index],
        color:
          studentSummaryData.graph.datasets[0].backgroundColor[index] || "#000",
      }))
      || [];

  useEffect(() => {
    const fetchStudentSummaryData = async () => {
      setStudentSummaryLoading(true);
      try {
        const response = await DashboardAPI.GetStudentSummary(selectedDate) as any;
        if (response && response.data) {
          setStudentSummaryData(response.data);
        }
      } catch (error) {
        console.error('Error fetching student summary data:', error);
      } finally {
        setStudentSummaryLoading(false);
      }
    };

    fetchStudentSummaryData();
  }, [selectedDate]);

  useEffect(() => {
    const fetchAttendanceSummary = async () => {
      setAttendanceSummaryLoading(true);
      try {
        const response = await DashboardAPI.GetAttendanceSummary() as any;
        if (response && response.data) {
          setAttendanceSummaryData(response.data);
        }
      } catch (error) {
        console.error('Error fetching attendance summary:', error);
        setAttendanceSummaryData(null);
      } finally {
        setAttendanceSummaryLoading(false);
      }
    };

    fetchAttendanceSummary();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Header value="Principal Dashboard" />

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
                {studentSummaryData?.graph.title || 'Student Attendance Summary'}
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

          {/* Class Attendance Summary Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-white p-6 rounded-xl shadow-md border border-gray-100 hover:shadow-lg transition-shadow duration-300"
          >
            <h2 className="text-xl font-bold text-gray-800 mb-6">
              {attendanceSummaryData?.graph.title || 'Class Attendance Summary'}
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

            {/* Detailed Table */}
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
                            <span className="px-2 py-1 rounded-full bg-green-100 text-green-800">{getAttVal(item.attendance_values, 'present')}</span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                            <span className="px-2 py-1 rounded-full bg-red-100 text-red-800">{getAttVal(item.attendance_values, 'absent')}</span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                            <span className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-800">{getAttVal(item.attendance_values, 'late')}</span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                            <span className="px-2 py-1 rounded-full bg-orange-100 text-orange-800">{getAttVal(item.attendance_values, 'leave')}</span>
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
        </div>
      </main>
    </div>
  );
}
