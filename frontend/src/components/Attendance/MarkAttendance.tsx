"use client";

import { MarkAttInput } from "@/models/markattendace/markattendance";
import React, { useEffect, useState } from "react";
import { Input } from "../ui/input";
import { useForm } from "react-hook-form";
import { ClassNameAPI as API } from "@/api/Classname/ClassNameAPI";
import { AttendanceTimeAPI as API1 } from "@/api/AttendaceTime/attendanceTimeAPI";
import { TeacherNameAPI as API2 } from "@/api/Teacher/TeachetAPI";
import { StudentAPI as API3 } from "@/api/Student/StudentsAPI";
import { Select, SelectOption as SelectComponentOption } from "../Select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  createColumnHelper,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Loader from "../Loader";
import { AttendanceAPI } from "@/api/Attendance/AttendanceAPI";
import { toast } from "sonner";
import { Header } from "../dashboard/Header";

// ─── Types ───────────────────────────────────────────────────────────────────

type Attendance = {
  id: number;
  name: string;
  present: boolean;
  absent: boolean;
  late: boolean;
  leave: boolean;
};

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
export interface SelectOption {
  id: string | number;
  [key: string]: string | number;
}
interface BulkAttendanceResponse {
  saved: { student_id: number; status: string }[];
  skipped: { student_id: number; reason: string }[];
  summary: { total: number; saved: number; skipped: number };
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

const StatusBadge = ({
  present,
  absent,
  late,
  leave,
}: {
  present: boolean;
  absent: boolean;
  late: boolean;
  leave: boolean;
}) => {
  if (present)
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
        Present
      </span>
    );
  if (absent)
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
        Absent
      </span>
    );
  if (late)
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
        Late
      </span>
    );
  if (leave)
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800">
        <span className="w-1.5 h-1.5 rounded-full bg-orange-400 inline-block" />
        Leave
      </span>
    );
  return (
    <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-400 border border-gray-200 dark:bg-slate-700 dark:text-slate-500 dark:border-slate-600">
      —
    </span>
  );
};

// ─── Summary Bar ──────────────────────────────────────────────────────────────

const SummaryBar = ({ data }: { data: Attendance[] }) => {
  const counts = data.reduce(
    (acc, s) => {
      if (s.present) acc.present++;
      else if (s.absent) acc.absent++;
      else if (s.late) acc.late++;
      else if (s.leave) acc.leave++;
      else acc.unmarked++;
      return acc;
    },
    { present: 0, absent: 0, late: 0, leave: 0, unmarked: 0 }
  );

  const pills = [
    { label: "Present", count: counts.present, color: "text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800" },
    { label: "Absent", count: counts.absent, color: "text-red-700 bg-red-50 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800" },
    { label: "Late", count: counts.late, color: "text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800" },
    { label: "Leave", count: counts.leave, color: "text-orange-700 bg-orange-50 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800" },
    { label: "Unmarked", count: counts.unmarked, color: "text-gray-500 bg-gray-50 border-gray-200 dark:bg-slate-700 dark:text-slate-400 dark:border-slate-600" },
  ];

  return (
    <div className="flex flex-wrap gap-2 px-4 sm:px-6 py-3 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-700">
      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 self-center mr-1">
        Summary:
      </span>
      {pills.map((p) => (
        <span
          key={p.label}
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${p.color}`}
        >
          {p.label}
          <span className="font-bold">{p.count}</span>
        </span>
      ))}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

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

const MarkAttendance = () => {
  const [classNameList, setClassNameList] = useState<SelectComponentOption[]>([]);
  const [classTimeList, setClassTimeList] = useState<SelectComponentOption[]>([]);
  const [teacherNameList, setTeacherNameList] = useState<SelectComponentOption[]>([]);
  const [data, setData] = useState<Attendance[]>([]);
  const [studentByFilter, setStudentByFilter] = useState<SelectComponentOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    GetClassName();
    GetClassTime();
    GetTeacherName();
  }, []);

  useEffect(() => {
    setData(
      studentByFilter.map((student) => ({
        id: Number(student.id),
        name: String(student.title),
        present: false,
        absent: false,
        late: false,
        leave: false,
      }))
    );
  }, [studentByFilter]);

  const GetClassName = async () => {
    try {
      setIsLoading(true);
      const response = await API.Get();
      const classNames = extractArrayData<ClassNameResponse>(response);
      setClassNameList(
        classNames.map((item) => ({
          id: item.class_name_id,
          title: item.class_name,
        }))
      );
    } catch (error: unknown) {
      console.error("Error fetching class names:", error);
    }
    setIsLoading(false);
  };

  const GetClassTime = async () => {
    try {
      setIsLoading(true);
      const response = await API1.Get();
      const classTimes = extractArrayData<AttendanceTimeResponse>(response);
      setClassTimeList(
        classTimes.map((item) => ({
          id: item.attendance_time_id,
          title: item.attendance_time,
        }))
      );
    } catch (error: unknown) {
      console.error("Error fetching class times:", error);
    }
    setIsLoading(false);
  };

  const GetTeacherName = async () => {
    try {
      setIsLoading(true);
      const response = await API2.Get();
      const teachers = extractArrayData<TeacherResponse>(response);
      setTeacherNameList(
        teachers.map((item) => ({
          id: item.teacher_name_id,
          title: item.teacher_name,
        }))
      );
    } catch (error: unknown) {
      console.error("Error fetching teachers:", error);
    }
    setIsLoading(false);
  };

  const {
    register,
    formState: { errors },
    handleSubmit,
  } = useForm<MarkAttInput>();

  // ── Mark All Helper ─────────────────────────────────────────────────────────
  const markAll = (field: "present" | "absent" | "late" | "leave") => {
    setData((prev) =>
      prev.map((s) => ({
        ...s,
        present: field === "present",
        absent: field === "absent",
        late: field === "late",
        leave: field === "leave",
      }))
    );
  };

  // ── Column Definitions ──────────────────────────────────────────────────────
  const columnHelper = createColumnHelper<Attendance>();

  const makeCheckboxColumn = (
    field: "present" | "absent" | "late" | "leave",
    header: string
  ) =>
    columnHelper.accessor(field, {
      header,
      cell: ({ row }) => (
        <div className="flex justify-center">
          <Checkbox
            checked={row.original[field]}
            onCheckedChange={(checked) => {
              const newData = [...data];
              newData[row.index][field] = checked as boolean;
              if (checked) {
                const others = (
                  ["present", "absent", "late", "leave"] as const
                ).filter((f) => f !== field);
                others.forEach((f) => (newData[row.index][f] = false));
              }
              setData(newData);
            }}
            className="h-5 w-5"
          />
        </div>
      ),
    });

  const columns = [
    columnHelper.accessor("name", {
      header: "Student Name",
      cell: (info) => (
        <span className="font-medium text-gray-900 dark:text-gray-100 text-right block pr-2" dir="rtl">
          {info.getValue()}
        </span>
      ),
    }),
    makeCheckboxColumn("present", "Present"),
    makeCheckboxColumn("absent", "Absent"),
    makeCheckboxColumn("late", "Late"),
    makeCheckboxColumn("leave", "Leave"),
    columnHelper.display({
      id: "status",
      header: "Status",
      cell: ({ row }) => (
        <div className="flex justify-center">
          <StatusBadge {...row.original} />
        </div>
      ),
    }),
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  // ── Submit Attendance ───────────────────────────────────────────────────────
  const onSubmit = async (formData: MarkAttInput) => {
    setIsLoading(true);
    const attendances = data.map((student) => {
      let attendance_value_id = "";
      if (student.present) attendance_value_id = "1";
      if (student.absent) attendance_value_id = "2";
      if (student.late) attendance_value_id = "3";
      if (student.leave) attendance_value_id = "4";
      return {
        attendance_date: formData.attendance_date,
        attendance_time_id: String(formData.attendance_time_id),
        class_name_id: String(formData.class_name_id),
        teacher_name_id: String(formData.teacher_name_id),
        student_id: String(student.id),
        attendance_value_id,
      };
    });

    const payload: MarkAttInput = {
      attendance_date: formData.attendance_date,
      attendance_time_id: formData.attendance_time_id,
      class_name_id: formData.class_name_id,
      teacher_name_id: formData.teacher_name_id,
      attendances,
    };

    console.log("Sending payload:", payload);

    try {
      const response = await AttendanceAPI.Create(payload);
      const status = (response as { status?: number }).status;
      const data = (response as { data?: BulkAttendanceResponse }).data;

      if (status === 200 || status === 201) {
        const summary = data ?? {
          saved: [],
          skipped: [],
          summary: { total: 0, saved: 0, skipped: 0 },
        };

        toast.success(
          `Attendance submitted: ${summary.summary.saved} saved, ${summary.summary.skipped} skipped`,
          { position: "bottom-center", duration: 5000 }
        );
      } else {
        toast.error("Failed to submit attendance", {
          position: "bottom-center",
          duration: 5000,
        });
      }
    } catch (error: unknown) {
      console.error("Submit error:", error);
      toast.error("Something went wrong!", {
        position: "bottom-center",
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ── Fetch Students ──────────────────────────────────────────────────────────
  const HandleSubmitForStudentGet = async (formData: MarkAttInput) => {
    try {
      setIsLoading(true);
      const response = await API3.GetStudentbyFilter(formData.class_name_id);
      const students = extractArrayData<StudentResponse>(response);
      if (students.length > 0) {
        setStudentByFilter(
          students.map((item) => ({
            id: item.student_id,
            title: item.student_name,
          }))
        );
      }
    } catch (error) {
      console.error("Error fetching students:", error);
    }
    setIsLoading(false);
  };

  // ────────────────────────────────────────────────────────────────────────────
  //  RENDER
  //
  //  KEY LAYOUT FIX:
  //  ┌─────────────────────────────────────────┐
  //  │  h-screen (fixed height = viewport)     │  ← root: h-screen, NOT min-h-screen
  //  │  ┌─────────────────────────────────────┐ │
  //  │  │  <Header /> (fixed height)          │ │
  //  │  └─────────────────────────────────────┘ │
  //  │  ┌─────────────────────────────────────┐ │
  //  │  │  flex-1 overflow-y-auto min-h-0     │ │  ← min-h-0 overrides flex's
  //  │  │  (this region actually scrolls!)    │ │    default min-height:auto
  //  │  │                                     │ │
  //  │  │  ┌─────────────────────────────┐    │ │
  //  │  │  │  Filter Bar (sticky top-0)  │    │ │  ← stays visible on scroll
  //  │  │  └─────────────────────────────┘    │ │
  //  │  │  ┌─────────────────────────────┐    │ │
  //  │  │  │  Summary Bar                │    │ │
  //  │  │  └─────────────────────────────┘    │ │
  //  │  │  ┌─────────────────────────────┐    │ │
  //  │  │  │  Table (overflow-x-auto)    │    │ │  ← scrolls horizontally on mobile
  //  │  │  └─────────────────────────────┘    │ │
  //  │  │  ┌─────────────────────────────┐    │ │
  //  │  │  │  Submit Button Footer       │    │ │  ← always reachable by scrolling
  //  │  │  └─────────────────────────────┘    │ │
  //  │  └─────────────────────────────────────┘ │
  //  └─────────────────────────────────────────┘
  // ────────────────────────────────────────────────────────────────────────────

  return (
    // ✅ FIX 1: h-screen (not min-h-screen) so flex children get a bounded height
    <div className="flex flex-col w-full h-screen bg-gray-50 dark:bg-slate-950">
      <Header value="Mark Attendance" />
      <Loader isActive={isLoading} />

      {/*
        ✅ FIX 2: min-h-0 is CRITICAL here.
        Flex items default to min-height: auto, which lets them grow past the
        parent's height, breaking overflow-y-auto. min-h-0 removes that floor.
      */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <form onSubmit={handleSubmit(onSubmit)}>

          {/*
            ✅ FIX 3: Filter bar is sticky so it stays visible while scrolling
            through a long student list.
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
                {data.length > 0 && (
                  <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1 rounded-full border border-blue-200 dark:border-blue-800">
                    {data.length} Students
                  </span>
                )}
              </div>

              {/*
                Responsive grid:
                - Mobile:  2 columns (Date + Time | Class + Teacher) then Get full-width
                - Tablet:  3 columns
                - Desktop: 5 columns in one row
              */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block">
                    Date
                  </label>
                  <Input
                    type="date"
                    className="h-10 text-sm border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-700 text-gray-900 dark:text-gray-100 rounded-lg w-full transition-colors"
                    {...register("attendance_date", {
                      required: "Date is required",
                    })}
                  />
                  {errors.attendance_date && (
                    <p className="text-red-500 text-xs mt-0.5">
                      {errors.attendance_date.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block">
                    Class Time
                  </label>
                  <Select
                    options={classTimeList}
                    {...register("attendance_time_id", {
                      required: "Time is required",
                    })}
                    DisplayItem="title"
                    className="h-10 text-sm rounded-lg w-full"
                  />
                  {errors.attendance_time_id && (
                    <p className="text-red-500 text-xs mt-0.5">
                      {errors.attendance_time_id.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block">
                    Class Name
                  </label>
                  <Select
                    options={classNameList}
                    {...register("class_name_id", {
                      required: "Class is required",
                    })}
                    DisplayItem="title"
                    className="h-10 text-sm rounded-lg w-full"
                  />
                  {errors.class_name_id && (
                    <p className="text-red-500 text-xs mt-0.5">
                      {errors.class_name_id.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block">
                    Teacher Name
                  </label>
                  <Select
                    options={teacherNameList}
                    {...register("teacher_name_id", {
                      required: "Teacher is required",
                    })}
                    DisplayItem="title"
                    className="h-10 text-sm rounded-lg w-full"
                  />
                  {errors.teacher_name_id && (
                    <p className="text-red-500 text-xs mt-0.5">
                      {errors.teacher_name_id.message}
                    </p>
                  )}
                </div>

                {/* Get button — spans 2 cols on mobile to stay on same row as Teacher */}
                <div className="flex items-end col-span-2 sm:col-span-1">
                  <Button
                    type="button"
                    onClick={() => handleSubmit(HandleSubmitForStudentGet)()}
                    className="w-full h-10 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 dark:bg-blue-700 dark:hover:bg-blue-600 text-white font-bold text-sm rounded-lg transition-colors shadow-sm"
                  >
                    Get Students
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* ── Table Section ─────────────────────────────────────────────── */}
          {data.length > 0 ? (
            <>
              {/* Live summary bar */}
              <SummaryBar data={data} />

              {/* Quick-mark row — lets teacher mark all students at once */}
              <div className="flex flex-wrap items-center gap-2 px-4 sm:px-6 py-3 bg-gray-50 dark:bg-slate-800/60 border-b border-gray-100 dark:border-slate-700">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 mr-1">
                  Mark All:
                </span>
                {(
                  [
                    { field: "present", label: "Present", cls: "border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-900/30" },
                    { field: "absent", label: "Absent", cls: "border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/30" },
                    { field: "late", label: "Late", cls: "border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-900/30" },
                    { field: "leave", label: "Leave", cls: "border-orange-300 text-orange-700 hover:bg-orange-50 dark:border-orange-700 dark:text-orange-400 dark:hover:bg-orange-900/30" },
                  ] as const
                ).map(({ field, label, cls }) => (
                  <button
                    key={field}
                    type="button"
                    onClick={() => markAll(field)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-full border bg-white dark:bg-slate-800 transition-colors ${cls}`}
                  >
                    All {label}
                  </button>
                ))}
              </div>

              {/*
                ✅ FIX 4: overflow-x-auto wrapper so the table scrolls
                horizontally on narrow screens instead of overflowing or
                squishing columns unreadably.
              */}
              <div className="overflow-x-auto bg-white dark:bg-slate-900">
                <Table className="w-full min-w-[560px]">
                  <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id} className="border-0">
                        {headerGroup.headers.map((header, i) => (
                          <TableHead
                            key={header.id}
                            className={`
                              text-center text-xs font-bold uppercase tracking-wider
                              bg-slate-800 dark:bg-slate-950
                              text-slate-200 dark:text-slate-300
                              py-3.5 border-0 whitespace-nowrap
                              ${i === 0 ? "text-right pr-6 pl-4" : "px-3"}
                            `}
                          >
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {table.getRowModel().rows.map((row, idx) => (
                      <TableRow
                        key={row.id}
                        className={`
                          text-sm transition-colors border-b border-gray-100 dark:border-slate-700/60
                          ${idx % 2 === 0
                            ? "bg-white dark:bg-slate-900"
                            : "bg-slate-50/60 dark:bg-slate-800/40"
                          }
                          hover:bg-blue-50/60 dark:hover:bg-slate-700/50
                        `}
                      >
                        {row.getVisibleCells().map((cell, i) => (
                          <TableCell
                            key={cell.id}
                            className={`
                              text-center whitespace-nowrap py-3.5
                              ${i === 0 ? "text-right pr-6 pl-4" : "px-3"}
                            `}
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/*
                ✅ FIX 5: Submit button is INSIDE the scrollable flow, so
                scrolling down always reveals it. Not hidden behind a fixed
                height card.
              */}
              <div className="bg-white dark:bg-slate-900 border-t-2 border-gray-100 dark:border-slate-700 px-4 sm:px-6 py-5">
                <div className="flex flex-col sm:flex-row items-center gap-3 max-w-xl mx-auto">
                  <div className="text-center sm:text-left flex-1">
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {data.filter((s) => !s.present && !s.absent && !s.late && !s.leave).length > 0 ? (
                        <span className="text-amber-600 dark:text-amber-400 font-semibold">
                          ⚠ {data.filter((s) => !s.present && !s.absent && !s.late && !s.leave).length} student(s) still unmarked
                        </span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                          ✓ All {data.length} students marked
                        </span>
                      )}
                    </p>
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="
                      w-full sm:w-auto min-w-[200px]
                      bg-gradient-to-r from-emerald-600 to-green-600
                      hover:from-emerald-700 hover:to-green-700
                      active:scale-[0.98]
                      dark:from-emerald-700 dark:to-green-700
                      text-white font-bold text-sm py-3 px-8
                      rounded-xl shadow-md shadow-emerald-200 dark:shadow-none
                      hover:shadow-lg hover:shadow-emerald-200 dark:hover:shadow-none
                      transition-all duration-150
                      disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none
                      flex items-center justify-center gap-2
                    "
                  >
                    {isLoading ? (
                      <>
                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Submitting…
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        Submit Attendance
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Bottom breathing room */}
              <div className="h-8" />
            </>
          ) : (
            /* Empty state */
            <div className="flex flex-col items-center justify-center py-24 px-4 text-center bg-white dark:bg-slate-900 min-h-[50vh]">
              <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a4 4 0 00-4-4h-1M9 20H4v-2a4 4 0 014-4h1m4-4a4 4 0 110-8 4 4 0 010 8z" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-gray-700 dark:text-gray-300 mb-1">
                No Students Loaded
              </h3>
              <p className="text-sm text-gray-400 dark:text-gray-500 max-w-xs">
                Select the date, class time, class name, and teacher above, then tap <strong>Get Students</strong> to load the attendance sheet.
              </p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default MarkAttendance;