"use client";

import { IncomeCategory } from "@/models/income/income";
import React, { useEffect, useState } from "react";
import { IncomeAPI as API } from "@/api/Income/IncomeAPI";
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

interface IncomeFormValues {
  category_id: number;
}

interface IncomeDataItem {
  id: number;
  date: string;
  category: string;
  source: string;
  description: string;
  contact: string;
  amount: number;
}

interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
}

const ViewIncome = () => {
  const {
    register,
    formState: { errors },
  } = useForm<IncomeFormValues>();
  const { printRecords } = usePrint();
  const { role } = useRole();

  const [isLoading, setIsLoading] = useState(false);
  const [incomeCategory, setIncomeCategory] = useState<IncomeCategory[]>([]);
  const [incomeData, setIncomeData] = useState<IncomeDataItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  
  // Edit modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<IncomeDataItem | null>(null);
  const [editFormData, setEditFormData] = useState({
    recipt_number: "",
    date: "",
    category_id: "",
    source: "",
    description: "",
    contact: "",
    amount: "",
  });

  // Load categories on first mount (don't load all incomes by default)
  useEffect(() => {
    getCategories();
  }, []);

  const getCategories = async () => {
    setIsLoading(true);
    try {
      const res = (await API.GetIncomeCategory()) as ApiResponse<IncomeCategory[]>;
      const data = res.data.map((item: IncomeCategory) => ({
        income_cat_name_id: item.income_cat_name_id,
        income_cat_name: item.income_cat_name,
        created_at: item.created_at,
      }));
      setIncomeCategory(data);
    } catch (error) {
      console.error("Error fetching income categories:", error);
      setIncomeCategory([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getAllIncome = async () => {
    setIsLoading(true);
    try {
      // The frontend API wrapper doesn't expose GetAllIncome, use GetIncomeData with 0 (component treats 0 as "All")
      const res = (await API.GetIncomeData(0)) as ApiResponse<IncomeDataItem[]>;
      setIncomeData(res.data);
    } catch (error) {
      console.error("Error fetching all income data:", error);
      setIncomeData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getIncome = async (CategoryId: number) => {
    if (CategoryId === 0) {
      // Special case for "All"
      getAllIncome();
      return;
    }
    setIsLoading(true);
    try {
      const res = (await API.GetIncomeData(CategoryId)) as ApiResponse<IncomeDataItem[]>;
      setIncomeData(res.data);
    } catch (error) {
      console.error("Error fetching income data:", error);
      setIncomeData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteIncome = async (incomeId: number) => {
    if (!confirm("Are you sure you want to delete this income record?")) {
      return;
    }

    setIsLoading(true);
    try {
      await API.DeleteIncome(incomeId);
      // Refresh the data
      getIncome(0);
    } catch (error) {
      console.error("Error deleting income:", error);
      alert("Failed to delete income record");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditClick = (income: IncomeDataItem) => {
    setEditingIncome(income);
    setEditFormData({
      recipt_number: String(income.id),
      date: income.date.split("T")[0], // Format: YYYY-MM-DD
      category_id: "", // Will need to track category_id separately
      source: income.source,
      description: income.description || "",
      contact: income.contact || "",
      amount: String(income.amount),
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateIncome = async () => {
    if (!editingIncome) return;

    setIsLoading(true);
    try {
      const updateData = {
        date: editFormData.date,
        source: editFormData.source,
        description: editFormData.description || null,
        contact: editFormData.contact || null,
        amount: parseFloat(editFormData.amount),
      };

      await API.UpdateIncome(editingIncome.id, updateData);
      toast.success("Income record updated successfully");
      setIsEditModalOpen(false);
      setEditingIncome(null);
      
      // Refresh the data based on current selection
      if (selectedCategory && selectedCategory !== "") {
        getIncome(Number(selectedCategory));
      } else {
        setIncomeData([]);
      }
    } catch (error) {
      console.error("Error updating income:", error);
      toast.error("Failed to update income record");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto">
      <Header value="View Income" />
      <Loader isActive={isLoading} />

      <form className="space-y-4 border w-full my-2">
        <div className="space-y-4 px-2 rounded-md">
          <label className="font-bold text-sm dark:text-gray-300">Category: </label>
          <select
            {...register("category_id", { valueAsNumber: true })}
            className="w-[14rem] border bg-white rounded-md px-3 py-2 focus:ring focus:ring-indigo-300 dark:bg-background dark:text-gray-300"
            value={selectedCategory}
            onChange={(e) => {
              const value = e.target.value;
              setSelectedCategory(value);
              if (value === "") {
                setIncomeData([]);
              } else {
                getIncome(Number(value));
              }
            }}
          >
            <option value="" disabled>-- Select Category --</option>
            <option value={0}>All</option>
            {incomeCategory.map((category) => (
              <option
                key={category.income_cat_name_id}
                value={category.income_cat_name_id}
              >
                {category.income_cat_name}
              </option>
            ))}
          </select>
          <p className="text-red-500 text-xs">
            {typeof errors.category_id?.message === "string" &&
              errors.category_id?.message}
          </p>
        </div>
      </form>

      <div className="mt-4 container mx-auto bg-white dark:bg-background rounded-md">
        {incomeData.length > 0 ? (
          <>
            <div className="flex justify-between items-center p-4 no-print">
              <h3 className="text-lg font-semibold">Income Data</h3>
              <button
                onClick={() => {
                  const meta = `Total records: ${incomeData.length} · Printed: ${new Date().toLocaleDateString()}`;
                  printRecords('income-print-area', 'Income Report', meta);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
              >
                <Printer size={16} />
                Print
              </button>
            </div>
            <div id="income-print-area">
              <Table>
                <TableHeader className="bg-primary dark:bg-secondary hover:bg-none">
                  <TableRow>
                    <TableHead className="text-gray-100">ID</TableHead>
                    <TableHead className="text-gray-100">Date</TableHead>
                    <TableHead className="text-gray-100">Category</TableHead>
                    <TableHead className="text-gray-100">Source</TableHead>
                    <TableHead className="text-gray-100">Description</TableHead>
                    <TableHead className="text-gray-100">Contact</TableHead>
                    <TableHead className="text-gray-100">Amount</TableHead>
                    {(role === "ADMIN" || role === "ACCOUNTANT") && (
                      <TableHead className="text-gray-100 no-print">Actions</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incomeData.map((item) => (
                    <TableRow className="h-[1rem]" key={item.id}>
                      <TableCell>{item.id}</TableCell>
                      <TableCell>{formatDateToDDMMYY(item.date)}</TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell>{item.source}</TableCell>
                      <TableCell>{item.description}</TableCell>
                      <TableCell>{item.contact}</TableCell>
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
                              onClick={() => handleDeleteIncome(item.id)}
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
          <p>No income records available.</p>
        )}
      </div>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Income Record</DialogTitle>
          </DialogHeader>
          {editingIncome && (
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
                <label className="text-sm font-medium">Source</label>
                <Input
                  value={editFormData.source}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, source: e.target.value })
                  }
                  placeholder="Enter source"
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
                <label className="text-sm font-medium">Contact</label>
                <Input
                  value={editFormData.contact}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, contact: e.target.value })
                  }
                  placeholder="Enter contact"
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
              onClick={handleUpdateIncome}
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

export default ViewIncome;

