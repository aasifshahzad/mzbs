"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, LoaderCircle, Save } from "lucide-react";
import { StaffAPI } from "@/api/Staff/StaffAPI";
import { useRole } from "@/context/RoleContext";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Header } from "@/components/dashboard/Header";

interface StaffAttendanceRow {
  staff_id: number;
  staff_name: string;
  joining_date: string;
  total_stay: string;
  attendance_id?: number;
  attendance_date?: string;
  attendance_status?: string;
  is_marked: boolean;
}

type StaffAttendanceStatus = "Present" | "Absent" | "Late" | "Leave" | "Unmarked";

const statusOptions: StaffAttendanceStatus[] = ["Present", "Absent", "Late", "Leave"];

const statusStyles: Record<StaffAttendanceStatus, string> = {
  Present: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800",
  Absent: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
  Late: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
  Leave: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800",
  Unmarked: "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-700 dark:text-slate-400 dark:border-slate-600",
};

function StatusBadge({ status }: { status: StaffAttendanceStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${statusStyles[status]}`}>
      {status}
    </span>
  );
}

export default function StaffAttendancePage() {
  const router = useRouter();
  const { role } = useRole();
  const [rows, setRows] = useState<StaffAttendanceRow[]>([]);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (role && !["ADMIN", "CHIEF_PRINCIPAL", "PRINCIPAL"].includes(role)) {
      router.replace("/unauthorized");
      return;
    }
    void loadAttendance(selectedDate);
  }, [role, router, selectedDate]);

  const loadAttendance = async (date: string) => {
    setLoading(true);
    try {
      const response = await StaffAPI.getAttendanceRows(date);
      setRows(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load staff attendance");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (staffId: number, status: StaffAttendanceStatus) => {
    setRows((current) =>
      current.map((row) => {
        if (row.staff_id !== staffId) return row;
        return {
          ...row,
          attendance_status: status,
          is_marked: status !== "Unmarked",
        };
      })
    );
  };

  const handleCheckboxChange = (staffId: number, status: StaffAttendanceStatus, checked: boolean) => {
    if (!checked) {
      handleStatusChange(staffId, "Unmarked");
      return;
    }

    handleStatusChange(staffId, status);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = rows.map((row) => ({
        staff_id: row.staff_id,
        attendance_status: row.attendance_status || "Unmarked",
      }));
      const response = await StaffAPI.submitAttendance(selectedDate, payload);
      const summary = response?.data?.summary;

      if (summary) {
        const { created_count = 0, updated_count = 0, skipped_count = 0 } = summary;
        const parts: string[] = [];
        if (updated_count > 0) parts.push(`Updated ${updated_count} attendance`);
        if (created_count > 0) parts.push(`Created ${created_count} attendance`);
        if (skipped_count > 0) parts.push(`Skipped ${skipped_count} unchanged`);
        toast.success(parts.length > 0 ? parts.join(" • ") : "Attendance saved successfully");
      } else {
        toast.success("Attendance saved successfully");
      }

      await loadAttendance(selectedDate);
    } catch (error) {
      console.error(error);
      toast.error("Failed to save attendance");
    } finally {
      setSubmitting(false);
    }
  };

  const summary = useMemo(() => {
    const counts: Record<StaffAttendanceStatus, number> = {
      Present: 0,
      Absent: 0,
      Late: 0,
      Leave: 0,
      Unmarked: 0,
    };

    rows.forEach((row) => {
      const status = (row.attendance_status || "Unmarked") as StaffAttendanceStatus;
      counts[status] += 1;
    });

    return counts;
  }, [rows]);

  return (
    <div className="space-y-4">
      <Header value="Staff Attendance" />

      <div className="space-y-4 p-4 md:p-6">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Staff Attendance</h2>
              <p className="text-sm text-slate-500">Mark or update attendance for teachers and staff</p>
            </div>
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <label className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700">
                <CalendarDays className="h-4 w-4 text-slate-400" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(event) => setSelectedDate(event.target.value)}
                  className="bg-transparent outline-none"
                />
              </label>
              <button
                onClick={() => void handleSubmit()}
                disabled={submitting}
                className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Submit Attendance
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Summary:</span>
            {(["Present", "Absent", "Late", "Leave", "Unmarked"] as const).map((status) => (
              <div key={status} className={`rounded-full border px-3 py-1 ${statusStyles[status]}`}>
                {status}: {summary[status]}
              </div>
            ))}
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Mark All:</span>
            {statusOptions.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => rows.forEach((row) => handleStatusChange(row.staff_id, status))}
                className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                All {status}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 text-left dark:bg-slate-800">
                <tr>
                  <th className="px-4 py-3">Staff Name</th>
                  {statusOptions.map((status) => (
                    <th key={status} className="px-4 py-3 text-center">{status}</th>
                  ))}
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={statusOptions.length + 2} className="px-4 py-8 text-center">
                      <div className="flex items-center justify-center gap-2 text-slate-500">
                        <LoaderCircle className="h-5 w-5 animate-spin" />
                        Loading attendance...
                      </div>
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={statusOptions.length + 2} className="px-4 py-8 text-center text-slate-500">No staff available.</td>
                  </tr>
                ) : (
                  rows.map((row) => {
                    const currentStatus = (row.attendance_status || "Unmarked") as StaffAttendanceStatus;
                    return (
                      <tr
                        key={row.staff_id}
                        className={`border-t border-slate-100 ${currentStatus === "Unmarked" ? "bg-amber-50/70 dark:bg-amber-900/20" : "bg-emerald-50/70 dark:bg-emerald-900/20"}`}
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium">{row.staff_name}</div>
                        </td>
                        {statusOptions.map((status) => (
                          <td key={status} className="px-4 py-3 text-center">
                            <Checkbox
                              checked={currentStatus === status}
                              onCheckedChange={(checked) => handleCheckboxChange(row.staff_id, status, checked === true)}
                              className="h-5 w-5"
                            />
                          </td>
                        ))}
                        <td className="px-4 py-3 text-center">
                          <StatusBadge status={currentStatus} />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={() => void handleSubmit()}
              disabled={submitting}
              className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Submit Attendance
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
