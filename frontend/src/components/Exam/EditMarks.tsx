"use client";

import React, { useEffect, useState } from "react";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/dashboard/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectOption } from "@/components/Select";
import { ClassNameAPI } from "@/api/Classname/ClassNameAPI";
import { StudentAPI } from "@/api/Student/StudentsAPI";
import { ExamMarksAPI } from "@/api/ExamMarks/ExamMarksAPI";
import { useRole } from "@/context/RoleContext";
import type { ExamMarkRecord, ExamMarksSubmitPayload } from "@/models/examMarks/examMarks";

interface ClassNameResponse {
  class_name_id: number;
  class_name: string;
}

interface StudentResponse {
  student_id: number;
  student_name: string;
}

interface ExamSessionSummary {
  exam_date: string;
  class_name_id: number;
  teacher_name_id: number;
  subject_name: string;
  exam_type: string;
  total_marks: number;
  student_count: number;
  teacher_name?: string | null;
}

const extractArrayData = <T,>(response: unknown): T[] => {
  const payload = (response as { data?: unknown }).data;
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object") {
    const nested = (payload as { data?: unknown }).data;
    if (Array.isArray(nested)) return nested as T[];
  }
  return [];
};

const EditMarks = () => {
  const { role } = useRole();
  const [classOptions, setClassOptions] = useState<SelectOption[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [sessions, setSessions] = useState<ExamSessionSummary[]>([]);
  const [selectedSession, setSelectedSession] = useState<ExamSessionSummary | null>(null);
  const [sessionRows, setSessionRows] = useState<ExamMarkRecord[]>([]);
  const [studentNames, setStudentNames] = useState<Record<number, string>>({});
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingSession, setLoadingSession] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [totalMarks, setTotalMarks] = useState("");
  const [entries, setEntries] = useState<{ student_id: number; obtained_marks: number | null }[]>([]);

  useEffect(() => {
    void loadClasses();
  }, []);

  useEffect(() => {
    if (!selectedClassId) {
      setStudentNames({});
      return;
    }
    void loadStudentsForClass();
  }, [selectedClassId]);

  const loadClasses = async () => {
    try {
      const response = await ClassNameAPI.Get();
      const classes = extractArrayData<ClassNameResponse>(response);
      setClassOptions(classes.map((item) => ({ id: item.class_name_id, title: item.class_name })));
    } catch (error) {
      console.error("Failed to load classes", error);
      toast.error("Failed to load classes");
    }
  };

  const loadStudentsForClass = async () => {
    if (!selectedClassId) return;

    try {
      const response = await StudentAPI.GetStudentbyFilter(Number(selectedClassId));
      const students = extractArrayData<StudentResponse>(response);
      const map = students.reduce<Record<number, string>>((acc, student) => {
        acc[student.student_id] = student.student_name;
        return acc;
      }, {});
      setStudentNames(map);
    } catch (error) {
      console.error("Failed to load student names", error);
    }
  };

  const loadPreviousExams = async () => {
    if (!selectedClassId) {
      toast.error("Please select a class first");
      return;
    }

    try {
      setLoadingHistory(true);
      const response = await ExamMarksAPI.GetHistory({ class_name_id: Number(selectedClassId) });
      const history = extractArrayData<ExamSessionSummary>(response);
      setSessions(history);
      setSelectedSession(null);
      setSessionRows([]);
      setIsEditing(false);
      if (!history.length) {
        toast.info("No previous exams found for this class");
      }
    } catch (error) {
      console.error("Failed to load previous exams", error);
      toast.error("Failed to load previous exams");
    } finally {
      setLoadingHistory(false);
    }
  };

  const loadSessionDetails = async (session: ExamSessionSummary, mode: "view" | "edit") => {
    try {
      setLoadingSession(true);
      setSelectedSession(session);
      setIsEditing(mode === "edit");
      const response = await ExamMarksAPI.GetSession({
        exam_date: session.exam_date,
        class_name_id: session.class_name_id,
        teacher_name_id: session.teacher_name_id,
        subject_name: session.subject_name,
        exam_type: session.exam_type,
      });
      const rows = extractArrayData<ExamMarkRecord>(response);
      setSessionRows(rows);
      setEntries(rows.map((row) => ({ student_id: row.student_id, obtained_marks: row.obtained_marks })));
      setTotalMarks(String(session.total_marks));
    } catch (error) {
      console.error("Failed to load exam session", error);
      toast.error("Failed to load exam session");
    } finally {
      setLoadingSession(false);
    }
  };

  const updateEntry = (studentId: number, value: string) => {
    const sanitized = value.replace(/[^0-9]/g, "");
    setEntries((prev) =>
      prev.map((entry) =>
        entry.student_id === studentId
          ? { ...entry, obtained_marks: sanitized === "" ? null : Number.parseInt(sanitized, 10) }
          : entry
      )
    );
  };

  const handleSubmitEdit = async () => {
    if (!selectedSession) return;

    const parsedTotalMarks = Number.parseInt(totalMarks, 10);
    if (!Number.isInteger(parsedTotalMarks) || parsedTotalMarks <= 0) {
      toast.error("Please enter a valid total marks value");
      return;
    }

    try {
      setSubmitting(true);
      const payload: ExamMarksSubmitPayload = {
        exam_date: selectedSession.exam_date,
        class_name_id: selectedSession.class_name_id,
        teacher_name_id: selectedSession.teacher_name_id,
        subject_name: selectedSession.subject_name,
        exam_type: selectedSession.exam_type,
        total_marks: parsedTotalMarks,
        marks: entries,
      };
      await ExamMarksAPI.UpdateSession(payload);
      toast.success("Exam marks updated successfully");
      setIsEditing(false);
      await loadPreviousExams();
    } catch (error) {
      console.error("Failed to update exam marks", error);
      toast.error("Failed to update exam marks");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSession = async (session: ExamSessionSummary) => {
    const confirmed = window.confirm(`Delete all marks for ${session.subject_name} on ${session.exam_date}?`);
    if (!confirmed) return;

    try {
      await ExamMarksAPI.DeleteSession({
        exam_date: session.exam_date,
        class_name_id: session.class_name_id,
        teacher_name_id: session.teacher_name_id,
        subject_name: session.subject_name,
        exam_type: session.exam_type,
      });
      toast.success("Exam session deleted successfully");
      await loadPreviousExams();
    } catch (error) {
      console.error("Failed to delete exam session", error);
      toast.error("Failed to delete exam session");
    }
  };

  const canEdit = role === "ADMIN" || role === "CHIEF_PRINCIPAL" || role === "PRINCIPAL" || role === "TEACHER";
  const canDelete = role === "ADMIN" || role === "CHIEF_PRINCIPAL" || role === "PRINCIPAL";

  return (
    <div className="space-y-6">
      <Header value="Edit Marks" />

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-neutral-900">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Class</label>
            <Select
              options={classOptions}
              value={selectedClassId}
              onChange={(event) => setSelectedClassId(event.target.value)}
              DisplayItem="title"
            />
          </div>

          <div className="flex items-end">
            <Button type="button" onClick={() => void loadPreviousExams()} className="bg-primary text-white">
              {loadingHistory ? "Loading..." : "Load Previous Exams"}
            </Button>
          </div>
        </div>
      </div>

      {sessions.length > 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-neutral-900">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
              <thead className="bg-gray-50 dark:bg-slate-900">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Teacher</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Subject</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Exam</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Total Marks</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Students</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {sessions.map((session) => (
                  <tr key={`${session.exam_date}-${session.subject_name}-${session.exam_type}-${session.teacher_name_id}`}>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{session.exam_date}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{session.teacher_name ?? "-"}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{session.subject_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{session.exam_type}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{session.total_marks}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{session.student_count}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void loadSessionDetails(session, "view")}
                          className="rounded p-1 text-gray-600 transition hover:bg-gray-100"
                          title="View"
                          aria-label="View exam results"
                        >
                          <Eye size={16} />
                        </button>
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => void loadSessionDetails(session, "edit")}
                            className="rounded p-1 text-blue-600 transition hover:bg-blue-100"
                            title="Edit"
                            aria-label="Edit exam results"
                          >
                            <Pencil size={16} />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => void handleDeleteSession(session)}
                            className="rounded p-1 text-red-600 transition hover:bg-red-100"
                            title="Delete"
                            aria-label="Delete exam results"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : !loadingHistory ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-neutral-900 dark:text-gray-400">
          Load a class to view and manage previously conducted exams.
        </div>
      ) : null}

      {selectedSession && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-neutral-900">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{selectedSession.subject_name} • {selectedSession.exam_type}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {selectedSession.exam_date} • {selectedSession.teacher_name ?? "Unknown teacher"}
              </p>
            </div>
            {canEdit && isEditing ? (
              <Button type="button" onClick={() => void handleSubmitEdit()} className="bg-emerald-600 text-white" disabled={submitting}>
                {submitting ? "Saving..." : "Save Changes"}
              </Button>
            ) : null}
          </div>

          {loadingSession ? (
            <div className="text-sm text-gray-500 dark:text-gray-400">Loading exam details...</div>
          ) : isEditing ? (
            <div className="space-y-4">
              <div className="space-y-1.5 max-w-xs">
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

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                  <thead className="bg-gray-50 dark:bg-slate-900">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Student</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Obtained Marks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {sessionRows.map((row) => (
                      <tr key={row.exam_mark_id}>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{studentNames[row.student_id] ?? `Student ${row.student_id}`}</td>
                        <td className="px-4 py-3">
                          <Input
                            type="number"
                            inputMode="numeric"
                            step="1"
                            min="0"
                            max={Number(totalMarks) || undefined}
                            value={entries.find((entry) => entry.student_id === row.student_id)?.obtained_marks ?? ""}
                            onChange={(event) => updateEntry(row.student_id, event.target.value)}
                            placeholder="0"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                <thead className="bg-gray-50 dark:bg-slate-900">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Student</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Obtained Marks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {sessionRows.map((row) => (
                    <tr key={row.exam_mark_id}>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{studentNames[row.student_id] ?? `Student ${row.student_id}`}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{row.obtained_marks ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EditMarks;
