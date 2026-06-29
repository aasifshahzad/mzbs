"use client";
import { ExpenseCategory } from "@/models/expense/expense";
import React, { useEffect, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { ExpenseAPI as API } from "@/api/Expense/ExpenseAPI";
import { useForm } from "react-hook-form";
import { usePrint } from "@/components/print/usePrint";
import { useRole } from "@/context/RoleContext";
import { formatDateToDDMMYY } from "@/utils/dateFormatter";
import { extractArrayData } from "@/utils/apiResponse";
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
import { TableSkeleton } from "@/components/dashboard/Skeleton";

// Form values interface
interface ExpenseFormValues {
  category_id: number;
}

// Generic API response interface
// Interface for expense data items
interface ExpenseDataItem {
  id: number;
  recipt_number?: string | null;
  date: string;
  category: string;
  to_whom: string;
  description: string;
  amount: number;
}

const sortByDateDesc = <T extends { date: string }>(records: T[]) =>
  [...records].sort((left, right) => {
    const leftTime = new Date(left.date).getTime();
    const rightTime = new Date(right.date).getTime();

    if (Number.isNaN(leftTime) && Number.isNaN(rightTime)) return 0;
    if (Number.isNaN(leftTime)) return 1;
    if (Number.isNaN(rightTime)) return -1;

    return rightTime - leftTime;
  });

const getExpenseCategoryIdByName = (
  categories: ExpenseCategory[],
  categoryName: string
) =>
  categories.find((category) => category.expense_cat_name === categoryName)
    ?.expense_cat_name_id;

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
  const [selectedCategory, setSelectedCategory] = useState<string>("0");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize] = useState(10);

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

  // Load categories on first mount and get all expense records
  useEffect(() => {
    getCategories();
    getAllExpense(); // Load all expense records by default
  }, []);

  const getCategories = async () => {
    setIsLoading(true);
    try {
      const res = await API.GetExpenseCategory();
      const categories = extractArrayData<ExpenseCategory>(res);
      setExpenseCategory(categories);
    } catch (error) {
      setExpenseCategory([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getAllExpense = async (page = 1) => {
    setIsLoading(true);
    try {
      const res = await API.GetAllExpenseData(page, pageSize);
      const payload = res?.data;
      const items = Array.isArray(payload?.data)
        ? payload.data
        : extractArrayData<ExpenseDataItem>(res);
      setExpenseData(sortByDateDesc(items as ExpenseDataItem[]));
      setCurrentPage(Number(payload?.page ?? page));
      setTotalPages(Number(payload?.total_pages ?? 1));
    } catch (error) {
      setExpenseData([]);
      setCurrentPage(1);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  };

  const getExpense = async (CategoryId: number, page = 1) => {
    if (CategoryId === 0) {
      getAllExpense(page);
      return;
    }
    setIsLoading(true);
    try {
      const res = await API.GetExpenseData(CategoryId, page, pageSize);
      const payload = res?.data;
      const items = Array.isArray(payload?.data)
        ? payload.data
        : extractArrayData<ExpenseDataItem>(res);
      setExpenseData(sortByDateDesc(items as ExpenseDataItem[]));
      setCurrentPage(Number(payload?.page ?? page));
      setTotalPages(Number(payload?.total_pages ?? 1));
    } catch (error) {
      setExpenseData([]);
      setCurrentPage(1);
      setTotalPages(1);
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
      getAllExpense();
    } catch (error) {
      alert("Failed to delete expense record");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditClick = (expense: ExpenseDataItem) => {
    const matchedCategoryId = getExpenseCategoryIdByName(expenseCategory, expense.category);
    setEditingExpense(expense);
    setEditFormData({
      recipt_number: expense.recipt_number ? String(expense.recipt_number) : "",
      date: expense.date.split("T")[0],
      category_id: matchedCategoryId ? String(matchedCategoryId) : "",
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
        recipt_number: editFormData.recipt_number || null,
        date: editFormData.date,
        to_whom: editFormData.to_whom,
        description: editFormData.description || null,
        amount: parseFloat(editFormData.amount),
        ...(editFormData.category_id
          ? { category_id: Number(editFormData.category_id) }
          : {}),
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
      toast.error("Failed to update expense record");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <Header value="View Expense" />
      <form className="space-y-4 border w-full my-2">
        <div className="space-y-4 px-2 rounded-md">
          <label className="font-bold text-sm dark:text-gray-300">
            Category:{" "}
          </label>
          <select
            {...register("category_id", { valueAsNumber: true })}
            className="w-[14rem] border bg-white rounded-md px-3 py-2 focus:ring focus:ring-indigo-300 dark:bg-background dark:text-gray-300"
            value={selectedCategory}
            onChange={useDebouncedCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
              const value = e.target.value;
              setSelectedCategory(value);
              if (value === "") {
                setExpenseData([]);
                setCurrentPage(1);
                setTotalPages(1);
              } else {
                getExpense(Number(value), 1);
              }
            }, 300)}
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
        {isLoading ? (
          <TableSkeleton rows={8} />
        ) : expenseData.length > 0 ? (
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
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 px-4 no-print">
              <p className="text-sm text-gray-500">Page {currentPage} of {totalPages}</p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => getExpense(Number(selectedCategory), Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1 || isLoading}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => getExpense(Number(selectedCategory), Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages || isLoading}
                >
                  Next
                </Button>
              </div>
            </div>
            <div id="expense-print-area">
              <Table>
                <TableHeader className="bg-primary dark:bg-secondary hover:bg-none">
                  <TableRow>
                    <TableHead className="text-gray-100">Bill number</TableHead>
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
                      <TableCell>{item.recipt_number ?? "-"}</TableCell>
                      <TableCell>{formatDateToDDMMYY(item.date)}</TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell>{item.to_whom}</TableCell>
                      <TableCell>{item.description}</TableCell>
                      <TableCell>{item.amount}</TableCell>
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
                <label className="text-sm font-medium">Bill number</label>
                <Input
                  type="text"
                  value={editFormData.recipt_number}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      recipt_number: e.target.value,
                    })
                  }
                  placeholder="Enter bill number"
                />
              </div>

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
                <label className="text-sm font-medium">Category</label>
                <select
                  value={editFormData.category_id}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, category_id: e.target.value })
                  }
                  className="w-full border rounded-md px-3 py-2 bg-white dark:bg-background dark:text-gray-300"
                >
                  <option value="">Select Category</option>
                  {expenseCategory.map((category) => (
                    <option
                      key={category.expense_cat_name_id}
                      value={category.expense_cat_name_id}
                    >
                      {category.expense_cat_name}
                    </option>
                  ))}
                </select>
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
