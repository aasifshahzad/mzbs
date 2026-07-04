"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Header } from "@/components/dashboard/Header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectOption } from "@/components/Select";
import { ClassNameAPI } from "@/api/Classname/ClassNameAPI";
import { TeacherNameAPI } from "@/api/Teacher/TeachetAPI";
import { StudentAPI } from "@/api/Student/StudentsAPI";
import { ClassSubjectAPI } from "@/api/ClassSubject/ClassSubjectAPI";
import { ExamMarksAPI } from "@/api/ExamMarks/ExamMarksAPI";
import type { ExamMarkEntry } from "@/models/examMarks/examMarks";

interface ClassNameResponse {
  class_name_id: number;
  class_name: string;
}

interface TeacherResponse {
  teacher_name_id: number;
  teacher_name: string;
}

interface StudentResponse {
  student_id: number;
  student_name: string;
}

interface ClassSubjectResponse {
  class_name_id: number;
  subject_name: string;
}

const examTypes = [
  { id: "Weekly Test", title: "Weekly Test" },
  { id: "Monthly Test", title: "Monthly Test" },
  { id: "3 Monthly", title: "3 Monthly" },
  { id: "6 Monthly", title: "6 Monthly" },
  { id: "Final Exam", title: "Final Exam" },
];

const extractArrayData = <T,>(response: unknown): T[] => {
  const payload = (response as { data?: unknown }).data;
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object") {
    const nested = (payload as { data?: unknown }).data;
    if (Array.isArray(nested)) return nested as T[];
  }
  return [];
};

const EnterMarks = () => {
  const getTodayString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = `${today.getMonth() + 1}`.padStart(2, "0");
    const day = `${today.getDate()}`.padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const [date, setDate] = useState(getTodayString);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedExamType, setSelectedExamType] = useState("");
  const [totalMarks, setTotalMarks] = useState("");
  const [classOptions, setClassOptions] = useState<SelectOption[]>([]);
  const [teacherOptions, setTeacherOptions] = useState<SelectOption[]>([]);
  const [subjectOptions, setSubjectOptions] = useState<SelectOption[]>([]);
  const [students, setStudents] = useState<StudentResponse[]>([]);
  const [entries, setEntries] = useState<ExamMarkEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void loadClasses();
    void loadTeachers();
  }, []);

  useEffect(() => {
    if (!selectedClassId) {
      setSubjectOptions([]);
      setSelectedSubject("");
      return;
    }

    void loadSubjects();
  }, [selectedClassId]);

  const loadClasses = async () => {
    try {
      const response = await ClassNameAPI.Get();
      const classNames = extractArrayData<ClassNameResponse>(response);
      setClassOptions(
        classNames.map((item) => ({ id: item.class_name_id, title: item.class_name }))
      );
    } catch (error) {
      console.error("Failed to load classes", error);
      toast.error("Failed to load classes");
    }
  };

  const loadTeachers = async () => {
    try {
      const response = await TeacherNameAPI.Get();
      const teachers = extractArrayData<TeacherResponse>(response);
      setTeacherOptions(
        teachers.map((item) => ({ id: item.teacher_name_id, title: item.teacher_name }))
      );
    } catch (error) {
      console.error("Failed to load teachers", error);
      toast.error("Failed to load teachers");
    }
  };

  const loadSubjects = async () => {
    try {
      const response = await ClassSubjectAPI.Get();
      const subjects = extractArrayData<ClassSubjectResponse>(response);
      const filteredSubjects = subjects
        .filter((item) => String(item.class_name_id) === selectedClassId)
        .map((item) => ({ id: item.subject_name, title: item.subject_name }));
      setSubjectOptions(filteredSubjects);
      if (!filteredSubjects.some((item) => item.id === selectedSubject)) {
        setSelectedSubject("");
      }
    } catch (error) {
      console.error("Failed to load subjects", error);
      toast.error("Failed to load subjects");
    }
  };

  const loadStudents = async () => {
    if (!selectedClassId) {
      toast.error("Please select a class first");
      return;
    }
    if (!selectedTeacherId) {
      toast.error("Please select a teacher first");
      return;
    }
    if (!selectedSubject) {
      toast.error("Please select a subject first");
      return;
    }

    const parsedTotalMarks = Number.parseInt(totalMarks, 10);
    if (!Number.isInteger(parsedTotalMarks) || parsedTotalMarks <= 0) {
      toast.error("Please enter a valid total marks value");
      return;
    }

    try {
      setLoading(true);
      const response = await StudentAPI.GetStudentbyFilter(Number(selectedClassId));
      const studentsData = extractArrayData<StudentResponse>(response);
      setStudents(studentsData);
      setEntries(
        studentsData.map((student) => ({
          student_id: student.student_id,
          obtained_marks: null,
        }))
      );
      toast.success(`Loaded ${studentsData.length} students`);
    } catch (error) {
      console.error("Failed to load students", error);
      toast.error("Failed to load students");
    } finally {
      setLoading(false);
    }
  };

  const updateEntry = (studentId: number, value: string) => {
    const sanitizedValue = value.replace(/[^0-9]/g, "");
    setEntries((prev) =>
      prev.map((entry) =>
        entry.student_id === studentId
          ? { ...entry, obtained_marks: sanitizedValue === "" ? null : Number.parseInt(sanitizedValue, 10) }
          : entry
      )
    );
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedClassId || !selectedTeacherId || !selectedSubject || !selectedExamType || !date) {
      toast.error("Please complete all the exam details");
      return;
    }

    const parsedTotalMarks = Number.parseInt(totalMarks, 10);
    if (!Number.isInteger(parsedTotalMarks) || parsedTotalMarks <= 0) {
      toast.error("Please enter a valid total marks value");
      return;
    }

    if (!entries.length) {
      toast.error("Load students before submitting marks");
      return;
    }

    try {
      setLoading(true);
      await ExamMarksAPI.Submit({
        exam_date: date,
        class_name_id: Number(selectedClassId),
        teacher_name_id: Number(selectedTeacherId),
        subject_name: selectedSubject,
        exam_type: selectedExamType,
        total_marks: parsedTotalMarks,
        marks: entries,
      });
      toast.success("Exam marks submitted successfully");
    } catch (error) {
      console.error("Failed to submit exam marks", error);
      toast.error("Failed to submit exam marks");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Header value="Enter Marks" />

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-neutral-900">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Date</label>
              <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Class</label>
              <Select
                options={classOptions}
                value={selectedClassId}
                onChange={(event) => setSelectedClassId(event.target.value)}
                DisplayItem="title"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Teacher Name</label>
              <Select
                options={teacherOptions}
                value={selectedTeacherId}
                onChange={(event) => setSelectedTeacherId(event.target.value)}
                DisplayItem="title"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Subject</label>
              <Select
                options={subjectOptions}
                value={selectedSubject}
                onChange={(event) => setSelectedSubject(event.target.value)}
                DisplayItem="title"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Exam</label>
              <Select
                options={examTypes}
                value={selectedExamType}
                onChange={(event) => setSelectedExamType(event.target.value)}
                DisplayItem="title"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Marks</label>
              <Input
                type="number"
                inputMode="numeric"
                step="1"
                min="1"
                value={totalMarks}
                onChange={(event) => setTotalMarks(event.target.value.replace(/[^0-9]/g, ""))}
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <Button type="button" onClick={loadStudents} className="bg-primary text-white">
              Load Students
            </Button>
            <Button type="submit" className="bg-emerald-600 text-white">
              Submit Marks
            </Button>
          </div>
        </div>

        {students.length > 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-neutral-900">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                <thead className="bg-gray-50 dark:bg-slate-900">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Student</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Obtained Marks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {students.map((student) => {
                    const entry = entries.find((item) => item.student_id === student.student_id);
                    return (
                      <tr key={student.student_id}>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{student.student_name}</td>
                        <td className="px-4 py-3">
                          <Input
                            type="number"
                            inputMode="numeric"
                            step="1"
                            min="0"
                            max={Number(totalMarks) || undefined}
                            value={entry?.obtained_marks ?? ""}
                            onChange={(event) => updateEntry(student.student_id, event.target.value)}
                            placeholder="0"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-neutral-900 dark:text-gray-400">
            Load students for the selected class to begin entering marks.
          </div>
        )}
      </form>
    </div>
  );
};

export default EnterMarks;
