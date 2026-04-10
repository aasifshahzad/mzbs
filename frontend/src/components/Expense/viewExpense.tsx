"use client";
import { ExpenseCategory } from "@/models/expense/expense";
import React, { useEffect, useState } from "react";
import { ExpenseAPI as API } from "@/api/Expense/ExpenseAPI";
import { useForm } from "react-hook-form";
import { usePrint } from "@/components/print/usePrint";
import { useRole } from "@/context/RoleContext";
import { formatDateToDDMMYY } from "@/utils/dateFormatter";
import { Printer, Edit2, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Header } from "../dashboard/Header";
import Loader from "../Loader";

// Form values interface
interface ExpenseFormValues {
  category_id: number;
}

// Generic API response interface
interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
}

// Interface for expense data items
interface ExpenseDataItem {
  id: number;
  date: string;
  category: string;
  to_whom: string;
  description: string;
  amount: number;
}

const ViewExpense = () => {
  const {
    register,
    formState: { errors },
  } = useForm<ExpenseFormValues>();
  const { printRecords } = usePrint();
  const { role } = useRole();
  const [isLoading, setIsLoading] = useState(false);
  const [expenseCategory, setExpenseCategory] = useState<ExpenseCategory[]>([]);
  const [expenseData, setExpenseData] = useState<ExpenseDataItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  // Edit modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseDataItem | null>(null);
  const [editFormData, setEditFormData] = useState({
    recipt_number: "",
    date: "",
    category_id: "",
    to_whom: "",
    description: "",
    amount: "",
  });

  // Load categories on first mount (don't load all expenses by default)
  useEffect(() => {
    getCategories();
  }, []);

  const getCategories = async () => {
    setIsLoading(true);
    try {
      const res = (await API.GetExpenseCategory()) as ApiResponse<
        ExpenseCategory[]
      >;
      setExpenseCategory(res.data);
    } catch (error) {
      console.error("Error fetching Expense categories:", error);
      setExpenseCategory([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getAllExpense = async () => {
    setIsLoading(true);
    try {
      // Try wrapper first (existing behavior)
      const res = (await API.GetExpenseData(0)) as ApiResponse<ExpenseDataItem[]>;
      if (res && Array.isArray(res.data) && res.data.length > 0) {
        setExpenseData(res.data);
        return;
      }

      // Fallback: call backend endpoint directly to verify wrapper behavior
      const fallbackUrl = `/expenses/filter_expense?category_id=0`;
      const fallbackRes = await fetch(fallbackUrl, { credentials: "include" });
      if (!fallbackRes.ok) {
        console.error("Fallback request failed:", fallbackRes.status, await fallbackRes.text());
        setExpenseData([]);
        return;
      }
      const fallbackJson = await fallbackRes.json();
      setExpenseData(Array.isArray(fallbackJson) ? fallbackJson : []);
    } catch (error) {
      console.error("Error fetching all Expense data:", error);
      setExpenseData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getExpense = async (CategoryId: number) => {
    if (CategoryId === 0) {
      getAllExpense();
      return;
    }
    setIsLoading(true);
    try {
      // Try wrapper first
      const res = (await API.GetExpenseData(CategoryId)) as ApiResponse<ExpenseDataItem[]>;
      if (res && Array.isArray(res.data)) {
        setExpenseData(res.data);
        return;
      }

      // Fallback to direct fetch with query param
      const fallbackUrl = `/expenses/filter_expense?category_id=${CategoryId}`;
      const fallbackRes = await fetch(fallbackUrl, { credentials: "include" });
      if (!fallbackRes.ok) {
        console.error("Fallback request failed:", fallbackRes.status, await fallbackRes.text());
        setExpenseData([]);
        return;
      }
      const fallbackJson = await fallbackRes.json();
      setExpenseData(Array.isArray(fallbackJson) ? fallbackJson : []);
    } catch (error) {
      console.error("Error fetching Expense data:", error);
      setExpenseData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteExpense = async (expenseId: number) => {
    if (!confirm("Are you sure you want to delete this expense record?")) {
      return;
    }

    setIsLoading(true);
    try {
      await API.DeleteExpense(expenseId);
      // Refresh the data
      getExpense(0);
    } catch (error) {
      console.error("Error deleting expense:", error);
      alert("Failed to delete expense record");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditClick = (expense: ExpenseDataItem) => {
    setEditingExpense(expense);
    setEditFormData({
      recipt_number: String(expense.id),
      date: expense.date.split("T")[0],
      category_id: "",
      to_whom: expense.to_whom,
      description: expense.description || "",
      amount: String(expense.amount),
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateExpense = async () => {
    if (!editingExpense) return;
    setIsLoading(true);
    try {
      const updateData = {
        date: editFormData.date,
        to_whom: editFormData.to_whom,
        description: editFormData.description || null,
        amount: parseFloat(editFormData.amount),
      };
      await API.UpdateExpense(editingExpense.id, updateData);
      toast.success("Expense record updated successfully");
      setIsEditModalOpen(false);
      setEditingExpense(null);
      
      // Refresh the data based on current selection
      if (selectedCategory && selectedCategory !== "") {
        getExpense(Number(selectedCategory));
      } else {
        setExpenseData([]);
      }
    } catch (error) {
      console.error("Error updating expense:", error);
      toast.error("Failed to update expense record");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <Header value="View Expense" />
      <Loader isActive={isLoading} />
      <form className="space-y-4 border w-full my-2">
        <div className="space-y-4 px-2 rounded-md">
          <label className="font-bold text-sm dark:text-gray-300">
            Category:{" "}
          </label>
          <select
            {...register("category_id", { valueAsNumber: true })}
            className="w-[14rem] border bg-white rounded-md px-3 py-2 focus:ring focus:ring-indigo-300 dark:bg-background dark:text-gray-300"
            value={selectedCategory}
            onChange={(e) => {
              const value = e.target.value;
              setSelectedCategory(value);
              if (value === "") {
                setExpenseData([]);
              } else {
                getExpense(Number(value));
              }
            }}
          >
            <option value="" disabled>-- Select Category --</option>
            <option value={0}>All</option>
            {expenseCategory.map((category) => (
              <option
                key={category.expense_cat_name_id}
                value={category.expense_cat_name_id}
              >
                {category.expense_cat_name}
              </option>
            ))}
          </select>
          <p className="text-red-500 text-xs">
            {typeof errors.category_id?.message === "string" &&
              errors.category_id?.message}
          </p>
        </div>
      </form>

      {/* Table to display Expense data */}
      <div className="mt-4 bg-white dark:bg-background rounded-md">
        {expenseData.length > 0 ? (
          <>
            <div className="flex justify-between items-center p-4 no-print">
              <h3 className="text-lg font-semibold">Expense Data</h3>
              <button
                onClick={() => {
                  const meta = `Total records: ${expenseData.length} · Printed: ${new Date().toLocaleDateString()}`;
                  printRecords('expense-print-area', 'Expense Report', meta);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
              >
                <Printer size={16} />
                Print
              </button>
            </div>
            <div id="expense-print-area">
              <Table>
                <TableHeader className="bg-primary dark:bg-secondary hover:bg-none">
                  <TableRow>
                    <TableHead className="text-gray-100">ID</TableHead>
                    <TableHead className="text-gray-100">Date</TableHead>
                    <TableHead className="text-gray-100">Category</TableHead>
                    <TableHead className="text-gray-100">To Whom</TableHead>
                    <TableHead className="text-gray-100">Description</TableHead>
                    <TableHead className="text-gray-100">Amount</TableHead>
                    {(role === "ADMIN" || role === "ACCOUNTANT") && (
                      <TableHead className="text-gray-100 no-print">Actions</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenseData.map((item) => (
                    <TableRow className="h-[1rem]" key={item.id}>
                      <TableCell>{item.id}</TableCell>
                      <TableCell>{formatDateToDDMMYY(item.date)}</TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell>{item.to_whom}</TableCell>
                      <TableCell>{item.description}</TableCell>
                      <TableCell className="flex items-center gap-2">
                        <span>{item.amount}</span>
                      </TableCell>
                      {(role === "ADMIN" || role === "ACCOUNTANT") && (
                        <TableCell className="no-print flex gap-2 items-center">
                          <button
                            onClick={() => handleEditClick(item)}
                            className="p-1 text-blue-600 hover:bg-blue-100 rounded transition"
                            title="Edit"
                          >
                            <Edit2 size={16} />
                          </button>
                          {role === "ADMIN" && (
                            <button
                              onClick={() => handleDeleteExpense(item.id)}
                              className="p-1 text-red-600 hover:bg-red-100 rounded transition"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        ) : (
          <p>No expense records available.</p>
        )}
      </div>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Expense Record</DialogTitle>
          </DialogHeader>
          {editingExpense && (
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Date</label>
                <Input
                  type="date"
                  value={editFormData.date}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, date: e.target.value })
                  }
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Paid To</label>
                <Input
                  value={editFormData.to_whom}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, to_whom: e.target.value })
                  }
                  placeholder="Enter paid to"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Description</label>
                <Input
                  value={editFormData.description}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      description: e.target.value,
                    })
                  }
                  placeholder="Enter description"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Amount</label>
                <Input
                  type="number"
                  value={editFormData.amount}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, amount: e.target.value })
                  }
                  placeholder="Enter amount"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
            >
              Cancel
            </button>
            <Button
              onClick={handleUpdateExpense}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? "Updating..." : "Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ViewExpense;
