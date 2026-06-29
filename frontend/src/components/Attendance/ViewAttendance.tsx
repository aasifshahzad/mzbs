"use client";
import type React from "react";
import { useState, useEffect, useCallback, useMemo } from "react";
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

const extractArrayData = <T,>(response: unknown): T[] => {
  const payload = (response as { data?: unknown }).data;

  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (payload && typeof payload === "object") {
    const nestedPayload = (payload as { data?: unknown }).data;
    if (Array.isArray(nestedPayload)) {
      return nestedPayload as T[];
    }
  }

  return [];
};

const AttendanceTable: React.FC = () => {
  const {
    register,
    setValue: setFormValue,
    getValues,              // FIX 1: needed to read current filter state on refresh
    formState: { errors },
    handleSubmit,
  } = useForm<FilteredAttendance>();
  const { printRecords } = usePrint();
  const [isLoading, setIsLoading] = useState(false);
  const [dropdownsLoading, setDropdownsLoading] = useState(true); // FIX 2: separate loading state for dropdowns
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
  const [statusList, setStatusList] = useState<SelectComponentOption[]>([
    { id: 0, title: "All" },
    { id: 1, title: "Present" },
    { id: 2, title: "Absent" },
    { id: 3, title: "Late" },
    { id: 4, title: "Leave" },
  ]); // FIX 4: add status filter options
  const [studentsList, setStudentsList] = useState<SelectComponentOption[]>([]);
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [pageSize] = useState(15);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [activeFilters, setActiveFilters] = useState<FilteredAttendance | null>(null);

  // ── Fetch Records ────────────────────────────────────────────────────────────
  // Define HandleSubmitForStudentGet first so handleAttendanceUpdate can reference it
  const HandleSubmitForStudentGet = useCallback(
    async (formData: FilteredAttendance, page = 1) => {
      setAttendanceRecords([]);
      setCurrentPage(page);
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

        setActiveFilters(filter);
        const response = await API.GetbyFilter(filter, page, pageSize);

        if (response.status === 200) {
          const payload = (response?.data as {
            data?: AttendanceRecord[];
            total?: number;
            total_pages?: number;
          } | null | undefined) ?? {};
          const records = Array.isArray(payload?.data)
            ? (payload.data as AttendanceRecord[])
            : extractArrayData<AttendanceRecord>(response);
          const total = Number(payload?.total ?? records.length ?? 0);
          const pages = Number(
            payload?.total_pages ?? Math.max(1, Math.ceil(total / pageSize))
          );

          if (records.length > 0) {
            toast.success(`Found ${records.length} records`, {
              position: "bottom-center",
              duration: 3000,
            });
            setAttendanceRecords(records);
            setTotalRecords(total);
            setTotalPages(pages);
          } else {
            toast.info("No records match the selected criteria", {
              position: "bottom-center",
              duration: 3000,
            });
            setAttendanceRecords([]);
            setTotalRecords(0);
            setTotalPages(1);
          }
        } else {
          toast.error(`Error: ${response.status} - ${response.statusText}`);
          setTotalRecords(0);
          setTotalPages(1);
        }
      } catch (error: unknown) {
        if (error && typeof error === "object" && "response" in error) {
          const apiError = error as APIError;
          const errorMessage = apiError.response?.data?.message || "Failed to fetch records";
          toast.error(errorMessage, {
            position: "bottom-center",
            duration: 3000,
          });
        } else if (error instanceof Error) {
          toast.error("An unexpected error occurred. Please try again.", {
            position: "bottom-center",
            duration: 3000,
          });
        } else {
          toast.error("An unexpected error occurred. Please try again.", {
            position: "bottom-center",
            duration: 3000,
          });
        }
        setTotalRecords(0);
        setTotalPages(1);
      } finally {
        setIsLoading(false);
      }
    },
    [] // eslint-disable-line react-hooks/exhaustive-deps
    // (setIsLoading/setAttendanceRecords/setPagination are stable setState
    //  setters; API is a module-level import — neither will change between renders)
  );

  // FIX 1: read live form values instead of hardcoded zeros.
  // useCallback so the reference passed to <EditAttendance onUpdate={}> is
  // stable and doesn't cause the actions column to re-mount on every render.
  const handleAttendanceUpdate = useCallback(async () => {
    const currentFilters = getValues();
    // Restore student_id from combobox state (not registered in RHF)
    currentFilters.student_id = Number(value) || 0;
    await HandleSubmitForStudentGet(currentFilters, currentPage);
  }, [getValues, value, currentPage, HandleSubmitForStudentGet]);

  const handleDeleteAttendance = useCallback(
    async (attendanceId: number) => {
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
    },
    [handleAttendanceUpdate]
  );

  // ── Columns ──────────────────────────────────────────────────────────────────
  // useMemo: TanStack Table treats a new columns array as a schema change and
  // resets internal state. Only recompute when pagination or the action
  // callbacks actually change.

  const columns: ColumnDef<AttendanceRecord>[] = useMemo(
    () => [
      {
        accessorKey: "sr_no",
        header: "Sr.No",
        // FIX 5: global row number across pages
        cell: ({ row }) => (
          <span className="font-medium">
            {(currentPage - 1) * pageSize + row.index + 1}
          </span>
        ),
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
            <div className="flex justify-center">
              {value === "present" ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                  Present
                </span>
              ) : value === "absent" ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                  Absent
                </span>
              ) : value === "late" ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                  Late
                </span>
              ) : value === "leave" ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400 inline-block" />
                  Leave
                </span>
              ) : (
                <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-400 border border-gray-200 dark:bg-slate-700 dark:text-slate-500 dark:border-slate-600">
                  —
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
    ],
    [currentPage, pageSize, handleAttendanceUpdate, handleDeleteAttendance]
  );

  // FIX 2: dropdowns load exactly once on mount — no dependency on formRefresh
  useEffect(() => {
    Promise.all([GetClassName(), GetClassTime(), GetTeacherName(), GetStudents()])
      .finally(() => setDropdownsLoading(false));
  }, []);

  const GetStudents = async () => {
    setIsLoading(true);
    try {
      const response = await API5.Get();
      const students = extractArrayData<StudentResponse>(response);
      const allStudents = [
        { student_id: 0, student_name: "All Students" },
        ...students,
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
      const response = await API2.Get();
      const classes = extractArrayData<ClassNameResponse>(response);
      const allClasses = [
        { class_name_id: 0, class_name: "All" },
        ...classes,
      ];
      setClassNameList(
        allClasses.map((item: ClassNameResponse) => ({
          id: item.class_name_id,
          title: item.class_name,
        }))
      );
    } catch (error) {
      console.error("Error fetching class names:", error);
    }
    setIsLoading(false);
  };

  const GetClassTime = async () => {
    try {
      setIsLoading(true);
      const response = await API13.Get();
      const times = extractArrayData<AttendanceTimeResponse>(response);
      const allTimes = [
        { attendance_time_id: 0, attendance_time: "All" },
        ...times,
      ];
      setClassTimeList(
        allTimes.map((item: AttendanceTimeResponse) => ({
          id: item.attendance_time_id,
          title: item.attendance_time,
        }))
      );
    } catch (error) {
      console.error("Error fetching class times:", error);
    }
    setIsLoading(false);
  };

  const GetTeacherName = async () => {
    try {
      setIsLoading(true);
      const response = await API4.Get();
      const teachers = extractArrayData<TeacherResponse>(response);
      const allTeachers = [
        { teacher_name_id: 0, teacher_name: "All" },
        ...teachers,
      ];
      setTeacherNameList(
        allTeachers.map((item: TeacherResponse) => ({
          id: item.teacher_name_id,
          title: item.teacher_name,
        }))
      );
    } catch (error) {
      console.error("Error fetching teachers:", error);
    }

    setIsLoading(false);
  };

  // const indexOfLastRecord = currentPage * recordsPerPage;
  // const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  // const currentRecords = attendanceRecords.slice(
  //   indexOfFirstRecord,
  //   indexOfLastRecord
  // );
  // const totalPages = Math.ceil(attendanceRecords.length / recordsPerPage);

  const handlePageChange = (page: number) => {
    if (!activeFilters) return;
    const nextPage = Math.min(Math.max(1, page), totalPages);
    void HandleSubmitForStudentGet(activeFilters, nextPage);
  };

  const table = useReactTable({
    data: attendanceRecords,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="flex flex-col w-full h-screen bg-gray-50 dark:bg-slate-950">
      {/* ✅ FIX 1: h-screen (not min-h-screen) so flex children get a bounded height */}
      
      {/*
        ✅ FIX 2: min-h-0 is CRITICAL here.
        Flex items default to min-height: auto, which lets them grow past the
        parent's height, breaking overflow-y-auto. min-h-0 removes that floor.
      */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <form onSubmit={handleSubmit((data) => HandleSubmitForStudentGet(data as FilteredAttendance, 1))}>
          
          {/*
            ✅ FIX 3: Filter bar is sticky so it stays visible while scrolling
            through records.
          */}
          <div className="sticky top-0 z-20 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 shadow-sm">
            <div className="px-4 sm:px-6 py-4">
              
              {/* Section title row */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-6 bg-blue-600 rounded-full" />
                  <h2 className="text-sm font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                    Filters
                  </h2>
                </div>
                {attendanceRecords.length > 0 && (
                  <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1 rounded-full border border-blue-200 dark:border-blue-800">
                    {totalRecords || attendanceRecords.length} Records Found
                  </span>
                )}
              </div>

              {/*
                Responsive grid:
                - Mobile:  2 columns
                - Tablet:  3 columns
                - Desktop: 7 columns in one row
              */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block">
                    Date
                  </label>
                  <input
                    type="date"
                    className="h-10 text-sm border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-700 text-gray-900 dark:text-gray-100 rounded-lg w-full transition-colors px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    {...register("attendance_date", {})}
                  />
                  <p className="text-red-500 text-xs">
                    {errors.attendance_date?.message}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block">
                    Class Time
                  </label>
                  <Select
                    options={classTimeList}
                    {...register("attendance_time_id", { valueAsNumber: true })}
                    DisplayItem="title"
                    className="h-10 text-sm rounded-lg w-full"
                  />
                  <p className="text-red-500 text-xs">
                    {errors.attendance_time_id?.message}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block">
                    Class Name
                  </label>
                  <Select
                    options={classNameList}
                    {...register("class_name_id", { valueAsNumber: true })}
                    DisplayItem="title"
                    className="h-10 text-sm rounded-lg w-full"
                  />
                  <p className="text-red-500 text-xs">
                    {errors.class_name_id?.message}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block">
                    Teacher Name
                  </label>
                  <Select
                    options={teacherNameList}
                    {...register("teacher_name_id", { valueAsNumber: true })}
                    DisplayItem="title"
                    className="h-10 text-sm rounded-lg w-full"
                  />
                  <p className="text-red-500 text-xs">
                    {errors.teacher_name_id?.message}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block">
                    Status
                  </label>
                  <Select
                    options={statusList}
                    {...register("attendance_value_id", { valueAsNumber: true })}
                    DisplayItem="title"
                    className="h-10 text-sm rounded-lg w-full"
                  />
                  <p className="text-red-500 text-xs">
                    {errors.attendance_value_id?.message}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block">
                    Student
                  </label>
                  <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-full justify-between h-10 text-sm"
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

                {/* Search Button — spans 2 cols on mobile */}
                <div className="flex items-end col-span-2 sm:col-span-2 lg:col-span-1">
                  <Button
                    type="submit"
                    className="w-full h-10 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 dark:bg-blue-700 dark:hover:bg-blue-600 text-white font-bold text-sm rounded-lg transition-colors shadow-sm"
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
                        Search
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* ── Table Section ─────────────────────────────────────────────── */}
          {attendanceRecords.length > 0 && (
            <>
              {/* Header with title and print button */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 sm:p-4 no-print border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Attendance Records</h3>
                <button
                  onClick={() => {
                    const meta = `Total records: ${attendanceRecords.length} · Printed: ${new Date().toLocaleDateString()}`;
                    printRecords('attendance-print-area', 'Attendance Report', meta);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition w-full sm:w-auto justify-center sm:justify-start mt-2 sm:mt-0"
                >
                  <Printer size={16} />
                  Print
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-6 py-3 border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 no-print">
                <p className="text-sm text-gray-600 dark:text-gray-300">
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
                    <ChevronLeft className="mr-1 h-4 w-4" />
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
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/*
                ✅ FIX 4: overflow-x-auto wrapper so the table scrolls
                horizontally on narrow screens instead of overflowing or
                squishing columns unreadably.
              */}
              <div id="attendance-print-area" className="overflow-x-auto bg-white dark:bg-slate-900">
                <Table className="w-full min-w-full">
                  <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id} className="border-0">
                        {headerGroup.headers.map((header) => (
                          <TableHead
                            key={header.id}
                            className={`
                              text-center text-xs font-bold uppercase tracking-wider
                              bg-slate-800 dark:bg-slate-950
                              text-slate-200 dark:text-slate-300
                              py-3.5 border-0 whitespace-nowrap px-3
                              ${header.column.columnDef.id === "actions" ? "no-print" : ""}
                            `}
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
                      table.getRowModel().rows.map((row, idx) => (
                        <TableRow
                          key={row.id}
                          data-state={row.getIsSelected() && "selected"}
                          className={`
                            text-xs md:text-sm transition-colors border-b border-gray-100 dark:border-slate-700/60
                            ${idx % 2 === 0
                              ? "bg-white dark:bg-slate-900"
                              : "bg-slate-50/60 dark:bg-slate-800/40"
                            }
                            hover:bg-blue-50/60 dark:hover:bg-slate-700/50
                          `}
                        >
                          {row.getVisibleCells().map((cell) => (
                            <TableCell 
                              key={cell.id} 
                              className={`px-3 py-2 whitespace-nowrap text-center ${
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
              

            </>
          )}

          {/* Empty state */}
          {!isLoading && attendanceRecords.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 px-4 text-center bg-white dark:bg-slate-900 min-h-[50vh]">
              <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center mb-4">
                <AlertCircle className="h-8 w-8 text-blue-400" />
              </div>
              <h3 className="text-base font-bold text-gray-700 dark:text-gray-300 mb-1">
                No Records Found
              </h3>
              <p className="text-sm text-gray-400 dark:text-gray-500 max-w-xs">
                Use the filters above to search for attendance records
              </p>
            </div>
          )}

          {/* Bottom breathing room */}
          <div className="h-8" />
        </form>
      </div>
    </div>
  );
};

export default AttendanceTable;
