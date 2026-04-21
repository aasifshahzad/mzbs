"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Header } from "@/components/dashboard/Header";
import { toast } from "sonner";
import { Search, Download, Eye, Edit2, Trash2 } from "lucide-react";
import { SalaryAPI, SalaryLedgerResponse } from "@/api/Salary/SalaryAPI";
import { useRole } from "@/context/RoleContext";

const ViewSalary = () => {
  const { role } = useRole();
  const isAdmin = role === "ADMIN";

  const [salaryRecords, setSalaryRecords] = useState<SalaryLedgerResponse[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<SalaryLedgerResponse[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<SalaryLedgerResponse | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<SalaryLedgerResponse | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Edit modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [recordToEdit, setRecordToEdit] = useState<SalaryLedgerResponse | null>(null);
  const [editAllowanceTotal, setEditAllowanceTotal] = useState<string>("");
  const [editDeductionTotal, setEditDeductionTotal] = useState<string>("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Time filter states
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Helper function to format date as d/m/yy
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString().slice(-2);
    return `${day}/${month}/${year}`;
  };

  // Get available years from records
  const getAvailableYears = (): number[] => {
    if (salaryRecords.length === 0) return [new Date().getFullYear()];
    const years = new Set<number>();
    salaryRecords.forEach((record) => {
      years.add(record.year);
    });
    return Array.from(years).sort((a, b) => a - b);
  };

  useEffect(() => {
    // Fetch salary ledger records when component mounts
    const fetchSalaryRecords = async () => {
      try {
        setIsLoading(true);
        const records = await SalaryAPI.getAllSalaryLedgers();
        console.log("Fetched Salary Ledger Records:", records);
        setSalaryRecords(records);
        setFilteredRecords(records);
      } catch (error) {
        console.error("Error fetching salary ledger records:", error);
        toast.error("Failed to load salary ledger records");
        setSalaryRecords([]);
        setFilteredRecords([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSalaryRecords();
  }, []);

  useEffect(() => {
    // Filter records based on search term and time filters
    let filtered = salaryRecords.filter((record) =>
      record.teacher_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Apply month/year filter
    if (selectedMonth !== null) {
      filtered = filtered.filter((record) => record.month === selectedMonth + 1); // Month is 1-based in ledger
    }

    if (selectedYear) {
      filtered = filtered.filter((record) => record.year === selectedYear);
    }

    setFilteredRecords(filtered);
  }, [searchTerm, salaryRecords, selectedMonth, selectedYear]);

  const handleExport = () => {
    try {
      // Create CSV content for salary ledgers
      const headers = [
        "Serial No",
        "Teacher Name",
        "Month",
        "Year",
        "Base Salary",
        "Allowance Total",
        "Deduction Total",
        "Net Salary",
        "Total Paid",
        "Remaining",
      ];

      const rows = filteredRecords.map((record, index) => [
        index + 1,
        record.teacher_name || "Unknown",
        MONTHS[record.month - 1], // Convert month number to name
        record.year,
        Math.round(record.base_salary),
        Math.round(record.allowance_total),
        Math.round(record.deduction_total),
        Math.round(record.net_salary),
        Math.round(record.total_paid),
        Math.round(record.remaining),
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map((row) => row.join(",")),
      ].join("\n");

      // Create blob and download
      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `salary_ledger_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Salary ledger exported successfully!");
    } catch (error) {
      console.error("Error exporting records:", error);
      toast.error("Failed to export salary records");
    }
  };

  const handleViewDetails = (record: SalaryLedgerResponse) => {
    setSelectedRecord(record);
    setShowDetails(true);
  };

  const handleEditRecord = (record: SalaryLedgerResponse) => {
    if (!isAdmin) {
      toast.error("Only admin can edit salary records");
      return;
    }
    setRecordToEdit(record);
    setEditAllowanceTotal(record.allowance_total.toString());
    setEditDeductionTotal(record.deduction_total.toString());
    setShowEditModal(true);
  };

  const handleDeleteRecord = (record: SalaryLedgerResponse) => {
    if (!isAdmin) {
      toast.error("Only admin can delete salary records");
      return;
    }
    setRecordToDelete(record);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!recordToDelete) return;

    try {
      setIsDeleting(true);
      await SalaryAPI.deleteSalaryLedger(recordToDelete.id);
      toast.success("Salary ledger record deleted successfully!");
      
      // Remove the deleted record from the list
      setSalaryRecords(salaryRecords.filter(r => r.id !== recordToDelete.id));
      
      setShowDeleteConfirm(false);
      setRecordToDelete(null);
    } catch (error) {
      console.error("Error deleting record:", error);
      toast.error("Failed to delete record");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdateRecord = async () => {
    if (!recordToEdit) return;

    try {
      setIsUpdating(true);
      const allowanceTotal = parseFloat(editAllowanceTotal) || 0;
      const deductionTotal = parseFloat(editDeductionTotal) || 0;

      const updatedRecord = await SalaryAPI.updateSalaryLedger(recordToEdit.id, {
        allowance_total: allowanceTotal,
        deduction_total: deductionTotal,
      });

      toast.success("Salary ledger record updated successfully!");

      // Update the record in the list
      setSalaryRecords(salaryRecords.map(r => r.id === recordToEdit.id ? updatedRecord : r));

      setShowEditModal(false);
      setRecordToEdit(null);
    } catch (error) {
      console.error("Error updating record:", error);
      toast.error("Failed to update record");
    } finally {
      setIsUpdating(false);
    }
  };

  const getTotalSalary = () => {
    return filteredRecords.reduce((sum, record) => {
      const salary = Number(record.base_salary) || 0;
      return sum + salary;
    }, 0);
  };

  const getTotalAllowance = () => {
    return filteredRecords.reduce((sum, record) => {
      const allowance = Number(record.allowance_total) || 0;
      return sum + allowance;
    }, 0);
  };

  const getTotalDeductions = () => {
    return filteredRecords.reduce((sum, record) => {
      const deduction = Number(record.deduction_total) || 0;
      return sum + deduction;
    }, 0);
  };

  const getTotalPaid = () => {
    return filteredRecords.reduce((sum, record) => {
      const paid = Number(record.total_paid) || 0;
      return sum + paid;
    }, 0);
  };

  const getTotalRemaining = () => {
    return filteredRecords.reduce((sum, record) => {
      const remaining = Number(record.remaining) || 0;
      return sum + remaining;
    }, 0);
  };

  return (
    <div className="w-full">
      <Header value="View Salary" />
      
      <div className="p-4 sm:p-6 space-y-6">
        {/* Search and Export Section */}
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
            <Button
              onClick={handleExport}
              disabled={filteredRecords.length === 0}
              className="flex items-center gap-2 whitespace-nowrap"
            >
              <Download className="w-4 h-4" />
              Export
            </Button>
          </div>

          {/* Time Filters */}
          <div className="space-y-4 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <select
                  value={selectedMonth !== null ? selectedMonth : ""}
                  onChange={(e) =>
                    setSelectedMonth(
                      e.target.value === "" ? null : parseInt(e.target.value)
                    )
                  }
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-neutral-800 text-gray-900 dark:text-white"
                >
                  <option value="">All Months</option>
                  {MONTHS.map((month, idx) => (
                    <option key={idx} value={idx}>
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
          {filteredRecords.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Payments</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {filteredRecords.length}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Base Salary</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  Rs. {Math.round(getTotalSalary()).toLocaleString("en-US")}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Allowance Paid</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  Rs. {Math.round(getTotalAllowance()).toLocaleString("en-US")}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Deductions</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  Rs. {Math.round(getTotalDeductions()).toLocaleString("en-US")}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Paid</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  Rs. {Math.round(getTotalPaid()).toLocaleString("en-US")}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Remaining</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  Rs. {Math.round(getTotalRemaining()).toLocaleString("en-US")}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Salary Records Table */}
        <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-md p-4 sm:p-6 overflow-x-auto">
          {isLoading ? (
            <div className="text-center py-8 text-gray-600 dark:text-gray-400">
              Loading salary records...
            </div>
          ) : filteredRecords.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-2 font-semibold text-gray-700 dark:text-gray-200">
                    Serial No
                  </th>
                  <th className="text-left py-3 px-2 font-semibold text-gray-700 dark:text-gray-200">
                    Teacher Name
                  </th>
                  <th className="text-left py-3 px-2 font-semibold text-gray-700 dark:text-gray-200">
                    Month
                  </th>
                  <th className="text-left py-3 px-2 font-semibold text-gray-700 dark:text-gray-200">
                    Year
                  </th>
                  <th className="text-left py-3 px-2 font-semibold text-gray-700 dark:text-gray-200">
                    Base Salary
                  </th>
                  <th className="text-left py-3 px-2 font-semibold text-gray-700 dark:text-gray-200">
                    Allowance
                  </th>
                  <th className="text-left py-3 px-2 font-semibold text-gray-700 dark:text-gray-200">
                    Deduction
                  </th>
                  <th className="text-left py-3 px-2 font-semibold text-gray-700 dark:text-gray-200">
                    Net Salary
                  </th>
                  <th className="text-left py-3 px-2 font-semibold text-gray-700 dark:text-gray-200">
                    Total Paid
                  </th>
                  <th className="text-left py-3 px-2 font-semibold text-gray-700 dark:text-gray-200">
                    Remaining
                  </th>
                  <th className="text-left py-3 px-2 font-semibold text-gray-700 dark:text-gray-200">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((record, index) => (
                  <tr
                    key={`${record.teacher_id}-${record.month}-${record.year}`}
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-neutral-800"
                  >
                    <td className="py-3 px-2 text-gray-900 dark:text-gray-100">
                      {index + 1}
                    </td>
                    <td className="py-3 px-2 text-gray-900 dark:text-gray-100 font-medium">
                      {record.teacher_name || "Unknown"}
                    </td>
                    <td className="py-3 px-2 text-gray-900 dark:text-gray-100">
                      {MONTHS[record.month - 1]}
                    </td>
                    <td className="py-3 px-2 text-gray-900 dark:text-gray-100">
                      {record.year}
                    </td>
                    <td className="py-3 px-2 text-gray-900 dark:text-gray-100">
                      Rs. {Math.round(Number(record.base_salary) || 0).toLocaleString("en-US")}
                    </td>
                    <td className="py-3 px-2 text-gray-900 dark:text-gray-100">
                      Rs. {Math.round(Number(record.allowance_total) || 0).toLocaleString("en-US")}
                    </td>
                    <td className="py-3 px-2 text-gray-900 dark:text-gray-100">
                      Rs. {Math.round(Number(record.deduction_total) || 0).toLocaleString("en-US")}
                    </td>
                    <td className="py-3 px-2 text-gray-900 dark:text-gray-100 font-medium text-blue-600">
                      Rs. {Math.round(Number(record.net_salary) || 0).toLocaleString("en-US")}
                    </td>
                    <td className="py-3 px-2 text-gray-900 dark:text-gray-100">
                      Rs. {Math.round(Number(record.total_paid) || 0).toLocaleString("en-US")}
                    </td>
                    <td className="py-3 px-2 text-gray-900 dark:text-gray-100">
                      Rs. {Math.round(Number(record.remaining) || 0).toLocaleString("en-US")}
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(record)}
                          className="p-2"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {isAdmin && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditRecord(record)}
                              className="p-2"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteRecord(record)}
                              className="p-2 text-red-600 hover:text-red-700"
                              disabled={isDeleting}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-8 text-gray-600 dark:text-gray-400">
              {searchTerm ? "No salary records match your search" : "No salary records found"}
            </div>
          )}
        </div>

        {/* Details Modal */}
        {showDetails && selectedRecord && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-neutral-900 rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                Salary Ledger Details
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Teacher Name</p>
                  <p className="text-gray-900 dark:text-white">{selectedRecord.teacher_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Period</p>
                  <p className="text-gray-900 dark:text-white">
                    {MONTHS[selectedRecord.month - 1]} {selectedRecord.year}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Base Salary</p>
                  <p className="text-gray-900 dark:text-white">
                    Rs. {Math.round(Number(selectedRecord.base_salary) || 0).toLocaleString("en-US")}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Allowance</p>
                  <p className="text-gray-900 dark:text-white">
                    Rs. {Math.round(Number(selectedRecord.allowance_total) || 0).toLocaleString("en-US")}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Deduction</p>
                  <p className="text-gray-900 dark:text-white">
                    Rs. {Math.round(Number(selectedRecord.deduction_total) || 0).toLocaleString("en-US")}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Net Salary</p>
                  <p className="text-lg font-semibold text-blue-600">
                    Rs. {Math.round(Number(selectedRecord.net_salary) || 0).toLocaleString("en-US")}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Paid</p>
                  <p className="text-gray-900 dark:text-white">
                    Rs. {Math.round(Number(selectedRecord.total_paid) || 0).toLocaleString("en-US")}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Remaining Balance</p>
                  <p className="text-lg font-semibold text-green-600">
                    Rs. {Math.round(Number(selectedRecord.remaining) || 0).toLocaleString("en-US")}
                  </p>
                </div>
              </div>
              <Button
                onClick={() => setShowDetails(false)}
                className="w-full mt-6"
              >
                Close
              </Button>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && recordToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-neutral-900 rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                Confirm Delete
              </h3>
              <div className="space-y-4">
                <p className="text-gray-700 dark:text-gray-300">
                  Are you sure you want to delete this salary ledger record?
                </p>
                <div className="bg-gray-50 dark:bg-neutral-800 p-4 rounded-lg">
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Teacher Name</p>
                      <p className="text-gray-900 dark:text-white font-medium">{recordToDelete.teacher_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Period</p>
                      <p className="text-gray-900 dark:text-white font-medium">
                        {MONTHS[recordToDelete.month - 1]} {recordToDelete.year}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Net Salary</p>
                      <p className="text-gray-900 dark:text-white font-medium">
                        Rs. {Math.round(recordToDelete.net_salary).toLocaleString("en-US")}
                      </p>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-red-600 dark:text-red-400">
                  This action cannot be undone.
                </p>
              </div>
              <div className="flex gap-3 mt-6">
                <Button
                  onClick={() => setShowDeleteConfirm(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmDelete}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  Delete
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal && recordToEdit && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-neutral-900 rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                Edit Salary Ledger
              </h3>
              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-neutral-800 p-4 rounded-lg">
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Teacher Name</p>
                      <p className="text-gray-900 dark:text-white font-medium">{recordToEdit.teacher_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Period</p>
                      <p className="text-gray-900 dark:text-white font-medium">
                        {MONTHS[recordToEdit.month - 1]} {recordToEdit.year}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Base Salary</p>
                      <p className="text-gray-900 dark:text-white font-medium">
                        Rs. {Math.round(recordToEdit.base_salary).toLocaleString("en-US")}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Total Allowances
                    </label>
                    <Input
                      type="number"
                      value={editAllowanceTotal}
                      onChange={(e) => setEditAllowanceTotal(e.target.value)}
                      placeholder="0"
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Total Deductions
                    </label>
                    <Input
                      type="number"
                      value={editDeductionTotal}
                      onChange={(e) => setEditDeductionTotal(e.target.value)}
                      placeholder="0"
                      className="w-full"
                    />
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      Net Salary will be recalculated as: Base Salary + Allowances - Deductions
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <Button
                  onClick={() => setShowEditModal(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdateRecord}
                  disabled={isUpdating}
                  className="flex-1"
                >
                  {isUpdating ? "Updating..." : "Update"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewSalary;
