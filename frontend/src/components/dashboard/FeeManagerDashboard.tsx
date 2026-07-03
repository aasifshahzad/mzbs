"use client";

import React, { useEffect, useState } from "react";
import { Header } from "@/components/dashboard/Header";
import { DashboardAPI } from "@/api/Dashboard/dashboardAPI";
import { CardsSkeleton } from "@/components/dashboard/Skeleton";
import { RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { extractPayloadData } from "@/utils/apiResponse";

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

const getYearOptions = (currentYear: number) =>
  Array.from({ length: 7 }, (_, i) => currentYear - 4 + i);

export function FeeManagerDashboard() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [feeSummaryData, setFeeSummaryData] = useState<FeeSummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchFeeSummary = async (year: number) => {
    setIsLoading(true);
    try {
      const response = await DashboardAPI.GetFeeSummary(year);
      const payload = extractPayloadData<FeeSummaryData>(response);
      setFeeSummaryData(payload ?? null);
    } catch (error) {
      console.error("Error fetching fee summary:", error);
      setFeeSummaryData(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFeeSummary(selectedYear);
  }, [selectedYear]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Header value="Fee Manager Dashboard" />
      <main className="container mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="bg-white p-6 rounded-xl shadow-md border border-gray-100 hover:shadow-lg transition-shadow duration-300"
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800">
                Fee Collection Summary for {selectedYear}
              </h2>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center bg-gray-100 p-2 rounded-lg">
                  <label htmlFor="fee-year-select" className="mr-2 text-sm font-medium text-gray-600">
                    Select Year:
                  </label>
                  <select
                    id="fee-year-select"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                    className="bg-white border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    {getYearOptions(currentYear).map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={() => fetchFeeSummary(selectedYear)}
                  title="Refresh"
                  className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition text-gray-500"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {!isLoading && feeSummaryData && (
              <div className="mb-6 bg-gradient-to-r from-purple-50 to-purple-100 p-5 rounded-xl shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-purple-500 text-white">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Fee Collection {selectedYear}</p>
                    <p className="text-2xl font-bold text-purple-600">
                      Rs.{feeSummaryData.total.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="h-80">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <CardsSkeleton />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={
                      feeSummaryData?.graph.labels.map((month, index) => ({
                        name: month,
                        fees: feeSummaryData.graph.datasets[0].data[index],
                      })) || []
                    }
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
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconType="circle" />
                    <Bar
                      dataKey="fees"
                      name={feeSummaryData?.graph.datasets[0].label || "Fees Collected"}
                      fill="url(#colorFees)"
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
