"use client";

import { AxiosResponse } from "axios";
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
import { useIsMobile } from "@/hooks/use-mobile";
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

// Define the backend response shape
interface BulkAttendanceResponse {
  saved: { student_id: number; status: string }[];
  skipped: { student_id: number; reason: string }[];
  summary: { total: number; saved: number; skipped: number };
}

const MarkAttendance = () => {
  const [classNameList, setClassNameList] = useState<SelectComponentOption[]>(
    []
  );
  const [classTimeList, setClassTimeList] = useState<SelectComponentOption[]>(
    []
  );
  const [teacherNameList, setTeacherNameList] = useState<
    SelectComponentOption[]
  >([]);
  const [data, setData] = useState<Attendance[]>([]);
  const [studentByFilter, setStudentByFilter] = useState<
    SelectComponentOption[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const isMobile = useIsMobile();

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
      const response = (await API.Get()) as { data: ClassNameResponse[] };
      if (response.data && Array.isArray(response.data)) {
        setClassNameList(
          response.data.map((item: ClassNameResponse) => ({
            id: item.class_name_id,
            title: item.class_name,
          }))
        );
      }
    } catch (error: unknown) {
      console.error("Error fetching class names:", error);
    }
    setIsLoading(false);
  };

  const GetClassTime = async () => {
    try {
      setIsLoading(true);
      const response = (await API1.Get()) as { data: AttendanceTimeResponse[] };
      if (response.data && Array.isArray(response.data)) {
        setClassTimeList(
          response.data.map((item: AttendanceTimeResponse) => ({
            id: item.attendance_time_id,
            title: item.attendance_time,
          }))
        );
      }
    } catch (error: unknown) {
      console.error("Error fetching class times:", error);
    }
    setIsLoading(false);
  };

  const GetTeacherName = async () => {
    try {
      setIsLoading(true);
      const response = (await API2.Get()) as unknown as {
        data: TeacherResponse[];
      };
      if (response.data && Array.isArray(response.data)) {
        setTeacherNameList(
          response.data.map((item: TeacherResponse) => ({
            id: item.teacher_name_id,
            title: item.teacher_name,
          }))
        );
      }
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

  const columnHelper = createColumnHelper<Attendance>();

  const columns = [
    columnHelper.accessor("name", {
      header: "Student Name",
      cell: (info) => info.getValue(),
    }),
    columnHelper.accessor("present", {
      header: "Present",
      cell: ({ row }) => (
        <Checkbox
          checked={row.original.present}
          onCheckedChange={(checked) => {
            const newData = [...data];
            newData[row.index].present = checked as boolean;
            if (checked) {
              newData[row.index].absent = false;
              newData[row.index].late = false;
               newData[row.index].leave = false;
            }
            setData(newData);
          }}
        />
      ),
    }),
    columnHelper.accessor("absent", {
      header: "Absent",
      cell: ({ row }) => (
        <Checkbox
          checked={row.original.absent}
          onCheckedChange={(checked) => {
            const newData = [...data];
            newData[row.index].absent = checked as boolean;
            if (checked) {
              newData[row.index].present = false;
              newData[row.index].late = false;
               newData[row.index].leave = false;
            }
            setData(newData);
          }}
        />
      ),
    }),
    columnHelper.accessor("late", {
      header: "Late",
      cell: ({ row }) => (
        <Checkbox
          checked={row.original.late}
          onCheckedChange={(checked) => {
            const newData = [...data];
            newData[row.index].late = checked as boolean;
            if (checked) {
              newData[row.index].present = false;
              newData[row.index].absent = false;
               newData[row.index].leave = false;
            }
            setData(newData);
          }}
        />
      ),
    }),
    columnHelper.accessor("leave", {
      header: "Leave",
      cell: ({ row }) => (
        <Checkbox
          checked={row.original.leave}
          onCheckedChange={(checked) => {
            const newData = [...data];
            newData[row.index].leave = checked as boolean;
            if (checked) {
              newData[row.index].present = false;
              newData[row.index].absent = false;
              newData[row.index].late = false;
            }
            setData(newData);
          }}
        />
      ),
    }),
    columnHelper.display({
      id: "status",
      header: "Status",
      cell: ({ row }) => {
        const { present, absent, late, leave } = row.original;
        
        if (present) return (
          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
            Present
          </span>
        );
        if (absent) return (
          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
            Absent
          </span>
        );
        if (late) return (
          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">
            Late
          </span>
        );
        if (leave) return (
          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">
            Leave
          </span>
        );
        return (
          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-400">
            —
          </span>
        );
      },
    }),
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });


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

  console.log("Submitting attendance:", payload);

  try {
    const response = (await AttendanceAPI.Create(
      payload
    )) as unknown as AxiosResponse<BulkAttendanceResponse>; // ✅ fix typing

    if (response.status === 200 || response.status === 201) {
      const { summary } = response.data;
      toast.success(
        `Attendance submitted: ${summary.saved} saved, ${summary.skipped} skipped`,
        { position: "bottom-center", duration: 5000 }
      );
    } else {
      toast.error("Failed to submit attendance", {
        position: "bottom-center",
        duration: 5000,
      });
    }
  } catch (error: any) {
    console.error("Submit error:", error);
    toast.error("Something went wrong!", {
      position: "bottom-center",
      duration: 5000,
    });
  } finally {
    setIsLoading(false);
  }
};


  const HandleSubmitForStudentGet = async (formData: MarkAttInput) => {
    try {
      setIsLoading(true);
      const response = (await API3.GetStudentbyFilter(
        formData.class_name_id
      )) as { data: StudentResponse[] };
      if (response.data && Array.isArray(response.data)) {
        setStudentByFilter(
          response.data.map((item: StudentResponse) => ({
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

  return (
    <div className="flex flex-col gap-2 w-full overflow-y-auto">
      <Header value="Mark Attendance" />
      <Loader isActive={isLoading} />
      <div className="mx-auto bg-white dark:bg-transparent drop-shadow-sm border border-gray-200 dark:border-secondary rounded-lg w-full max-w-6xl px-2 sm:px-4 py-3 sm:py-4">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 border p-3 rounded-lg">
            <div className="space-y-1">
              <label className="text-gray-700 font-bold dark:text-gray-400 text-sm">
                Date
              </label>
              <Input
                type="date"
                className="border-gray-300 w-full"
                {...register("attendance_date", {
                  required: "Date is required",
                })}
              />
              <p className="text-red-500 text-xs">{errors.attendance_date?.message}</p>
            </div>

            <div className="space-y-1">
              <Select
                label="Class Time"
                options={classTimeList}
                {...register("attendance_time_id", {
                  required: "Time is required",
                })}
                DisplayItem="title"
                className="w-full"
              />
              <p className="text-red-500 text-xs">
                {errors.attendance_time_id?.message}
              </p>
            </div>

            <div className="space-y-1">
              <Select
                label="Class Name"
                options={classNameList}
                {...register("class_name_id", {
                  required: "Class is required",
                })}
                DisplayItem="title"
                className="w-full"
              />
              <p className="text-red-500 text-xs">{errors.class_name_id?.message}</p>
            </div>

            <div className="space-y-1">
              <Select
                label="Teacher Name"
                options={teacherNameList}
                {...register("teacher_name_id", {
                  required: "Teacher is required",
                })}
                DisplayItem="title"
                className="w-full"
              />
              <p className="text-red-500 text-xs">{errors.teacher_name_id?.message}</p>
            </div>

            <div className="flex items-end">
              <Button
                type="button"
                onClick={() => handleSubmit(HandleSubmitForStudentGet)()}
                className="w-full"
              >
                Get
              </Button>
            </div>
          </div>

          {data.length > 0 && (
            <div className="py-4 px-1 bg-background mt-4 flex flex-col gap-3">
              {/* Scrollable table — capped height so Submit button is always reachable */}
              <div className="rounded-md border overflow-y-auto max-h-[45vh]">
                <Table className="w-full">
                  <TableHeader className="sticky top-0 z-10">
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <TableHead
                            key={header.id}
                            className="text-center text-xs sm:text-sm bg-black dark:bg-secondary text-white whitespace-nowrap px-2 sm:px-3 py-2"
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
                    {table.getRowModel().rows.map((row) => (
                      <TableRow key={row.id} className="text-xs sm:text-sm">
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id} className="text-center whitespace-nowrap px-2 sm:px-3 py-2">
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

              {/* Submit button — always visible below the table */}
              <Button type="submit" className="w-full">
                Submit Attendance
              </Button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default MarkAttendance;
