"use client";

import * as React from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getFilteredRowModel,
} from "@tanstack/react-table";
import { Search, LoaderIcon, Eye, Trash2, Printer, Edit2 } from "lucide-react";
import { StudentAPI as API } from "@/api/Student/StudentsAPI";
import { usePrint } from "@/components/print/usePrint";
export { format } from "date-fns";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StudentModel } from "@/models/students/Student";
import { Select, SelectOption as SelectComponentOption } from "@/components/Select";
import { ClassNameAPI } from "@/api/Classname/ClassNameAPI";
import { useEffect, useState } from "react";
import AddNewStudent from "./CreateStudent";
import DeleteStudentModal from "./DeleteStudentModal";
import { toast } from "sonner";
import Card  from "@/components/ui/card";
import {Pagination} from "@/components/ui/pagination";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { useRole } from "@/context/RoleContext";

export default function ModernStudentTable() {
  const [globalFilter, setGlobalFilter] = useState("");
  const [data, setData] = useState<StudentModel[]>([]);
  const { printRecords } = usePrint();
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<StudentModel | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [modalStudent, setModalStudent] = useState<{ id: number; name: string } | null>(null);
  const { role } = useRole();
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [classNameList, setClassNameList] = useState<SelectComponentOption[]>([]);

  // Get current user ID from localStorage
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setCurrentUserId(user?.id || null);
  }, []);

  // Fetch class names for the dropdown
  useEffect(() => {
    const fetchClassNames = async () => {
      try {
        const response = (await ClassNameAPI.Get()) as { data: Array<{ class_name_id: number; class_name: string }> };
        if (response.data) {
          setClassNameList(
            response.data.map((item) => ({
              id: item.class_name,
              title: item.class_name,
            }))
          );
        }
      } catch (error) {
        console.error("Error fetching class names:", error);
      }
    };
    fetchClassNames();
  }, []);

  // --- Edit state ---
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentModel | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<StudentModel>>({});
  const [editLoading, setEditLoading] = useState(false);
  const [editCalculatedAge, setEditCalculatedAge] = useState<string>("");

  const handleEditClick = (student: StudentModel) => {
    setEditingStudent(student);
    setEditFormData({ ...student });
    // Calculate and set initial age
    if (student.student_date_of_birth) {
      setEditCalculatedAge(calculateAge(student.student_date_of_birth));
    }
    setIsEditModalOpen(true);
  };

  // Function to calculate age from date of birth in detailed format
  const calculateAge = (dob: string): string => {
    if (!dob) return "";
    const birthDate = new Date(dob);
    const today = new Date();
    
    if (isNaN(birthDate.getTime())) {
      return "Invalid date";
    }

    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();
    let days = today.getDate() - birthDate.getDate();

    // Adjust for negative days
    if (days < 0) {
      months--;
      const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      days += prevMonth.getDate();
    }

    // Adjust for negative months
    if (months < 0) {
      years--;
      months += 12;
    }

    // Handle edge case where years is negative
    if (years < 0) {
      return "0 years 0 months 0 days";
    }

    return `${years} year${years !== 1 ? 's' : ''} ${months} month${months !== 1 ? 's' : ''} ${days} day${days !== 1 ? 's' : ''}`;
  };

  // Watch DOB changes in edit form and update age
  useEffect(() => {
    if (editFormData.student_date_of_birth) {
      const newAge = calculateAge(editFormData.student_date_of_birth);
      setEditCalculatedAge(newAge);
    }
  }, [editFormData.student_date_of_birth]);

  const handleEditSave = async () => {
    if (!editingStudent) return;
    setEditLoading(true);
    try {
      await API.Update(Number(editingStudent.student_id), editFormData);
      toast.success("Student updated successfully", { position: "bottom-center" });
      setIsEditModalOpen(false);
      GetData();
    } catch (error) {
      toast.error("Failed to update student", { position: "bottom-center" });
    } finally {
      setEditLoading(false);
    }
  };

  // Define formDeleteHandler
  const formDeleteHandler = async (reason: string) => {
    if (!modalStudent || !currentUserId) return;
    
    try {
      const payload = {
        reason,
        deleted_by: currentUserId
      };
      const response = await API.Delete(modalStudent.id, payload);
      if (response && typeof response === 'object' && 'status' in response) {
        if (response.status === 200) {
          toast.success("Record deleted successfully", {
            position: "bottom-center",
          });
          GetData(); // Refresh data after delete
          setModalStudent(null);
        } else {
          toast.error("An error occurred", {
            position: "bottom-center",
          });
        }
      }
    } catch (error) {
      console.log("Error on Delete", error);
      toast.error("Failed to delete student", {
        position: "bottom-center",
      });
    }
  };

  // Define columns after formDeleteHandler
  const columns: ColumnDef<StudentModel>[] = [
    {
      accessorKey: "student_id",
      header: "Sr. No",
      cell: ({ row }) => <div className="font-medium">{row.getValue("student_id")}</div>,
    },
    {
      accessorKey: "student_name",
      header: "Student Name",
    },
    {
      accessorKey: "student_age",
      header: "Student Age",
      cell: ({ row }) => {
        const dateOfBirth = row.original.student_date_of_birth;
        const age = dateOfBirth ? calculateAge(dateOfBirth) : "N/A";
        return <div className="font-medium">{age}</div>;
      },
    },
    {
      accessorKey: "student_gender",
      header: "Student Gender",
    },
    {
      accessorKey: "class_name",
      header: "Student Class Name",
    },
    {
      accessorKey: "student_city",
      header: "Student City",
    },
    {
      accessorKey: "father_name",
      header: "Father Name",
    },
    {
      accessorKey: "father_contact",
      header: "Father Contact",
    },
    {
      accessorKey: "Action",
      header: "Action",
      cell: ({ row }) => {
        const canEdit   = role === "ADMIN" || role === "PRINCIPAL";
        const canDelete = role === "ADMIN";

        return (
          <div className="flex gap-2 items-center no-print">
            {/* View — all roles */}
            <button
              onClick={() => {
                setSelectedStudent(row.original);
                setShowDetailsDialog(true);
              }}
              className="p-1 text-gray-600 hover:bg-gray-100 rounded transition"
              title="View"
            >
              <Eye size={16} />
            </button>

            {/* Edit — ADMIN and PRINCIPAL */}
            {canEdit && (
              <button
                onClick={() => handleEditClick(row.original)}
                className="p-1 text-blue-600 hover:bg-blue-100 rounded transition"
                title="Edit"
              >
                <Edit2 size={16} />
              </button>
            )}

            {/* Delete — ADMIN only */}
            {canDelete && (
              <button
                onClick={() => setModalStudent({ id: Number(row.original.student_id), name: row.original.student_name })}
                className="p-1 text-red-600 hover:bg-red-100 rounded transition"
                title="Delete"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        );
      }
    }
  ];

  // Fetch data from API
  const GetData = async () => {
    setLoading(true);
    try {
      const response = await API.Get() as { data: StudentModel[] };
      // Sort students by student_id (serial number)
      const sortedData = response.data.sort((a, b) => {
        // Try numeric sorting first
        const aNum = parseInt(a.student_id, 10);
        const bNum = parseInt(b.student_id, 10);
        
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return aNum - bNum;
        }
        
        // Fall back to string sorting
        return a.student_id.localeCompare(b.student_id);
      });
      setData(sortedData);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    GetData();
  }, []);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
  });

  return (
    <Card className="mt-2 p-3 sm:p-6 w-full bg-white dark:bg-background rounded-lg shadow-lg">
      {(role === "ADMIN" || role === "PRINCIPAL") && <AddNewStudent onClassAdded={GetData} />}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 sm:h-5 sm:w-5" />
            <Input
              placeholder="Search Students..."
              value={globalFilter ?? ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGlobalFilter(e.target.value)}
              className="pl-10 pr-4 py-2 w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-200 transition-all duration-300"
            />
          </div>
          {data.length > 0 && (
            <button
              onClick={() => {
                const meta = `Total records: ${data.length} · Printed: ${new Date().toLocaleDateString()}`;
                printRecords('student-print-area', 'Student Report', meta);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition whitespace-nowrap"
            >
              <Printer size={16} />
              Print
            </button>
          )}
        </div>
      </div>

      {/* Mobile: Card View, Desktop: Table View */}
      {/* Table rendering - Hidden on mobile, visible on sm and up */}
      <div className="hidden sm:block w-full rounded-md border border-gray-200 transition-shadow duration-300 hover:shadow-md overflow-x-auto">
        <div id="student-print-area">
          <Table className="w-full whitespace-nowrap scroll-smooth">
          <TableHeader className="bg-primary hover:bg-none text-white sticky top-0 z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={`font-bold text-white px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-xs sm:text-sm ${
                      header.column.columnDef.id === "Action" ? "no-print" : ""
                    }`}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-4">
                  <div className="flex justify-center">
                    <LoaderIcon className="animate-spin w-8 h-8 sm:w-10 sm:h-10" />
                  </div>
                </TableCell>
              </TableRow>
            ) : data?.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-900">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell 
                      key={cell.id} 
                      className={`py-2 px-2 sm:px-3 md:px-4 text-xs sm:text-sm ${
                        cell.column.columnDef.id === "Action" ? "no-print" : ""
                      }`}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-gray-500 py-4">
                  No results found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        </div>
      </div>

      {/* Mobile Card View - visible only on small screens */}
      <div className="sm:hidden space-y-3">
        {loading ? (
          <div className="flex justify-center py-8">
            <LoaderIcon className="animate-spin w-8 h-8" />
          </div>
        ) : data?.length > 0 ? (
          table.getRowModel().rows.map((row) => (
            <div
              key={row.id}
              className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-3 space-y-2"
            >
              <div className="flex justify-between items-start gap-2">
                <div className="flex-1">
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Sr. No</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {row.original.student_id}
                  </p>
                </div>
                <div className="flex gap-2">
                  {/* View — all roles */}
                  <button
                    onClick={() => {
                      setSelectedStudent(row.original);
                      setShowDetailsDialog(true);
                    }}
                    className="p-1 text-gray-600 hover:bg-gray-100 rounded transition"
                    title="View"
                  >
                    <Eye size={16} />
                  </button>

                  {/* Edit — ADMIN and PRINCIPAL */}
                  {(role === "ADMIN" || role === "PRINCIPAL") && (
                    <button
                      onClick={() => handleEditClick(row.original)}
                      className="p-1 text-blue-600 hover:bg-blue-100 rounded transition"
                      title="Edit"
                    >
                      <Edit2 size={16} />
                    </button>
                  )}

                  {/* Delete — ADMIN only */}
                  {role === "ADMIN" && (
                    <button
                      onClick={() => setModalStudent({ id: Number(row.original.student_id), name: row.original.student_name })}
                      className="p-1 text-red-600 hover:bg-red-100 rounded transition"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="font-medium text-gray-600 dark:text-gray-400">Name</p>
                  <p className="text-gray-900 dark:text-white truncate">{row.original.student_name}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-600 dark:text-gray-400">Class</p>
                  <p className="text-gray-900 dark:text-white truncate">{row.original.class_name}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-600 dark:text-gray-400">Age</p>
                  <p className="text-gray-900 dark:text-white">{row.original.student_date_of_birth ? calculateAge(row.original.student_date_of_birth) : "N/A"}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-600 dark:text-gray-400">Gender</p>
                  <p className="text-gray-900 dark:text-white">{row.original.student_gender}</p>
                </div>
                <div className="col-span-2">
                  <p className="font-medium text-gray-600 dark:text-gray-400">City</p>
                  <p className="text-gray-900 dark:text-white truncate">{row.original.student_city}</p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">No results found.</div>
        )}
      </div>

      {/* Pagination */}
      {!loading && data?.length > 0 && (
        <>
          <Pagination
            className="flex mt-4"
            currentPage={table.getState().pagination.pageIndex + 1}
            totalPages={Math.ceil((table?.getFilteredRowModel()?.rows?.length || 1) / table.getState().pagination.pageSize)}
            onPageChange={(page) => {
              table.setPageIndex(page - 1);
            }}
          />
          <div className="flex justify-start text-sm text-gray-500 ">
            Showing{" "}
            {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}{" "}
            to{" "}
            {Math.min(
              (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
              table?.getFilteredRowModel()?.rows?.length || 0
            )}{" "}
            of {table?.getFilteredRowModel()?.rows?.length || 0} results
          </div>
        </>
      )}

      {/* Student Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Student Details</DialogTitle>
            <DialogClose />
          </DialogHeader>
          {selectedStudent && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
              {/* Student Information Section */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 border-b pb-2">
                    Student Information
                  </h3>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">Student ID</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedStudent.student_id}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">Student Name</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedStudent.student_name}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">Date of Birth</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {new Date(selectedStudent.student_date_of_birth).toLocaleDateString("en-GB")}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">Age</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{selectedStudent.student_date_of_birth ? calculateAge(selectedStudent.student_date_of_birth) : "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">Gender</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{selectedStudent.student_gender}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">Education</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{selectedStudent.student_education}</p>
                </div>
              </div>

              {/* Additional Information Section */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 border-b pb-2">
                    Additional Information
                  </h3>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">Class Name</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{selectedStudent.class_name}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">City</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{selectedStudent.student_city}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">Address</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{selectedStudent.student_address}</p>
                </div>
              </div>

              {/* Father Information Section */}
              <div className="space-y-4 md:col-span-2">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 border-b pb-2">
                    Father Information
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase">Father Name</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{selectedStudent.father_name}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase">Father Contact</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{selectedStudent.father_contact}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase">Father Occupation</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{selectedStudent.father_occupation}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase">Father CNIC</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{selectedStudent.father_cnic}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase">Father Caste Name</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{selectedStudent.father_cast_name}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Student Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
          </DialogHeader>

          {editingStudent && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">

              {/* Student Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 border-b pb-2">
                  Student Information
                </h3>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500 uppercase">Student Name</label>
                  <Input value={editFormData.student_name ?? ""} onChange={(e) => setEditFormData({ ...editFormData, student_name: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500 uppercase">Date of Birth</label>
                  <Input type="date" value={editFormData.student_date_of_birth ?? ""} onChange={(e) => setEditFormData({ ...editFormData, student_date_of_birth: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500 uppercase">Age</label>
                  <Input
                    className="bg-gray-100 dark:bg-gray-800 cursor-not-allowed"
                    value={editCalculatedAge || ""}
                    readOnly
                  />
                  <p className="text-gray-500 text-xs mt-1">
                    {editCalculatedAge && editCalculatedAge !== "Invalid date" ? editCalculatedAge : "Select DOB to calculate"}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500 uppercase">Gender</label>
                  <Input value={editFormData.student_gender ?? ""} onChange={(e) => setEditFormData({ ...editFormData, student_gender: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500 uppercase">Education</label>
                  <Input value={editFormData.student_education ?? ""} onChange={(e) => setEditFormData({ ...editFormData, student_education: e.target.value })} />
                </div>
              </div>

              {/* Additional Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 border-b pb-2">
                  Additional Information
                </h3>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500 uppercase">Class Name</label>
                  <Select
                    options={classNameList}
                    value={editFormData.class_name ?? ""}
                    onChange={(e) => setEditFormData({ ...editFormData, class_name: e.target.value })}
                    DisplayItem="title"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500 uppercase">City</label>
                  <Input value={editFormData.student_city ?? ""} onChange={(e) => setEditFormData({ ...editFormData, student_city: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500 uppercase">Address</label>
                  <Input value={editFormData.student_address ?? ""} onChange={(e) => setEditFormData({ ...editFormData, student_address: e.target.value })} />
                </div>
              </div>

              {/* Father Information */}
              <div className="space-y-4 md:col-span-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 border-b pb-2">
                  Father Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500 uppercase">Father Name</label>
                    <Input value={editFormData.father_name ?? ""} onChange={(e) => setEditFormData({ ...editFormData, father_name: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500 uppercase">Father Contact</label>
                    <Input value={editFormData.father_contact ?? ""} onChange={(e) => setEditFormData({ ...editFormData, father_contact: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500 uppercase">Father Occupation</label>
                    <Input value={editFormData.father_occupation ?? ""} onChange={(e) => setEditFormData({ ...editFormData, father_occupation: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500 uppercase">Father CNIC</label>
                    <Input value={editFormData.father_cnic ?? ""} onChange={(e) => setEditFormData({ ...editFormData, father_cnic: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500 uppercase">Father Caste Name</label>
                    <Input value={editFormData.father_cast_name ?? ""} onChange={(e) => setEditFormData({ ...editFormData, father_cast_name: e.target.value })} />
                  </div>
                </div>
              </div>

            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t mt-2">
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditSave} disabled={editLoading}>
              {editLoading ? <LoaderIcon className="animate-spin w-4 h-4 mr-2" /> : null}
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Student Modal */}
      {modalStudent && (
        <DeleteStudentModal
          studentId={modalStudent.id}
          studentName={modalStudent.name}
          onConfirm={formDeleteHandler}
          onClose={() => setModalStudent(null)}
        />
      )}
    </Card>
  );
}
