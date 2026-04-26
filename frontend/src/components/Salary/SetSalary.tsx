"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Header } from "@/components/dashboard/Header";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { TeacherNameAPI } from "@/api/Teacher/TeachetAPI";
import { TeacherModel } from "@/models/teacher/Teacher";
import { SalaryAPI, TeacherSalaryResponse, TeacherSalaryCreate } from "@/api/Salary/SalaryAPI";
import { useRole } from "@/context/RoleContext";
import { Edit2, Trash2, RefreshCw } from "lucide-react";

interface SetSalaryForm {
  teacher_id: string;
  teacher_name: string;
  base_salary: string;
  effective_from: string;
}

const SetSalary = () => {
  const { role } = useRole();
  const isAdmin = role === "ADMIN";

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setValue,
    watch,
  } = useForm<SetSalaryForm>();

  const [isLoading, setIsLoading] = useState(false);
  const [teachers, setTeachers] = useState<TeacherModel[]>([]);
  const [isFetchingTeachers, setIsFetchingTeachers] = useState(true);
  const [salaryRecords, setSalaryRecords] = useState<TeacherSalaryResponse[]>([]);
  const [isFetchingRecords, setIsFetchingRecords] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  // Helper function to format date as d/m/yy
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString().slice(-2);
    return `${day}/${month}/${year}`;
  };
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const selectedTeacherId = watch("teacher_id");

  const fetchTeachers = async () => {
    try {
      setIsFetchingTeachers(true);
      const response = await TeacherNameAPI.Get();
      console.log("Teacher API Response:", response);
      
      if (response && response.data) {
        let teachersList: TeacherModel[] = [];
        
        if (Array.isArray(response.data)) {
          teachersList = response.data;
        } else if (response.data && typeof response.data === 'object') {
          // If it's a single object, wrap it in an array
          teachersList = [response.data as TeacherModel];
        }
        
        console.log("Processed Teachers List:", teachersList);
        setTeachers(teachersList);
        
        if (teachersList.length === 0) {
          toast.warning("No teachers found");
        }
      } else {
        console.warn("No data in response:", response);
        toast.error("Failed to load teachers");
      }
    } catch (error) {
      console.error("Error fetching teachers:", error);
      toast.error("Failed to load teachers");
      setTeachers([]);
    } finally {
      setIsFetchingTeachers(false);
    }
  };

  const refreshSalaryRecords = async () => {
    try {
      setIsFetchingRecords(true);
      const records = await SalaryAPI.getAllTeacherSalaries();
      setSalaryRecords(records);
    } catch (error) {
      console.error("Error fetching teacher salary records:", error);
      toast.error("Failed to load teacher salary records");
    } finally {
      setIsFetchingRecords(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  useEffect(() => {
    refreshSalaryRecords();
  }, []);

  const onSubmit = async (data: SetSalaryForm) => {
    setIsLoading(true);
    try {
      const selectedTeacher = teachers.find(
        (t) => t.teacher_name_id.toString() === data.teacher_id
      );
      
      if (!selectedTeacher) {
        toast.error("Please select a valid teacher");
        setIsLoading(false);
        return;
      }

      if (isEditing && editingId) {
        // Update existing salary
        await SalaryAPI.updateTeacherSalary(editingId, {
          base_salary: parseFloat(data.base_salary),
          effective_from: data.effective_from,
        });
        toast.success("Salary updated successfully!");
        setIsEditing(false);
        setEditingId(null);
      } else {
        // Create new salary
        await SalaryAPI.createTeacherSalary({
          teacher_id: parseInt(data.teacher_id),
          base_salary: parseFloat(data.base_salary),
          effective_from: data.effective_from,
        });
        toast.success("Teacher salary set successfully!");
      }

      // Refresh the records
      await refreshSalaryRecords();
      reset();
    } catch (error) {
      console.error("Error setting salary:", error);
      toast.error(isEditing ? "Failed to update salary" : "Failed to set salary");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (record: TeacherSalaryResponse) => {
    if (!isAdmin) {
      toast.error("Only admin can edit salary records");
      return;
    }

    if (!record?.id) {
      toast.error("Invalid salary record selected for editing");
      return;
    }

    setIsEditing(true);
    setEditingId(record.id);
    setValue("teacher_id", record.teacher_id?.toString() ?? "", {
      shouldValidate: true,
      shouldDirty: true,
    });
    setValue("base_salary", record.base_salary?.toString() ?? "", {
      shouldValidate: true,
      shouldDirty: true,
    });
    setValue("effective_from", record.effective_from ?? "", {
      shouldValidate: true,
      shouldDirty: true,
    });

    toast.success("Loaded salary record for editing");

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: number) => {
    if (!isAdmin) {
      toast.error("Only admin can delete salary records");
      return;
    }

    if (window.confirm("Are you sure you want to delete this salary record? This will permanently delete all related salary logs, payments, allowances, and deductions for this teacher.")) {
      try {
        setIsDeleting(true);
        await SalaryAPI.deleteTeacherSalary(id);
        toast.success("Salary record deleted successfully!");
        await refreshSalaryRecords();
      } catch (error) {
        console.error("Error deleting salary:", error);
        toast.error("Failed to delete salary record");
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditingId(null);
    reset();
  };

  return (
    <div className="w-full">
      <Header value="Set Teacher Salary" />
      
      <div className="p-4 sm:p-6 space-y-6">
        {/* Form Section - Only visible to Admin */}
        {isAdmin && (
          <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-md p-4 sm:p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              {isEditing ? "Edit Teacher Salary" : "Set Teacher Base Salary"}
            </h3>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Teacher Selection */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-200">
                Select Teacher
              </label>
              <select
                {...register("teacher_id", {
                  required: "Teacher is required",
                })}
                disabled={isFetchingTeachers || isEditing}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-neutral-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">
                  {isFetchingTeachers ? "Loading teachers..." : teachers.length === 0 ? "No teachers available" : "Choose a teacher"}
                </option>
                {teachers && teachers.length > 0 && teachers.map((teacher) => (
                  <option 
                    key={teacher.teacher_name_id} 
                    value={String(teacher.teacher_name_id)}
                  >
                    {teacher.teacher_name}
                  </option>
                ))}
              </select>
              {errors.teacher_id && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors.teacher_id.message}
                </p>
              )}
            </div>

            {/* Base Salary */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-200">
                Base Salary
              </label>
              <Input
                type="number"
                step="0.01"
                placeholder="Enter base salary amount"
                {...register("base_salary", {
                  required: "Base salary is required",
                  pattern: {
                    value: /^[0-9]+(\.[0-9]{1,2})?$/,
                    message: "Invalid salary amount",
                  },
                })}
                className="w-full"
              />
              {errors.base_salary && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors.base_salary.message}
                </p>
              )}
            </div>

            {/* Effective From Date */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-200">
                Effective From
              </label>
              <Input
                type="date"
                {...register("effective_from", {
                  required: "Effective from date is required",
                })}
                className="w-full"
              />
              {errors.effective_from && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors.effective_from.message}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex gap-4">
              <Button
                type="submit"
                disabled={isLoading || isFetchingTeachers}
                className="px-6 py-2"
              >
                {isLoading ? (isEditing ? "Updating..." : "Setting...") : isEditing ? "Update Salary" : "Set Base Salary"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => isEditing ? handleCancel() : reset()}
                className="px-6 py-2"
              >
                {isEditing ? "Cancel" : "Clear"}
              </Button>
            </div>
          </form>
          </div>
        )}

        {/* Salary Records Table - Visible to all roles */}
        <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-md p-4 sm:p-6 overflow-x-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              All Teacher Salary Records
            </h3>
            <button
              onClick={refreshSalaryRecords}
              disabled={isFetchingRecords}
              className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 rounded transition disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`w-5 h-5 ${isFetchingRecords ? "animate-spin" : ""}`} />
            </button>
          </div>

          {isFetchingRecords ? (
            <div className="text-center py-8 text-gray-600 dark:text-gray-400">
              Loading salary records...
            </div>
          ) : salaryRecords.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-2 font-semibold text-gray-700 dark:text-gray-200">
                    Serial Number
                  </th>
                  <th className="text-left py-3 px-2 font-semibold text-gray-700 dark:text-gray-200">
                    Teacher Name
                  </th>
                  <th className="text-left py-3 px-2 font-semibold text-gray-700 dark:text-gray-200">
                    Base Salary
                  </th>
                  <th className="text-left py-3 px-2 font-semibold text-gray-700 dark:text-gray-200">
                    Effective From
                  </th>
                  {isAdmin && (
                    <th className="text-left py-3 px-2 font-semibold text-gray-700 dark:text-gray-200">
                      Action
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {salaryRecords.map((record, index) => (
                  <tr
                    key={record.id}
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-neutral-800"
                  >
                    <td className="py-3 px-2 text-gray-900 dark:text-gray-100">
                      {index + 1}
                    </td>
                    <td className="py-3 px-2 text-gray-900 dark:text-gray-100">
                      {record.teacher_name}
                    </td>
                    <td className="py-3 px-2 text-gray-900 dark:text-gray-100 font-medium">
                      Rs. {Math.round(record.base_salary).toLocaleString("en-US")}
                    </td>
                    <td className="py-3 px-2 text-gray-900 dark:text-gray-100">
                      {formatDate(record.effective_from)}
                    </td>
                    {isAdmin && (
                      <td className="py-3 px-2 flex gap-2">
                        <button
                          onClick={() => handleEdit(record)}
                          disabled={isEditing}
                          className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 rounded transition disabled:opacity-50"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(record.id)}
                          disabled={isDeleting}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded transition disabled:opacity-50"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-8 text-gray-600 dark:text-gray-400">
              {isAdmin ? "No teacher salary records found. Create one using the form above." : "No teacher salary records found."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SetSalary;
