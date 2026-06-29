"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Header } from "@/components/dashboard/Header";
import { toast } from "sonner";
import { Search, Printer, RefreshCw, ChevronDown, ChevronRight, Eye, X } from "lucide-react";
import {
  SalaryAPI,
  TeacherSalarySummary as ApiTeacherSalarySummary,
  TeacherSalaryResponse,
  SalaryPeriod
} from "@/api/Salary/SalaryAPI";

// Local interface for display purposes (extends API interface)
interface TeacherSalarySummary {
  teacherId: number;
  teacherName: string;
  baseSalary: number;
  effectiveDate: string;
  totalPayable: number;
  totalAllowance: number;
  totalDeduction: number;
  netSalary: number;
  totalPaid: number;
  remainingBalance: number;
}

const ViewSalary = () => {
  const [summaries, setSummaries] = useState<TeacherSalarySummary[]>([]);
  const [filteredSummaries, setFilteredSummaries] = useState<TeacherSalarySummary[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedSummary, setSelectedSummary] = useState<TeacherSalarySummary | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [salaryHistory, setSalaryHistory] = useState<SalaryPeriod[]>([]);
  const [isLoadingSalaryHistory, setIsLoadingSalaryHistory] = useState(false);
  const [expandedTeachers, setExpandedTeachers] = useState<Set<number>>(new Set());

  // Format date from YYYY-MM-DD to DD-MM-YY
  const formatDateToDDMMYY = (dateString: string): string => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = String(date.getFullYear()).slice(-2);
    
    return `${day}-${month}-${year}`;
  };


  // Fetch and aggregate salary data using new API endpoint
  const fetchSalaryData = useCallback(async () => {
    try {
      setIsLoading(true);

      // Get all teachers with salaries
      const teacherSalaries = await SalaryAPI.getAllTeacherSalaries();

      // Get unique teacher IDs
      const uniqueTeacherIds = Array.from(
        new Set(teacherSalaries.map(s => s.teacher_id))
      );

      // Fetch summary for each teacher using the new endpoint
      const summaryPromises = uniqueTeacherIds.map(async (teacherId) => {
        try {
          const apiSummary = await SalaryAPI.getTeacherSalarySummary(teacherId);
          
          return {
            teacherId: apiSummary.teacher_id,
            teacherName: apiSummary.teacher_name,
            baseSalary: apiSummary.current_base_salary,
            effectiveDate: formatDateToDDMMYY(apiSummary.latest_effective_from),
            totalPayable: apiSummary.total_payable,
            totalAllowance: apiSummary.total_allowance,
            totalDeduction: apiSummary.total_deduction,
            netSalary: apiSummary.total_net_salary,
            totalPaid: apiSummary.total_paid,
            remainingBalance: apiSummary.remaining,
          };
        } catch (error) {
          // Return a basic summary even if the API call fails
          const teacherSalary = teacherSalaries.find(s => s.teacher_id === teacherId);
          if (teacherSalary) {
            return {
              teacherId: teacherSalary.teacher_id,
              teacherName: teacherSalary.teacher_name || "Unknown",
              baseSalary: Number(teacherSalary.base_salary) || 0,
              effectiveDate: formatDateToDDMMYY(teacherSalary.effective_from),
              totalPayable: 0,
              totalAllowance: 0,
              totalDeduction: 0,
              netSalary: 0,
              totalPaid: 0,
              remainingBalance: 0,
            };
          }
          return null;
        }
      });

      const summaryResults = await Promise.all(summaryPromises);
      const summaryList = summaryResults.filter((s): s is TeacherSalarySummary => s !== null);

      summaryList.sort((a, b) => a.teacherName.localeCompare(b.teacherName));

      setSummaries(summaryList);
      setFilteredSummaries(summaryList);
    } catch (error) {
      toast.error("Failed to load salary information");
      setSummaries([]);
      setFilteredSummaries([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Refresh function to manually update salary data
  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      await fetchSalaryData();
      toast.success("Salary data refreshed successfully!");
    } catch (error) {
      console.error("Error refreshing salary data:", error);
      toast.error("Failed to refresh salary data");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchSalaryData();
  }, [fetchSalaryData]);

  // Filter summaries based on search
  useEffect(() => {
    const filtered = summaries.filter((summary) =>
      (summary.teacherName || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

    setFilteredSummaries(filtered);
  }, [searchTerm, summaries]);

  const handlePrint = () => {
    try {
      const rows = filteredSummaries.map((summary, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${summary.teacherName}</td>
          <td>Rs. ${Math.round(summary.baseSalary).toLocaleString("en-US")}</td>
          <td>${summary.effectiveDate}</td>
          <td>Rs. ${Math.round(summary.totalPayable).toLocaleString("en-US")}</td>
          <td>Rs. ${Math.round(summary.totalAllowance).toLocaleString("en-US")}</td>
          <td>Rs. ${Math.round(summary.totalDeduction).toLocaleString("en-US")}</td>
          <td>Rs. ${Math.round(summary.netSalary).toLocaleString("en-US")}</td>
          <td>Rs. ${Math.round(summary.totalPaid).toLocaleString("en-US")}</td>
          <td>Rs. ${Math.round(summary.remainingBalance).toLocaleString("en-US")}</td>
        </tr>
      `).join("");

      const html = `
        <html>
          <head>
            <title>View Salary Print</title>
            <style>
              body { font-family: Arial, sans-serif; color: #111; }
              table { width: 100%; border-collapse: collapse; margin-top: 16px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background: #f5f5f5; }
            </style>
          </head>
          <body>
            <h1>View Salary Report</h1>
            <p>Generated on ${new Date().toLocaleString()}</p>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Teacher Name</th>
                  <th>Base Salary</th>
                  <th>Effective Date</th>
                  <th>Total Payable</th>
                  <th>Allowance</th>
                  <th>Deduction</th>
                  <th>Net Salary</th>
                  <th>Paid Amount</th>
                  <th>Remaining Balance</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </body>
        </html>
      `;

      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        toast.error("Unable to open print window");
        return;
      }
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    } catch (error) {
      console.error("Error printing records:", error);
      toast.error("Failed to print salary data");
    }
  };

  // Print modal details
  const handlePrintModalDetails = () => {
    if (!selectedSummary) return;

    try {
      const salaryHistoryRows = salaryHistory.map((record, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>Rs. ${Math.round(record.base_salary).toLocaleString("en-US")}</td>
          <td>${record.effective_from ? formatDateToDDMMYY(record.effective_from) : "N/A"}</td>
          <td>${record.effective_till ? formatDateToDDMMYY(record.effective_till) : "—"}</td>
          <td style="text-align: right;">${record.days}</td>
          <td style="text-align: right;">Rs. ${Math.round(record.period_payable).toLocaleString("en-US")}</td>
          <td style="text-align: center;">${record.effective_till === null ? "Active" : "Closed"}</td>
        </tr>
      `).join("");

      const html = `
        <html>
          <head>
            <title>${selectedSummary.teacherName} - Salary Details</title>
            <style>
              body { font-family: Arial, sans-serif; color: #111; margin: 20px; }
              h1 { color: #333; border-bottom: 2px solid #0066cc; padding-bottom: 10px; }
              h2 { color: #0066cc; font-size: 14px; margin-top: 20px; margin-bottom: 10px; }
              .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
              .info-box { padding: 12px; border: 1px solid #ddd; background: #f9f9f9; }
              .label { font-size: 12px; color: #666; margin-bottom: 4px; }
              .value { font-size: 16px; font-weight: bold; color: #333; }
              table { width: 100%; border-collapse: collapse; margin-top: 12px; }
              th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
              th { background: #f5f5f5; font-weight: bold; }
              .summary-section { margin-top: 20px; padding: 12px; border-left: 4px solid #0066cc; background: #f0f5ff; }
              .summary-row { display: flex; justify-content: space-between; padding: 6px 0; }
              p { font-size: 12px; color: #666; margin-top: 20px; }
            </style>
          </head>
          <body>
            <h1>${selectedSummary.teacherName}</h1>
            <p>Salary Details & Breakdown Report</p>
            <p>Generated on ${new Date().toLocaleString()}</p>

            <div class="info-grid">
              <div class="info-box">
                <div class="label">Base Salary (Current)</div>
                <div class="value">Rs. ${Math.round(selectedSummary.baseSalary).toLocaleString("en-US")}</div>
              </div>
              <div class="info-box">
                <div class="label">Total Payable</div>
                <div class="value">Rs. ${Math.round(selectedSummary.totalPayable).toLocaleString("en-US")}</div>
              </div>
              <div class="info-box">
                <div class="label">Total Allowance</div>
                <div class="value">+ Rs. ${Math.round(selectedSummary.totalAllowance).toLocaleString("en-US")}</div>
              </div>
              <div class="info-box">
                <div class="label">Total Deduction</div>
                <div class="value">- Rs. ${Math.round(selectedSummary.totalDeduction).toLocaleString("en-US")}</div>
              </div>
            </div>

            <div class="summary-section">
              <h2>Calculation Summary</h2>
              <div class="summary-row">
                <span>Total Payable</span>
                <span>Rs. ${Math.round(selectedSummary.totalPayable).toLocaleString("en-US")}</span>
              </div>
              <div class="summary-row">
                <span>Add: Allowance</span>
                <span>+ Rs. ${Math.round(selectedSummary.totalAllowance).toLocaleString("en-US")}</span>
              </div>
              <div class="summary-row">
                <span>Less: Deduction</span>
                <span>- Rs. ${Math.round(selectedSummary.totalDeduction).toLocaleString("en-US")}</span>
              </div>
              <div class="summary-row" style="font-weight: bold; border-top: 1px solid #0066cc; padding-top: 8px; margin-top: 8px;">
                <span>Net Salary</span>
                <span>Rs. ${Math.round(selectedSummary.netSalary).toLocaleString("en-US")}</span>
              </div>
            </div>

            <div class="summary-section">
              <h2>Payment Status</h2>
              <div class="summary-row">
                <span>Net Salary</span>
                <span>Rs. ${Math.round(selectedSummary.netSalary).toLocaleString("en-US")}</span>
              </div>
              <div class="summary-row">
                <span>Already Paid</span>
                <span>Rs. ${Math.round(selectedSummary.totalPaid).toLocaleString("en-US")}</span>
              </div>
              <div class="summary-row" style="font-weight: bold; border-top: 1px solid #0066cc; padding-top: 8px; margin-top: 8px;">
                <span>Balance ${selectedSummary.remainingBalance >= 0 ? '(Remaining)' : '(Overpaid)'}</span>
                <span>Rs. ${Math.round(Math.abs(selectedSummary.remainingBalance)).toLocaleString("en-US")}</span>
              </div>
            </div>

            <h2 style="margin-top: 30px;">Salary History (Prorated Breakdown)</h2>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Base Salary</th>
                  <th>From</th>
                  <th>Till</th>
                  <th style="text-align: right;">Days</th>
                  <th style="text-align: right;">Period Payable</th>
                  <th style="text-align: center;">Status</th>
                </tr>
              </thead>
              <tbody>
                ${salaryHistoryRows}
              </tbody>
            </table>
          </body>
        </html>
      `;

      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        toast.error("Unable to open print window");
        return;
      }
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    } catch (error) {
      console.error("Error printing salary details:", error);
      toast.error("Failed to print salary details");
    }
  };

  // Fetch salary history for a specific teacher using the new summary endpoint
  const fetchSalaryHistoryForTeacher = async (teacherId: number) => {
    try {
      setIsLoadingSalaryHistory(true);
      const summary = await SalaryAPI.getTeacherSalarySummary(teacherId);
      setSalaryHistory(summary.salary_history);
    } catch (error) {
      console.error("Error fetching salary history:", error);
      toast.error("Failed to load salary history");
      setSalaryHistory([]);
    } finally {
      setIsLoadingSalaryHistory(false);
    }
  };

  // Toggle expanded state for a teacher
  const toggleExpanded = (teacherId: number) => {
    setExpandedTeachers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(teacherId)) {
        newSet.delete(teacherId);
      } else {
        newSet.add(teacherId);
      }
      return newSet;
    });
  };

  // Calculate summary statistics
  const calculateSummaryStats = (data: TeacherSalarySummary[]) => {
    if (!data || data.length === 0) {
      return {
        totalTeachers: 0,
        totalBaseSalary: 0,
        totalPayable: 0,
        totalAllowance: 0,
        totalDeduction: 0,
        totalNetSalary: 0,
        totalPaid: 0,
        totalRemaining: 0,
      };
    }

    return {
      totalTeachers: data.length,
      totalBaseSalary: data.reduce((sum, s) => sum + s.baseSalary, 0),
      totalPayable: data.reduce((sum, s) => sum + s.totalPayable, 0),
      totalAllowance: data.reduce((sum, s) => sum + s.totalAllowance, 0),
      totalDeduction: data.reduce((sum, s) => sum + s.totalDeduction, 0),
      totalNetSalary: data.reduce((sum, s) => sum + s.netSalary, 0),
      totalPaid: data.reduce((sum, s) => sum + s.totalPaid, 0),
      totalRemaining: data.reduce((sum, s) => sum + s.remainingBalance, 0),
    };
  };

  const summaryStats = calculateSummaryStats(filteredSummaries);

  return (
    <div className="w-full">
      <Header value="View Salary" />

      <div className="p-4 sm:p-6 space-y-6">
        {/* Search and Filter Section */}
        <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-md p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between mb-6">
            <div className="flex-1 w-full">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search by teacher name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleRefresh}
                disabled={isRefreshing}
                variant="outline"
                className="flex items-center gap-2 whitespace-nowrap"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
              </Button>
              <Button
                onClick={handlePrint}
                disabled={filteredSummaries.length === 0}
                className="flex items-center gap-2 whitespace-nowrap"
              >
                <Printer className="w-4 h-4" />
                Print
              </Button>
            </div>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-400 mt-4">
            Showing cumulative salary data for all teachers up to today
          </p>
        </div>

        {/* Summary Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg shadow p-4 border border-blue-200 dark:border-blue-700">
            <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">Total Teachers/Staff</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-2">
              {summaryStats.totalTeachers}
            </p>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg shadow p-4 border border-green-200 dark:border-green-700">
            <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">Total Base Salary</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-2">
              Rs. {Math.round(summaryStats.totalBaseSalary).toLocaleString("en-US")}
            </p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg shadow p-4 border border-purple-200 dark:border-purple-700">
            <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">Total Payable</p>
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-2">
              Rs. {Math.round(summaryStats.totalPayable).toLocaleString("en-US")}
            </p>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-lg shadow p-4 border border-orange-200 dark:border-orange-700">
            <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">Net Salary</p>
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-2">
              Rs. {Math.round(summaryStats.totalNetSalary).toLocaleString("en-US")}
            </p>
          </div>
        </div>

        {/* Second row of summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 rounded-lg shadow p-4 border border-emerald-200 dark:border-emerald-700">
            <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">Total Allowance</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
              Rs. {Math.round(summaryStats.totalAllowance).toLocaleString("en-US")}
            </p>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 rounded-lg shadow p-4 border border-red-200 dark:border-red-700">
            <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">Total Deduction</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-2">
              Rs. {Math.round(summaryStats.totalDeduction).toLocaleString("en-US")}
            </p>
          </div>

          <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-cyan-900/20 dark:to-cyan-800/20 rounded-lg shadow p-4 border border-cyan-200 dark:border-cyan-700">
            <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">Total Paid</p>
            <p className="text-2xl font-bold text-cyan-600 dark:text-cyan-400 mt-2">
              Rs. {Math.round(summaryStats.totalPaid).toLocaleString("en-US")}
            </p>
          </div>

          <div className="bg-gradient-to-br from-pink-50 to-pink-100 dark:from-pink-900/20 dark:to-pink-800/20 rounded-lg shadow p-4 border border-pink-200 dark:border-pink-700">
            <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">Total Remaining</p>
            <p className="text-2xl font-bold text-pink-600 dark:text-pink-400 mt-2">
              Rs. {Math.round(summaryStats.totalRemaining).toLocaleString("en-US")}
            </p>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-md overflow-hidden">
          {isLoading ? (
            <div className="p-6 text-center text-gray-500">Loading salary data...</div>
          ) : filteredSummaries.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              {searchTerm ? "No salary records match your search" : "No salary records found"}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-neutral-800 border-b border-gray-200 dark:border-neutral-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Teacher Name</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">Base Salary</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">Effective Date</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">Total Payable</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">Allowance</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">Deduction</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">Net Salary<br /><span className="text-xs font-normal text-gray-500 dark:text-gray-400">(Cumulative)</span></th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">Paid</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">Remaining</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-neutral-700">
                  {filteredSummaries.map((summary) => (
                    <tr key={summary.teacherId} className="hover:bg-gray-50 dark:hover:bg-neutral-800 transition">
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white font-medium">{summary.teacherName}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-400">Rs. {Math.round(summary.baseSalary).toLocaleString("en-US")}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-400">{summary.effectiveDate}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-400">Rs. {Math.round(summary.totalPayable).toLocaleString("en-US")}</td>
                      <td className="px-4 py-3 text-sm text-right text-green-600 dark:text-green-400">+ Rs. {Math.round(summary.totalAllowance).toLocaleString("en-US")}</td>
                      <td className="px-4 py-3 text-sm text-right text-red-600 dark:text-red-400">- Rs. {Math.round(summary.totalDeduction).toLocaleString("en-US")}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white font-semibold">Rs. {Math.round(summary.netSalary).toLocaleString("en-US")}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-400">Rs. {Math.round(summary.totalPaid).toLocaleString("en-US")}</td>
                      <td className={`px-4 py-3 text-sm text-right font-semibold ${summary.remainingBalance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        Rs. {Math.round(summary.remainingBalance).toLocaleString("en-US")}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => {
                            setSelectedSummary(summary);
                            setShowDetails(true);
                            fetchSalaryHistoryForTeacher(summary.teacherId);
                          }}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Details Modal */}
      {showDetails && selectedSummary && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-xl max-w-2xl w-full max-h-96 overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-800 dark:to-blue-900 text-white p-4 sm:p-6 flex items-center justify-between border-b border-blue-200 dark:border-blue-700">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold">{selectedSummary.teacherName}</h2>
                <p className="text-blue-100 text-sm mt-1">Salary Details & Breakdown</p>
              </div>
              <button
                onClick={() => {
                  setShowDetails(false);
                  setSelectedSummary(null);
                }}
                className="p-2 hover:bg-blue-500 rounded-lg transition"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 space-y-6">
              {/* Key Information Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Base Salary</p>
                  <p className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                    Rs. {Math.round(selectedSummary.baseSalary).toLocaleString("en-US")}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">Effective: {selectedSummary.effectiveDate}</p>
                </div>

                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-700">
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Total Payable</p>
                  <p className="text-xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                    Rs. {Math.round(selectedSummary.totalPayable).toLocaleString("en-US")}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">Cumulative (Days Worked)</p>
                </div>

                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-700">
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Allowance</p>
                  <p className="text-xl font-bold text-green-600 dark:text-green-400 mt-1">
                    + Rs. {Math.round(selectedSummary.totalAllowance).toLocaleString("en-US")}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">Total Additions</p>
                </div>

                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-700">
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Deduction</p>
                  <p className="text-xl font-bold text-red-600 dark:text-red-400 mt-1">
                    - Rs. {Math.round(selectedSummary.totalDeduction).toLocaleString("en-US")}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">Total Deductions</p>
                </div>
              </div>

              {/* Calculation Summary */}
              <div className="bg-gray-50 dark:bg-neutral-800 p-4 rounded-lg border border-gray-200 dark:border-neutral-700">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Calculation Summary</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-neutral-600">
                    <span className="text-gray-700 dark:text-gray-300">Total Payable</span>
                    <span className="font-medium text-gray-900 dark:text-white">Rs. {Math.round(selectedSummary.totalPayable).toLocaleString("en-US")}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-neutral-600">
                    <span className="text-green-700 dark:text-green-400">Add: Allowance</span>
                    <span className="font-medium text-green-700 dark:text-green-400">+ Rs. {Math.round(selectedSummary.totalAllowance).toLocaleString("en-US")}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-neutral-600">
                    <span className="text-red-700 dark:text-red-400">Less: Deduction</span>
                    <span className="font-medium text-red-700 dark:text-red-400">- Rs. {Math.round(selectedSummary.totalDeduction).toLocaleString("en-US")}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 bg-blue-100 dark:bg-blue-900/30 px-3 rounded font-bold text-gray-900 dark:text-white">
                    <span>Net Salary</span>
                    <span>Rs. {Math.round(selectedSummary.netSalary).toLocaleString("en-US")}</span>
                  </div>
                </div>
              </div>

              {/* Payment Status */}
              <div className="bg-gray-50 dark:bg-neutral-800 p-4 rounded-lg border border-gray-200 dark:border-neutral-700">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Payment Status</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-neutral-600">
                    <span className="text-gray-700 dark:text-gray-300">Net Salary</span>
                    <span className="font-medium text-gray-900 dark:text-white">Rs. {Math.round(selectedSummary.netSalary).toLocaleString("en-US")}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-neutral-600">
                    <span className="text-gray-700 dark:text-gray-300">Already Paid</span>
                    <span className="font-medium text-cyan-600 dark:text-cyan-400">Rs. {Math.round(selectedSummary.totalPaid).toLocaleString("en-US")}</span>
                  </div>
                  <div className={`flex justify-between items-center py-3 px-3 rounded font-bold ${selectedSummary.remainingBalance >= 0 ? 'bg-green-100 dark:bg-green-900/30 text-green-900 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-900 dark:text-red-400'}`}>
                    <span>Balance {selectedSummary.remainingBalance >= 0 ? '(Remaining)' : '(Overpaid)'}</span>
                    <span>Rs. {Math.round(Math.abs(selectedSummary.remainingBalance)).toLocaleString("en-US")}</span>
                  </div>
                </div>
              </div>

              {/* Salary History Table */}
              <div className="bg-gray-50 dark:bg-neutral-800 p-4 rounded-lg border border-gray-200 dark:border-neutral-700">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Salary History (Prorated Breakdown)</h3>
                {isLoadingSalaryHistory ? (
                  <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                    Loading salary history...
                  </div>
                ) : salaryHistory.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-neutral-700">
                          <th className="text-left py-2 px-2 font-semibold text-gray-700 dark:text-gray-300">#</th>
                          <th className="text-left py-2 px-2 font-semibold text-gray-700 dark:text-gray-300">Base Salary</th>
                          <th className="text-left py-2 px-2 font-semibold text-gray-700 dark:text-gray-300">From</th>
                          <th className="text-left py-2 px-2 font-semibold text-gray-700 dark:text-gray-300">Till</th>
                          <th className="text-right py-2 px-2 font-semibold text-gray-700 dark:text-gray-300">Days</th>
                          <th className="text-right py-2 px-2 font-semibold text-gray-700 dark:text-gray-300">Period Payable</th>
                          <th className="text-center py-2 px-2 font-semibold text-gray-700 dark:text-gray-300">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {salaryHistory.map((record, index) => (
                          <tr key={record.id} className="border-b border-gray-100 dark:border-neutral-700 hover:bg-gray-100 dark:hover:bg-neutral-700">
                            <td className="py-2 px-2 text-gray-900 dark:text-gray-100">{index + 1}</td>
                            <td className="py-2 px-2 text-gray-900 dark:text-gray-100 font-medium">
                              Rs. {Math.round(record.base_salary).toLocaleString("en-US")}
                            </td>
                            <td className="py-2 px-2 text-gray-900 dark:text-gray-100">
                              {record.effective_from ? formatDateToDDMMYY(record.effective_from) : "N/A"}
                            </td>
                            <td className="py-2 px-2 text-gray-900 dark:text-gray-100">
                              {record.effective_till ? formatDateToDDMMYY(record.effective_till) : "—"}
                            </td>
                            <td className="py-2 px-2 text-right text-gray-900 dark:text-gray-100">
                              {record.days}
                            </td>
                            <td className="py-2 px-2 text-right text-gray-900 dark:text-gray-100 font-medium">
                              Rs. {Math.round(record.period_payable).toLocaleString("en-US")}
                            </td>
                            <td className="py-2 px-2 text-center">
                              {record.effective_till === null ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                  Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                                  Closed
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                    No salary history found
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 dark:bg-neutral-800 p-4 sm:p-6 border-t border-gray-200 dark:border-neutral-700 flex gap-3 justify-end">
              <Button
                onClick={handlePrintModalDetails}
                className="flex items-center gap-2 whitespace-nowrap"
              >
                <Printer className="w-4 h-4" />
                Print
              </Button>
              <Button
                onClick={() => {
                  setShowDetails(false);
                  setSelectedSummary(null);
                }}
                variant="outline"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewSalary;
