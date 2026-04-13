"use client";
import type React from "react";
import { useState, useEffect } from "react";
import {
  AlertCircle,
  Check,
  Clock,
  ChevronLeft,
  ChevronRight,
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectOption as SelectComponentOption } from "../Select";
import { useForm } from "react-hook-form";
import { AttendanceAPI as API } from "@/api/Attendance/AttendanceAPI";
import { ClassNameAPI as API2 } from "@/api/Classname/ClassNameAPI";
import { AttendanceTimeAPI as API13 } from "@/api/AttendaceTime/attendanceTimeAPI";
import { TeacherNameAPI as API4 } from "@/api/Teacher/TeachetAPI";
import { StudentAPI as API5 } from "@/api/Student/StudentsAPI";
import { usePrint } from "@/components/print/usePrint";
import { toast } from "sonner";
import { ChevronsUpDown } from "lucide-react";
import { cn } from "@/libs/utils";
import EditAttendance from "./EditAttendance";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import DelConfirmMsg from "../DelConfMsg";

// Define the AttendanceRecord interface
interface AttendanceRecord {
  attendance_id: number;
  attendance_date: string;
  attendance_time: string;
  attendance_class: string;
  attendance_teacher: string;
  attendance_student: string;
  attendance_std_fname: string;
  attendance_value: string;
}

interface FilteredAttendance {
  attendance_date: string;
  attendance_time_id: number;
  class_name_id: number;
  teacher_name_id: number;
  student_id: number;
  father_name: string;
  attendance_value_id: number;
}

interface ClassNameResponse {
  class_name_id: number;
  class_name: string;
}

interface AttendanceTimeResponse {
  attendance_time_id: number;
  attendance_time: string;
}

interface TeacherResponse {
  teacher_name_id: number;
  teacher_name: string;
}

interface StudentResponse {
  student_id: number;
  student_name: string;
}

interface APIError {
  response: {
    data: {
      message: string;
    };
  };
}

const AttendanceTable: React.FC = () => {
  const {
    register,
    setValue: setFormValue,
    formState: { errors },
    handleSubmit,
  } = useForm<FilteredAttendance>();
  const { printRecords } = usePrint();
  const [isLoading, setIsLoading] = useState(false);
  const [classTimeList, setClassTimeList] = useState<SelectComponentOption[]>(
    []
  );
  const [classNameList, setClassNameList] = useState<SelectComponentOption[]>(
    []
  );
  const [teacherNameList, setTeacherNameList] = useState<
    SelectComponentOption[]
  >([]);
  const [attendanceRecords, setAttendanceRecords] = useState<
    AttendanceRecord[]
  >([]);
  const [formRefresh, setFormRefresh] = useState(true);
  const [studentsList, setStudentsList] = useState<SelectComponentOption[]>([]);
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");

  const handleAttendanceUpdate = async () => {
    setFormRefresh((prev) => !prev);
    // Re-fetch attendance data with current filters
    const formData = {
      attendance_date: "",
      attendance_time_id: 0,
      class_name_id: 0,
      teacher_name_id: 0,
      student_id: Number(value) || 0,
      father_name: "",
      attendance_value_id: 0,
    };
    await HandleSubmitForStudentGet(formData);
  };

  // Move columns definition here, after handleAttendanceUpdate
  const columns: ColumnDef<AttendanceRecord>[] = [
    {
      accessorKey: "sr_no",
      header: "Sr.No",
      cell: ({ row }) => {
        return <span className="font-medium">{row.index + 1}</span>;
      },
    },
    {
      accessorKey: "attendance_id",
      header: "ID",
      cell: ({ row }) => {
        const id = row.getValue("attendance_id") as number;
        return (
          <span className="font-medium">#{id.toString().padStart(4, "0")}</span>
        );
      },
    },
    {
      accessorKey: "attendance_date",
      header: "Date",
      cell: ({ row }) => {
        const date = row.getValue("attendance_date") as string;
        return new Date(date).toLocaleDateString();
      },
    },
    {
      accessorKey: "attendance_time",
      header: "Time",
    },
    {
      accessorKey: "attendance_class",
      header: "Class",
    },
    {
      accessorKey: "attendance_teacher",
      header: "Teacher",
    },
    {
      accessorKey: "attendance_student",
      header: "Student",
    },
    {
      accessorKey: "attendance_std_fname",
      header: "Father Name",
    },
    {
      accessorKey: "attendance_value",
      header: "Status",
      cell: ({ row }) => {
        const value = (
          row.getValue("attendance_value") as string
        ).toLowerCase();
        return (
          <div className="flex items-center">
            {value === "present" ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-transparent text-green-700">
                <Check className="w-3 h-3 mr-1" />
                Present
              </span>
            ) : value === "absent" ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-transparent text-red-700">
                <AlertCircle className="w-3 h-3 mr-1" />
                Absent
              </span>
            ) : value === "leave" ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-50 dark:bg-transparent text-yellow-700">
                <Clock className="w-3 h-3 mr-1" />
                Late
              </span>
            ) : value === "leave" ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 dark:bg-transparent text-orange-700">
                <AlertCircle className="w-3 h-3 mr-1" />
                Leave
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-50 dark:bg-transparent text-gray-700">
                <Clock className="w-3 h-3 mr-1" />
                Other
              </span>
            )}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="no-print flex justify-center items-center gap-2">
          <EditAttendance
            attendanceId={row.original.attendance_id}
            onUpdate={handleAttendanceUpdate}
          />
          <DelConfirmMsg
            rowId={row.original.attendance_id}
            OnDelete={(confirmed) => {
              if (confirmed) {
                handleDeleteAttendance(row.original.attendance_id);
              }
            }}
          />
        </div>
      ),
    },
  ];

  useEffect(() => {
    // Load dropdown data here
    GetClassName();
    GetClassTime();
    GetTeacherName();
    GetStudents();
  }, [formRefresh]); // Add formRefresh dependency

  const handleDeleteAttendance = async (attendanceId: number) => {
    try {
      const response = await API.Delete(attendanceId);
      if (response.status === 200) {
        toast.success("Attendance deleted successfully", {
          position: "bottom-center",
          duration: 5000,
        });
        handleAttendanceUpdate();
      } else {
        toast.error("Failed to delete attendance");
      }
    } catch (error) {
      console.error("Error deleting attendance:", error);
    }
  };

  const GetStudents = async () => {
    setIsLoading(true);
    try {
      const response = (await API5.Get()) as { data: StudentResponse[] };
      // Add "All" option at the beginning
      const allStudents = [
        { student_id: 0, student_name: "All Students" },
        ...response.data,
      ];
      setStudentsList(
        allStudents.map((student) => ({
          id: student.student_id,
          title: student.student_name,
        }))
      );
    } catch (error) {
      console.error("Error fetching students:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const GetClassName = async () => {
    try {
      setIsLoading(true);
      const response = (await API2.Get()) as { data: ClassNameResponse[] };
      response.data.unshift({
        class_name_id: 0,
        class_name: "All",
      });
      if (response.data && Array.isArray(response.data)) {
        setClassNameList(
          response.data.map((item: ClassNameResponse) => ({
            id: item.class_name_id,
            title: item.class_name,
          }))
        );
      }
    } catch (error) {
      console.error("Error fetching class names:", error);
    }
    setIsLoading(false);
  };

  const GetClassTime = async () => {
    try {
      setIsLoading(true);
      const response = (await API13.Get()) as {
        data: AttendanceTimeResponse[];
      };
      response.data.unshift({
        attendance_time_id: 0,
        attendance_time: "All",
      });
      if (response.data && Array.isArray(response.data)) {
        setClassTimeList(
          response.data.map((item: AttendanceTimeResponse) => ({
            id: item.attendance_time_id,
            title: item.attendance_time,
          }))
        );
      }
    } catch (error) {
      console.error("Error fetching class times:", error);
    }
    setIsLoading(false);
  };

  const GetTeacherName = async () => {
    try {
      setIsLoading(true);
      const response = (await API4.Get()) as unknown as {
        data: TeacherResponse[];
      };
      response.data.unshift({
        teacher_name_id: 0,
        teacher_name: "All",
      });
      if (response.data && Array.isArray(response.data)) {
        setTeacherNameList(
          response.data.map((item: TeacherResponse) => ({
            id: item.teacher_name_id,
            title: item.teacher_name,
          }))
        );
      }
    } catch (error) {
      console.error("Error fetching teachers:", error);
    }

    setIsLoading(false);
  };

  const HandleSubmitForStudentGet = async (formData: FilteredAttendance) => {
    setAttendanceRecords([]);
    try {
      setIsLoading(true);
      const filter: FilteredAttendance = {
        attendance_date: formData.attendance_date || "",
        attendance_time_id: Number(formData.attendance_time_id) || 0,
        class_name_id: Number(formData.class_name_id) || 0,
        teacher_name_id: Number(formData.teacher_name_id) || 0,
        student_id: Number(formData.student_id) || 0,
        father_name: formData.father_name || "",
        attendance_value_id: Number(formData.attendance_value_id) || 0,
      };

      const response = await API.GetbyFilter(filter);

      if (response.status === 200) {
        const records = response.data as unknown as AttendanceRecord[];
        if (records && Array.isArray(records) && records.length > 0) {
          toast.success(`Found ${records.length} records`, {
            position: "bottom-center",
            duration: 3000,
          });
          setAttendanceRecords(records);
        } else {
          toast.info("No records match the selected criteria", {
            position: "bottom-center",
            duration: 3000,
          });
          setAttendanceRecords([]);
        }
      } else {
        toast.error(`Error: ${response.status} - ${response.statusText}`);
      }
    } catch (error: unknown) {
      if (error && typeof error === "object" && "response" in error) {
        const apiError = error as APIError;
        const errorMessage = apiError.response?.data?.message || "Failed to fetch records";
        console.error("API Error:", errorMessage);
        toast.error(errorMessage, {
          position: "bottom-center",
          duration: 3000,
        });
      } else if (error instanceof Error) {
        console.error("Error:", error.message);
        toast.error("An unexpected error occurred. Please try again.", {
          position: "bottom-center",
          duration: 3000,
        });
      } else {
        console.error("Unknown error:", error);
        toast.error("An unexpected error occurred. Please try again.", {
          position: "bottom-center",
          duration: 3000,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // const indexOfLastRecord = currentPage * recordsPerPage;
  // const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  // const currentRecords = attendanceRecords.slice(
  //   indexOfFirstRecord,
  //   indexOfLastRecord
  // );
  // const totalPages = Math.ceil(attendanceRecords.length / recordsPerPage);

  // Add table instance
  const table = useReactTable({
    data: attendanceRecords,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 15, pageIndex: 0 },
    },
  });

  return (
    <div className="container mx-auto min-h-screen px-2 sm:px-4 py-4 sm:py-6 pb-8">
      <form
        onSubmit={handleSubmit((data) =>
          HandleSubmitForStudentGet(data as FilteredAttendance)
        )}
      >
        <div className="bg-white dark:bg-background rounded-xl shadow-sm border border-gray-200 dark:border-secondary p-3 sm:p-4 w-full">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2 sm:gap-3 md:gap-4">
            <div className="space-y-1">
              <label className="text-sm text-gray-700 dark:text-gray-300 font-bold">Date</label>
              <Input
                type="date"
                className="w-full focus:ring-primary dark:bg-background dark:text-gray-100 dark:border-gray-100 border-black"
                {...register("attendance_date", {})}
              />
              <p className="text-red-500 text-xs">
                {errors.attendance_date?.message}
              </p>
            </div>

            <div className="space-y-1">
              <Select
                label="Class Time"
                options={classTimeList}
                {...register("attendance_time_id", { valueAsNumber: true })}
                DisplayItem="title"
                className="w-full focus:ring-primary dark:bg-secondary dark:text-gray-100 dark:border-gray-100"
              />
              <p className="text-red-500 text-xs">
                {errors.attendance_time_id?.message}
              </p>
            </div>

            <div className="space-y-1">
              <Select
                label="Class Name"
                options={classNameList}
                {...register("class_name_id", { valueAsNumber: true })}
                DisplayItem="title"
                className="w-full focus:ring-primary"
              />
              <p className="text-red-500 text-xs">
                {errors.class_name_id?.message}
              </p>
            </div>

            <div className="space-y-1">
              <Select
                label="Teacher Name"
                options={teacherNameList}
                {...register("teacher_name_id", { valueAsNumber: true })}
                DisplayItem="title"
                className="w-full focus:ring-primary"
              />
              <p className="text-red-500 text-xs">
                {errors.teacher_name_id?.message}
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-sm text-gray-700 dark:text-gray-300 font-bold">Student</label>
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between"
                  >
                    {value
                      ? studentsList.find(
                          (student) => student.id.toString() === value
                        )?.title
                      : "Select student..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput
                      placeholder="Search student..."
                      className="h-9"
                    />
                    <CommandList>
                      {isLoading ? (
                        <div className="p-2 text-center text-gray-500">
                          Loading...
                        </div>
                      ) : (
                        <>
                          <CommandEmpty>No student found.</CommandEmpty>
                          <CommandGroup>
                            {studentsList.map((student) => (
                              <CommandItem
                                key={student.id}
                                value={student.id.toString()}
                                onSelect={(currentValue: string) => {
                                  setValue(
                                    currentValue === value ? "" : currentValue
                                  );
                                  setOpen(false);
                                  const selectedStudent = studentsList.find(
                                    (s) => s.id.toString() === currentValue
                                  );
                                  if (selectedStudent) {
                                    setFormValue(
                                      "student_id",
                                      Number(selectedStudent.id)
                                    );
                                  }
                                }}
                              >
                                {student.title}
                                <Check
                                  className={cn(
                                    "ml-auto h-4 w-4",
                                    value === student.id.toString()
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex items-end gap-2">
              <Button
                type="submit"
                className="w-full sm:w-auto px-4 py-2 whitespace-nowrap"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin h-4 w-4 mr-2 border-2 border-t-transparent rounded-full" />
                    Processing...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                    Search Records
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </form>

      {/* Table Section */}
      <div className="mt-4 bg-white dark:bg-background rounded-xl shadow-sm border border-gray-200 dark:border-secondary overflow-x-auto">
        {attendanceRecords.length > 0 && (
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 sm:p-4 no-print border-b border-gray-200 gap-3">
            <h3 className="text-lg font-semibold">Attendance Data</h3>
            <button
              onClick={() => {
                const meta = `Total records: ${attendanceRecords.length} · Printed: ${new Date().toLocaleDateString()}`;
                printRecords('attendance-print-area', 'Attendance Report', meta);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition w-full sm:w-auto justify-center sm:justify-start"
            >
              <Printer size={16} />
              Print
            </button>
          </div>
        )}
        <div id="attendance-print-area" className="overflow-x-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className={`text-xs md:text-sm h-10 bg-primary dark:bg-secondary text-white dark:text-gray-100 px-2 sm:px-3 whitespace-nowrap ${
                        header.column.columnDef.id === "actions" ? "no-print" : ""
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
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="text-center py-8 sm:py-16 text-gray-500"
                  >
                    <div className="flex justify-center py-4 sm:py-8 items-center space-x-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-500"></div>
                      <span className="text-xs sm:text-sm">Loading records...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className="text-xs md:text-sm hover:bg-gray-50 dark:hover:bg-secondary"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell 
                        key={cell.id} 
                        className={`px-2 sm:px-3 py-2 whitespace-nowrap ${
                          cell.column.columnDef.id === "actions" ? "no-print" : ""
                        }`}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="text-center py-8 sm:py-16 text-gray-500"
                  >
                    <div className="flex flex-col items-center justify-center">
                      <AlertCircle className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400 mb-2" />
                      <p className="text-xs sm:text-sm">No attendance records found</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        
        {/* Improved Pagination Controls */}
        {attendanceRecords.length > 0 && (
          <div className="border-t border-gray-200">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-2 py-2 sm:px-4 sm:py-3">
              <div className="text-xs sm:text-sm text-gray-700 order-2 sm:order-1">
                Showing{" "}
                <span className="font-medium">
                  {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}
                </span>{" "}
                -{" "}
                <span className="font-medium">
                  {Math.min(
                    (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                    attendanceRecords.length
                  )}
                </span>{" "}
                of <span className="font-medium">{attendanceRecords.length}</span>
              </div>
              <div className="flex space-x-1 sm:space-x-2 order-1 sm:order-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 sm:h-9 sm:w-9 p-0"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 sm:h-9 sm:w-9 p-0"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceTable;
