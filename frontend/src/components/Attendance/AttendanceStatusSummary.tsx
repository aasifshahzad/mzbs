"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/dashboard/Header";
import { toast } from "sonner";
import { AttendanceAPI } from "@/api/Attendance/AttendanceAPI";
import { ClassNameAPI } from "@/api/Classname/ClassNameAPI";
import AxiosInstance from "@/api/axiosInterceptorInstance";
import Loader from "@/components/Loader";

interface ClassNamesData {
  class_name_id: number;
  class_name: string;
}

interface StudentData {
  student_id: number;
  student_name: string;
  father_name: string;
  class_name: string;
}

interface AttendanceStatusResponse {
  student_id: number;
  student_name: string;
  father_name: string;
  class_name: string;
  present: number;
  absent: number;
  late: number;
  leave: number;
  total: number;
  date_range: {
    from: string;
    to: string;
  };
}

interface TopStudentStats extends AttendanceStatusResponse {
  count: number;
}

interface FormData {
  class_name: string;
  student_id: number | string;
  from_date: string;
  to_date: string;
}

const AttendanceStatusSummary = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<FormData>();

  const selectedClass = watch("class_name");
  const [isLoading, setIsLoading] = useState(false);
  const [classes, setClasses] = useState<ClassNamesData[]>([]);
  const [students, setStudents] = useState<StudentData[]>([]);
  const [allStudentsData, setAllStudentsData] = useState<StudentData[]>([]);
  const [classesLoading, setClassesLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(false);

  // Top 10 results
  const [topPresent, setTopPresent] = useState<TopStudentStats[]>([]);
  const [topAbsent, setTopAbsent] = useState<TopStudentStats[]>([]);
  const [topLate, setTopLate] = useState<TopStudentStats[]>([]);
  const [topLeave, setTopLeave] = useState<TopStudentStats[]>([]);
  const [hasResults, setHasResults] = useState(false);

  // Load all classes on component mount
  useEffect(() => {
    loadClasses();
    loadAllStudents();
  }, []);

  // Load students when class is selected
  useEffect(() => {
    if (selectedClass && selectedClass === "ALL") {
      setStudents(allStudentsData);
    } else if (selectedClass) {
      const filtered = allStudentsData.filter(s => s.class_name === selectedClass);
      setStudents(filtered);
    } else {
      setStudents([]);
    }
  }, [selectedClass]);

  const loadAllStudents = async () => {
    try {
      const response = await AxiosInstance.get(`/students/all_students/`);
      const sortedStudents = (response.data || []).sort((a: StudentData, b: StudentData) =>
        a.student_name.localeCompare(b.student_name)
      );
      setAllStudentsData(sortedStudents);
    } catch (error) {
      console.error("Error loading all students:", error);
    }
  };

  const loadClasses = async () => {
    try {
      setClassesLoading(true);
      const response = await ClassNameAPI.Get() as { data: ClassNamesData[] };
      setClasses(response.data || []);
    } catch (error) {
      console.error("Error loading classes:", error);
      toast.error("Failed to load classes");
      setClasses([]);
    } finally {
      setClassesLoading(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      if (!data.class_name || data.class_name === "") {
        toast.error("Please select a class");
        setIsLoading(false);
        return;
      }

      // Determine which students to fetch
      let studentsToFetch: StudentData[] = [];

      if (data.student_id && data.student_id !== 0 && data.student_id !== "0") {
        // Specific student selected
        studentsToFetch = students.filter(s => s.student_id === Number(data.student_id));
      } else {
        // All students option selected
        studentsToFetch = students;
      }

      if (studentsToFetch.length === 0) {
        toast.error("No students found");
        setIsLoading(false);
        return;
      }

      // Fetch attendance summary for each student
      const summaryPromises = studentsToFetch.map(student =>
        AttendanceAPI.GetAttendanceStatusSummary(
          student.student_id,
          data.from_date || undefined,
          data.to_date || undefined
        ).catch(() => null)
      );

      const responses = await Promise.all(summaryPromises);
      const summaryData = responses
        .filter((r): r is any => r !== null && r.data !== null)
        .map(r => r.data) as AttendanceStatusResponse[];

      if (summaryData.length === 0) {
        toast.error("Failed to fetch attendance summary");
        setHasResults(false);
        return;
      }

      // Calculate top 10 for each attendance type
      const topPresentList = summaryData
        .map(s => ({ ...s, count: s.present }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      const topAbsentList = summaryData
        .map(s => ({ ...s, count: s.absent }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      const topLateList = summaryData
        .map(s => ({ ...s, count: s.late }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      const topLeaveList = summaryData
        .map(s => ({ ...s, count: s.leave }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      setTopPresent(topPresentList);
      setTopAbsent(topAbsentList);
      setTopLate(topLateList);
      setTopLeave(topLeaveList);
      setHasResults(true);

      toast.success("Attendance summary loaded successfully");
    } catch (error) {
      console.error("Error fetching attendance summary:", error);
      toast.error("Failed to fetch attendance summary");
      setHasResults(false);
    } finally {
      setIsLoading(false);
    }
  };

  const TopStudentsTable = ({ title, data, color }: { title: string; data: TopStudentStats[]; color: string }) => (
    <div className="bg-white dark:bg-background rounded-xl shadow-sm border border-gray-200 dark:border-secondary overflow-hidden">
      <div className={`px-6 py-4 bg-${color}-50 dark:bg-${color}-900/20 border-b border-gray-200 dark:border-gray-700`}>
        <h3 className={`text-lg font-semibold text-${color}-700 dark:text-${color}-400`}>
          {title}
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Rank</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Student Name</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Father Name</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Class</th>
              <th className={`px-4 py-3 text-center text-sm font-semibold text-${color}-600 dark:text-${color}-400`}>Count</th>
            </tr>
          </thead>
          <tbody>
            {data.length > 0 ? (
              data.map((student, index) => (
                <tr
                  key={index}
                  className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <td className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-gray-100">
                    #{index + 1}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                    {student.student_name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    {student.father_name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    {student.class_name}
                  </td>
                  <td className={`px-4 py-3 text-center text-sm font-bold text-${color}-600 dark:text-${color}-400`}>
                    {student.count}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-3 text-center text-sm text-gray-500 dark:text-gray-400">
                  No data available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="mx-auto w-auto px-2 sm:px-4">
      <Header value="Attendance Status Summary" />
      <Loader isActive={isLoading || classesLoading} />

      {/* Filter Form */}
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="bg-white dark:bg-background rounded-xl shadow-sm border border-gray-200 dark:border-secondary p-4 sm:p-6 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Class Dropdown */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Class *
              </label>
              <select
                {...register("class_name", {
                  required: "Class is required",
                })}
                className="w-full border bg-white rounded-md px-3 py-2 text-sm focus:ring focus:ring-indigo-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 h-10"
              >
                <option value="">-- Select Class --</option>
                <option value="ALL">All Classes</option>
                {classes.map((cls) => (
                  <option key={cls.class_name_id} value={cls.class_name}>
                    {cls.class_name}
                  </option>
                ))}
              </select>
              {errors.class_name && (
                <span className="text-red-500 text-xs">
                  {errors.class_name.message}
                </span>
              )}
            </div>

            {/* Student Dropdown */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Student
              </label>
              <select
                {...register("student_id")}
                disabled={!selectedClass}
                className="w-full border bg-white rounded-md px-3 py-2 text-sm focus:ring focus:ring-indigo-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 h-10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="0">-- All Students --</option>
                {students.map((student) => (
                  <option key={student.student_id} value={student.student_id}>
                    {student.student_name}
                  </option>
                ))}
              </select>
            </div>

            {/* From Date */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                From Date
              </label>
              <Input
                type="date"
                placeholder="From date"
                {...register("from_date")}
                className="h-10 text-sm"
              />
            </div>

            {/* To Date */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                To Date
              </label>
              <Input
                type="date"
                placeholder="To date"
                {...register("to_date")}
                className="h-10 text-sm"
              />
            </div>

            {/* Submit Button */}
            <div className="flex items-end">
              <Button
                type="submit"
                disabled={isLoading || !selectedClass}
                className="w-full h-10 text-sm"
              >
                {isLoading ? "Loading..." : "Get Summary"}
              </Button>
            </div>
          </div>
        </div>
      </form>

      {/* Results */}
      {hasResults && (
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">Top 10 Students Statistics</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top 10 Present */}
            <TopStudentsTable title="Top 10 Present" data={topPresent} color="green" />
            {/* Top 10 Absent */}
            <TopStudentsTable title="Top 10 Absent" data={topAbsent} color="red" />
            {/* Top 10 Late */}
            <TopStudentsTable title="Top 10 Late" data={topLate} color="yellow" />
            {/* Top 10 Leave */}
            <TopStudentsTable title="Top 10 Leave" data={topLeave} color="blue" />
          </div>
        </div>
      )}

      {/* Empty State */}
      {!hasResults && !isLoading && (
        <div className="mt-6 bg-white dark:bg-background rounded-xl shadow-sm border border-gray-200 dark:border-secondary p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            Select a class and click "Get Summary" to view Top 10 students statistics for Present, Absent, Late, and Leave. Optionally filter by a specific student or date range.
          </p>
        </div>
      )}
    </div>
  );
};

export default AttendanceStatusSummary;
