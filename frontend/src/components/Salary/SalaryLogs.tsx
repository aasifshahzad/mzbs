"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Header } from "@/components/dashboard/Header";
import { toast } from "sonner";
import { Search, Printer, Eye, Edit, Trash2, RefreshCw } from "lucide-react";
import { SalaryAPI, SalaryPaymentResponse, AllowanceResponse, DeductionResponse, SalaryLedgerResponse } from "@/api/Salary/SalaryAPI";
import { useRole } from "@/context/RoleContext";

interface SalaryTransaction {
  id: string;
  teacherId: number;
  teacherName: string;
  month: number;
  year: number;
  baseSalary: number;
  allowanceTotal: number;
  deductionTotal: number;
  netSalary: number;
  totalPaid: number;
  remaining: number;
  transactionType: 'payment' | 'allowance' | 'deduction';
  transactionAmount?: number;
  transactionReason?: string;
  paymentDate?: string;
  deductionType?: string;
  createdAt: string;
}

const SalaryLogs = () => {
  const { role } = useRole();
  const isAdmin = role === "ADMIN";

  const [transactions, setTransactions] = useState<SalaryTransaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<SalaryTransaction[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState<SalaryTransaction | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<'payment' | 'allowance' | 'deduction'>('payment');
  const [isSaving, setIsSaving] = useState(false);

  // Edit form fields
  const [editAmount, setEditAmount] = useState<number>(0);
  const [editReason, setEditReason] = useState<string>("");
  const [editPaymentDate, setEditPaymentDate] = useState<string>("");
  const [editDeductionType, setEditDeductionType] = useState<string>("");

  // FIX: selectedMonth stores 1-based month value (1=Jan, 12=Dec) or null for "All"
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // FIX: fetchTransactions extracted as useCallback so it can be called
  // from the refresh button and after delete/edit without a full page reload
  const fetchTransactions = useCallback(async () => {
    try {
      setIsLoading(true);

      // Fetch all salary ledgers first to get base information
      const ledgers = await SalaryAPI.getAllSalaryLedgers();

      // Create a map of ledger data by teacher/month/year for O(1) lookup
      const ledgerMap = new Map<string, SalaryLedgerResponse>();
      ledgers.forEach(ledger => {
        const key = `${ledger.teacher_id}-${ledger.month}-${ledger.year}`;
        ledgerMap.set(key, ledger);
      });

      // Fetch all three transaction types in parallel
      const [payments, allowances, deductions] = await Promise.all([
        SalaryAPI.getAllSalaryPayments(),
        SalaryAPI.getAllAllowances(),
        SalaryAPI.getAllDeductions()
      ]);

      const mergedTransactions: SalaryTransaction[] = [];

      // Process payments — look up ledger by ledger_id
      payments.forEach(payment => {
        const ledgerData = ledgers.find(l => l.id === payment.ledger_id);
        if (ledgerData) {
          mergedTransactions.push({
            id: `payment-${payment.id}`,
            teacherId: payment.teacher_id,
            teacherName: payment.teacher_name || "Unknown",
            month: ledgerData.month,
            year: ledgerData.year,
            baseSalary: ledgerData.base_salary,
            allowanceTotal: ledgerData.allowance_total,
            deductionTotal: ledgerData.deduction_total,
            netSalary: ledgerData.net_salary,
            totalPaid: ledgerData.total_paid,
            remaining: ledgerData.remaining,
            transactionType: 'payment',
            transactionAmount: payment.amount,
            paymentDate: payment.payment_date,
            createdAt: payment.created_at
          });
        }
      });

      // Process allowances — look up ledger by teacher/month/year key
      // Note: Allowances always have a ledger via ensure_salary_ledger_exists() on the backend
      allowances.forEach(allowance => {
        const ledgerKey = `${allowance.teacher_id}-${allowance.month}-${allowance.year}`;
        const ledgerData = ledgerMap.get(ledgerKey);
        if (ledgerData) {
          mergedTransactions.push({
            id: `allowance-${allowance.id}`,
            teacherId: allowance.teacher_id,
            teacherName: allowance.teacher_name || "Unknown",
            month: allowance.month,
            year: allowance.year,
            baseSalary: ledgerData.base_salary,
            allowanceTotal: ledgerData.allowance_total,
            deductionTotal: ledgerData.deduction_total,
            netSalary: ledgerData.net_salary,
            totalPaid: ledgerData.total_paid,
            remaining: ledgerData.remaining,
            transactionType: 'allowance',
            transactionAmount: allowance.amount,
            transactionReason: allowance.reason,
            createdAt: allowance.created_at
          });
        }
      });

      // Process deductions — look up ledger by teacher/month/year key
      deductions.forEach(deduction => {
        const ledgerKey = `${deduction.teacher_id}-${deduction.month}-${deduction.year}`;
        const ledgerData = ledgerMap.get(ledgerKey);
        if (ledgerData) {
          mergedTransactions.push({
            id: `deduction-${deduction.id}`,
            teacherId: deduction.teacher_id,
            teacherName: deduction.teacher_name || "Unknown",
            month: deduction.month,
            year: deduction.year,
            baseSalary: ledgerData.base_salary,
            allowanceTotal: ledgerData.allowance_total,
            deductionTotal: ledgerData.deduction_total,
            netSalary: ledgerData.net_salary,
            totalPaid: ledgerData.total_paid,
            remaining: ledgerData.remaining,
            transactionType: 'deduction',
            transactionAmount: deduction.amount,
            deductionType: deduction.type,
            transactionReason: deduction.reason,
            createdAt: deduction.created_at
          });
        }
      });

      // FIX: Removed the "ledger-only" block that was pushing empty ledger rows
      // with transactionType: 'payment' — this was polluting the payment tab
      // with rows that had no transactionAmount, causing display issues.

      // Sort by date (most recent first)
      mergedTransactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setTransactions(mergedTransactions);
      setFilteredTransactions(mergedTransactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      toast.error("Failed to load salary transactions");
      setTransactions([]);
      setFilteredTransactions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Filter transactions based on search, tab, month, and year
  useEffect(() => {
    let filtered = transactions.filter((transaction) =>
      transaction.teacherName?.toLowerCase().includes(searchTerm.toLowerCase()) &&
      transaction.transactionType === activeTab
    );

    // FIX: selectedMonth is now 1-based so no +1 needed
    if (selectedMonth !== null) {
      filtered = filtered.filter((transaction) => transaction.month === selectedMonth);
    }

    if (selectedYear) {
      filtered = filtered.filter((transaction) => transaction.year === selectedYear);
    }

    setFilteredTransactions(filtered);
    setCurrentPage(1);
    setTotalPages(Math.max(1, Math.ceil(filtered.length / pageSize)));
  }, [searchTerm, transactions, selectedMonth, selectedYear, activeTab, pageSize]);

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.min(Math.max(1, page), totalPages));
  };

  const visibleTransactions = filteredTransactions.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const getAvailableYears = (): number[] => {
    if (transactions.length === 0) return [new Date().getFullYear()];
    const years = new Set<number>();
    transactions.forEach((tx) => years.add(tx.year));
    return Array.from(years).sort((a, b) => a - b);
  };

  const handleEdit = (transaction: SalaryTransaction) => {
    setSelectedTransaction(transaction);
    setEditAmount(transaction.transactionAmount || 0);
    setEditReason(transaction.transactionReason || "");
    setEditPaymentDate(transaction.paymentDate || "");
    setEditDeductionType(transaction.deductionType || "");
    setShowEditModal(true);
  };

  const handleDelete = (transaction: SalaryTransaction) => {
    setSelectedTransaction(transaction);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!selectedTransaction) return;

    try {
      const transactionId = selectedTransaction.id.split('-')[1];

      if (selectedTransaction.transactionType === 'payment') {
        await SalaryAPI.deleteSalaryPayment(parseInt(transactionId));
        toast.success('Salary payment deleted successfully');
      } else if (selectedTransaction.transactionType === 'allowance') {
        await SalaryAPI.deleteAllowance(parseInt(transactionId));
        toast.success('Allowance deleted successfully');
      } else if (selectedTransaction.transactionType === 'deduction') {
        await SalaryAPI.deleteDeduction(parseInt(transactionId));
        toast.success('Deduction deleted successfully');
      }

      setShowDeleteConfirm(false);
      setSelectedTransaction(null);
      // FIX: Re-fetch data in-place instead of full page reload
      await fetchTransactions();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete transaction');
    }
  };

  const saveEdit = async () => {
    if (!selectedTransaction) return;

    try {
      setIsSaving(true);
      const transactionId = selectedTransaction.id.split('-')[1];

      if (selectedTransaction.transactionType === 'payment') {
        await SalaryAPI.updateSalaryPayment(parseInt(transactionId), {
          amount: editAmount as any,
          payment_date: editPaymentDate,
        });
        toast.success('Salary payment updated successfully');
      } else if (selectedTransaction.transactionType === 'allowance') {
        await SalaryAPI.updateAllowance(parseInt(transactionId), {
          amount: editAmount as any,
          reason: editReason,
        });
        toast.success('Allowance updated successfully');
      } else if (selectedTransaction.transactionType === 'deduction') {
        await SalaryAPI.updateDeduction(parseInt(transactionId), {
          amount: editAmount as any,
          type: editDeductionType,
          reason: editReason,
        });
        toast.success('Deduction updated successfully');
      }

      setShowEditModal(false);
      setSelectedTransaction(null);
      // FIX: Re-fetch data in-place instead of full page reload
      await fetchTransactions();
    } catch (error) {
      console.error('Update error:', error);
      toast.error('Failed to update transaction');
    } finally {
      setIsSaving(false);
    }
  };

  // FIX: Export replaced with Print
  const handlePrint = () => {
    const tabLabel =
      activeTab === 'payment' ? 'Paid Salary Log' :
      activeTab === 'allowance' ? 'Paid Allowance Log' :
      'Deducted Amount Log';

    const monthLabel = selectedMonth !== null ? MONTHS[selectedMonth - 1] : 'All Months';
    const periodLabel = `${monthLabel} ${selectedYear}`;

    const rows = filteredTransactions.map((tx, index) => {
      if (activeTab === 'payment') {
        return `
          <tr>
            <td>${index + 1}</td>
            <td>${tx.teacherName}</td>
            <td>${tx.paymentDate ? new Date(tx.paymentDate).toLocaleDateString('en-PK') : '-'}</td>
            <td>Rs. ${Math.round(tx.transactionAmount || 0).toLocaleString("en-US")}</td>
            <td>Rs. ${Math.round(tx.netSalary).toLocaleString("en-US")}</td>
            <td>Rs. ${Math.round(tx.remaining).toLocaleString("en-US")}</td>
          </tr>`;
      } else if (activeTab === 'allowance') {
        return `
          <tr>
            <td>${index + 1}</td>
            <td>${tx.teacherName}</td>
            <td>${MONTHS[tx.month - 1]} ${tx.year}</td>
            <td>Rs. ${Math.round(tx.transactionAmount || 0).toLocaleString("en-US")}</td>
            <td>${tx.transactionReason || '-'}</td>
          </tr>`;
      } else {
        return `
          <tr>
            <td>${index + 1}</td>
            <td>${tx.teacherName}</td>
            <td>${MONTHS[tx.month - 1]} ${tx.year}</td>
            <td>Rs. ${Math.round(tx.transactionAmount || 0).toLocaleString("en-US")}</td>
            <td>${tx.deductionType || '-'}</td>
            <td>${tx.transactionReason || '-'}</td>
          </tr>`;
      }
    }).join('');

    const headers =
      activeTab === 'payment'
        ? '<th>#</th><th>Teacher</th><th>Payment Date</th><th>Amount Paid</th><th>Net Salary</th><th>Remaining</th>'
        : activeTab === 'allowance'
        ? '<th>#</th><th>Teacher</th><th>Period</th><th>Allowance Amount</th><th>Reason</th>'
        : '<th>#</th><th>Teacher</th><th>Period</th><th>Deduction Amount</th><th>Type</th><th>Reason</th>';

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>${tabLabel} — ${periodLabel}</title>
          <style>
            body { font-family: Arial, sans-serif; font-size: 13px; padding: 24px; color: #111; }
            h2 { margin-bottom: 4px; }
            p { margin: 0 0 16px; color: #555; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px 10px; text-align: left; }
            th { background: #f5f5f5; font-weight: 600; }
            tr:nth-child(even) td { background: #fafafa; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <h2>${tabLabel}</h2>
          <p>Period: ${periodLabel} &nbsp;|&nbsp; Total records: ${filteredTransactions.length} &nbsp;|&nbsp; Printed: ${new Date().toLocaleDateString('en-PK')}</p>
          <table>
            <thead><tr>${headers}</tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'payment': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'allowance': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'deduction': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="w-full">
      <Header value="Salary Logs" />

      <div className="p-4 sm:p-6 space-y-6">
        {/* Search, Refresh and Print Section */}
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
              {/* Refresh Button */}
              <Button
                onClick={fetchTransactions}
                disabled={isLoading}
                variant="outline"
                className="flex items-center gap-2 whitespace-nowrap"
                title="Refresh data"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              {/* Print Button */}
              <Button
                onClick={handlePrint}
                disabled={filteredTransactions.length === 0}
                className="flex items-center gap-2 whitespace-nowrap"
              >
                <Printer className="w-4 h-4" />
                Print
              </Button>
            </div>
          </div>

          {/* Time Filters */}
          <div className="space-y-4 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                {/* FIX: options now store 1-based month value (idx + 1) */}
                <select
                  value={selectedMonth !== null ? selectedMonth : ""}
                  onChange={(e) =>
                    setSelectedMonth(e.target.value === "" ? null : parseInt(e.target.value))
                  }
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-neutral-800 text-gray-900 dark:text-white"
                >
                  <option value="">All Months</option>
                  {MONTHS.map((month, idx) => (
                    <option key={idx} value={idx + 1}>
                      {month}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-neutral-800 text-gray-900 dark:text-white"
                >
                  {getAvailableYears().map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Section */}
        <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-md p-4 sm:p-6">
          <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-700 pb-4">
            <button
              onClick={() => setActiveTab('payment')}
              className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
                activeTab === 'payment'
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                  : 'bg-gray-100 text-gray-700 dark:bg-neutral-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-neutral-700'
              }`}
            >
              Paid Salary Log
            </button>
            <button
              onClick={() => setActiveTab('allowance')}
              className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
                activeTab === 'allowance'
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                  : 'bg-gray-100 text-gray-700 dark:bg-neutral-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-neutral-700'
              }`}
            >
              Paid Allowance Log
            </button>
            <button
              onClick={() => setActiveTab('deduction')}
              className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
                activeTab === 'deduction'
                  ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                  : 'bg-gray-100 text-gray-700 dark:bg-neutral-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-neutral-700'
              }`}
            >
              Deducted Amount Log
            </button>
          </div>
        </div>

        {/* Salary Logs Table */}
        <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-md p-4 sm:p-6 overflow-x-auto">
          {isLoading ? (
            <div className="text-center py-8 text-gray-600 dark:text-gray-400">
              Loading salary logs...
            </div>
          ) : filteredTransactions.length > 0 ? (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 no-print">
                <p className="text-sm text-gray-500">
                  Page {currentPage} of {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1 || isLoading}
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages || isLoading}
                  >
                    Next
                  </Button>
                </div>
              </div>
              <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-2 font-semibold text-gray-700 dark:text-gray-200">Serial No</th>
                  <th className="text-left py-3 px-2 font-semibold text-gray-700 dark:text-gray-200">Teacher Name</th>

                  {activeTab === 'payment' && (
                    <>
                      <th className="text-left py-3 px-2 font-semibold text-gray-700 dark:text-gray-200">Payment Date</th>
                      <th className="text-left py-3 px-2 font-semibold text-gray-700 dark:text-gray-200">Payment Amount</th>
                    </>
                  )}

                  {activeTab === 'allowance' && (
                    <>
                      <th className="text-left py-3 px-2 font-semibold text-gray-700 dark:text-gray-200">Month</th>
                      <th className="text-left py-3 px-2 font-semibold text-gray-700 dark:text-gray-200">Year</th>
                      <th className="text-left py-3 px-2 font-semibold text-gray-700 dark:text-gray-200">Allowance Amount</th>
                      <th className="text-left py-3 px-2 font-semibold text-gray-700 dark:text-gray-200">Reason</th>
                    </>
                  )}

                  {activeTab === 'deduction' && (
                    <>
                      <th className="text-left py-3 px-2 font-semibold text-gray-700 dark:text-gray-200">Month</th>
                      <th className="text-left py-3 px-2 font-semibold text-gray-700 dark:text-gray-200">Year</th>
                      <th className="text-left py-3 px-2 font-semibold text-gray-700 dark:text-gray-200">Deduction Amount</th>
                      <th className="text-left py-3 px-2 font-semibold text-gray-700 dark:text-gray-200">Type</th>
                      <th className="text-left py-3 px-2 font-semibold text-gray-700 dark:text-gray-200">Reason</th>
                    </>
                  )}

                  <th className="text-left py-3 px-2 font-semibold text-gray-700 dark:text-gray-200">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleTransactions.map((tx, index) => (
                  <tr
                    key={tx.id}
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-neutral-800"
                  >
                    <td className="py-3 px-2 text-gray-900 dark:text-gray-100">{(currentPage - 1) * pageSize + index + 1}</td>
                    <td className="py-3 px-2 text-gray-900 dark:text-gray-100 font-medium">{tx.teacherName}</td>

                    {activeTab === 'payment' && (
                      <>
                        <td className="py-3 px-2 text-gray-900 dark:text-gray-100">
                          {tx.paymentDate ? new Date(tx.paymentDate).toLocaleDateString('en-PK') : '-'}
                        </td>
                        <td className="py-3 px-2 font-medium text-green-600 dark:text-green-400">
                          Rs. {Math.round(tx.transactionAmount || 0).toLocaleString("en-US")}
                        </td>
                      </>
                    )}

                    {activeTab === 'allowance' && (
                      <>
                        <td className="py-3 px-2 text-gray-900 dark:text-gray-100">{MONTHS[tx.month - 1]}</td>
                        <td className="py-3 px-2 text-gray-900 dark:text-gray-100">{tx.year}</td>
                        <td className="py-3 px-2 font-medium text-blue-600 dark:text-blue-400">
                          Rs. {Math.round(tx.transactionAmount || 0).toLocaleString("en-US")}
                        </td>
                        <td className="py-3 px-2 text-gray-900 dark:text-gray-100 text-xs">{tx.transactionReason || '-'}</td>
                      </>
                    )}

                    {activeTab === 'deduction' && (
                      <>
                        <td className="py-3 px-2 text-gray-900 dark:text-gray-100">{MONTHS[tx.month - 1]}</td>
                        <td className="py-3 px-2 text-gray-900 dark:text-gray-100">{tx.year}</td>
                        <td className="py-3 px-2 font-medium text-red-600 dark:text-red-400">
                          Rs. {Math.round(tx.transactionAmount || 0).toLocaleString("en-US")}
                        </td>
                        <td className="py-3 px-2 text-gray-900 dark:text-gray-100 text-xs">{tx.deductionType || '-'}</td>
                        <td className="py-3 px-2 text-gray-900 dark:text-gray-100 text-xs">{tx.transactionReason || '-'}</td>
                      </>
                    )}

                    <td className="py-3 px-2">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { setSelectedTransaction(tx); setShowDetails(true); }}
                          className="p-2"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>

                        {(isAdmin || role === "ACCOUNTANT") && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(tx)}
                            className="p-2"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          </Button>
                        )}

                        {isAdmin && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(tx)}
                            className="p-2"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </>
          ) : (
            <div className="text-center py-8 text-gray-600 dark:text-gray-400">
              {isLoading ? "Loading salary logs..." : searchTerm ? "No salary logs match your search" : `No ${activeTab} records found for the selected period`}
            </div>
          )}
        </div>

        {/* Details Modal */}
        {showDetails && selectedTransaction && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-neutral-900 rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Salary Log Details</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Teacher Name</p>
                  <p className="text-gray-900 dark:text-white font-medium">{selectedTransaction.teacherName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Period</p>
                  <p className="text-gray-900 dark:text-white">
                    {MONTHS[selectedTransaction.month - 1]} {selectedTransaction.year}
                  </p>
                </div>
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 font-semibold">Salary Details</p>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-700 dark:text-gray-300">Base Salary</span>
                      <span className="text-gray-900 dark:text-white font-medium">
                        Rs. {Math.round(selectedTransaction.baseSalary).toLocaleString("en-US")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700 dark:text-gray-300">Total Allowances</span>
                      <span className="text-blue-600 dark:text-blue-400 font-medium">
                        + Rs. {Math.round(selectedTransaction.allowanceTotal).toLocaleString("en-US")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700 dark:text-gray-300">Total Deductions</span>
                      <span className="text-red-600 dark:text-red-400 font-medium">
                        - Rs. {Math.round(selectedTransaction.deductionTotal).toLocaleString("en-US")}
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                      <span className="text-gray-900 dark:text-white font-semibold">Net Salary</span>
                      <span className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                        Rs. {Math.round(selectedTransaction.netSalary).toLocaleString("en-US")}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 font-semibold">Payment Status</p>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-700 dark:text-gray-300">Total Paid</span>
                      <span className="text-gray-900 dark:text-white font-medium">
                        Rs. {Math.round(selectedTransaction.totalPaid).toLocaleString("en-US")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-900 dark:text-white font-semibold">Remaining Balance</span>
                      <span className={`text-lg font-semibold ${selectedTransaction.remaining > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}`}>
                        Rs. {Math.round(selectedTransaction.remaining).toLocaleString("en-US")}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <Button onClick={() => setShowDetails(false)} className="w-full mt-6">Close</Button>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal && selectedTransaction && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-neutral-900 rounded-lg p-6 max-w-md w-full max-h-96 overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                Edit {selectedTransaction.transactionType === 'payment' ? 'Salary Payment' : selectedTransaction.transactionType === 'allowance' ? 'Allowance' : 'Deduction'}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-600 dark:text-gray-400">Teacher Name</label>
                  <Input type="text" value={selectedTransaction.teacherName} disabled className="mt-1" />
                </div>

                {selectedTransaction.transactionType === 'payment' && (
                  <>
                    <div>
                      <label className="text-sm text-gray-600 dark:text-gray-400">Payment Amount (Rs.)</label>
                      <Input
                        type="number"
                        value={editAmount}
                        onChange={(e) => setEditAmount(parseFloat(e.target.value) || 0)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-600 dark:text-gray-400">Payment Date</label>
                      <Input
                        type="date"
                        value={editPaymentDate}
                        onChange={(e) => setEditPaymentDate(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </>
                )}

                {selectedTransaction.transactionType === 'allowance' && (
                  <>
                    <div>
                      <label className="text-sm text-gray-600 dark:text-gray-400">Allowance Amount (Rs.)</label>
                      <Input
                        type="number"
                        value={editAmount}
                        onChange={(e) => setEditAmount(parseFloat(e.target.value) || 0)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-600 dark:text-gray-400">Reason (Optional)</label>
                      <Input
                        type="text"
                        value={editReason}
                        onChange={(e) => setEditReason(e.target.value)}
                        placeholder="Enter reason for allowance"
                        className="mt-1"
                      />
                    </div>
                  </>
                )}

                {selectedTransaction.transactionType === 'deduction' && (
                  <>
                    <div>
                      <label className="text-sm text-gray-600 dark:text-gray-400">Deduction Amount (Rs.)</label>
                      <Input
                        type="number"
                        value={editAmount}
                        onChange={(e) => setEditAmount(parseFloat(e.target.value) || 0)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-600 dark:text-gray-400">Deduction Type</label>
                      <Input
                        type="text"
                        value={editDeductionType}
                        onChange={(e) => setEditDeductionType(e.target.value)}
                        placeholder="e.g., Absent, Late, Loan"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-600 dark:text-gray-400">Reason / Description (Optional)</label>
                      <Input
                        type="text"
                        value={editReason}
                        onChange={(e) => setEditReason(e.target.value)}
                        placeholder="e.g., Absent for 3 days"
                        className="mt-1"
                      />
                    </div>
                  </>
                )}
              </div>
              <div className="flex gap-3 mt-6">
                <Button onClick={() => setShowEditModal(false)} variant="outline" className="flex-1" disabled={isSaving}>
                  Cancel
                </Button>
                <Button onClick={saveEdit} className="flex-1" disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && selectedTransaction && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-neutral-900 rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                Delete {selectedTransaction.transactionType === 'payment' ? 'Salary Payment' : selectedTransaction.transactionType === 'allowance' ? 'Allowance' : 'Deduction'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Are you sure you want to delete this {selectedTransaction.transactionType} transaction for {selectedTransaction.teacherName}? This action cannot be undone.
              </p>
              <div className="bg-gray-100 dark:bg-neutral-800 p-3 rounded mb-4">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-semibold">Amount:</span> Rs. {Math.round(selectedTransaction.transactionAmount || 0).toLocaleString("en-US")}
                </p>
              </div>
              <div className="flex gap-3">
                <Button onClick={() => setShowDeleteConfirm(false)} variant="outline" className="flex-1">
                  Cancel
                </Button>
                <Button onClick={confirmDelete} className="flex-1 bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800">
                  Delete
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SalaryLogs;
