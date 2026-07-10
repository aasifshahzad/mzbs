"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, LoaderCircle, CalendarDays } from "lucide-react";
import { StaffAPI } from "@/api/Staff/StaffAPI";
import { useRole } from "@/context/RoleContext";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Header } from "@/components/dashboard/Header";

interface StaffRow {
  staff_id: number;
  staff_name: string;
  joining_date: string;
  total_stay: string;
}

export default function ViewStaff() {
  const router = useRouter();
  const { role } = useRole();
  const [rows, setRows] = useState<StaffRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (role && !["ADMIN", "CHIEF_PRINCIPAL"].includes(role)) {
      router.replace("/unauthorized");
      return;
    }
    void fetchStaff();
  }, [role, router]);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const response = await StaffAPI.getStaff(search);
      setRows(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load staff list");
    } finally {
      setLoading(false);
    }
  };

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return rows;
    return rows.filter((row) => row.staff_name.toLowerCase().includes(keyword));
  }, [rows, search]);

  return (
    <div className="space-y-4">
      <Header value="View Staff" />
      <div className="space-y-4 p-4 md:p-6">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold">View Staff</h2>
            <p className="text-sm text-slate-500">Teachers and staff members with tenure details</p>
          </div>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search staff"
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none ring-0 dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100 text-left dark:bg-slate-800">
              <tr>
                <th className="px-4 py-3">Sr. No</th>
                <th className="px-4 py-3">Staff Name</th>
                <th className="px-4 py-3">Joining Date</th>
                <th className="px-4 py-3">Total Stay</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center">
                    <div className="flex items-center justify-center gap-2 text-slate-500">
                      <LoaderCircle className="h-5 w-5 animate-spin" />
                      Loading staff list...
                    </div>
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-500">No staff found.</td>
                </tr>
              ) : (
                filteredRows.map((row, index) => (
                  <tr key={row.staff_id} className="border-t border-slate-100 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60">
                    <td className="px-4 py-3">{index + 1}</td>
                    <td className="px-4 py-3 font-medium">{row.staff_name}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-slate-400" />
                        {new Date(row.joining_date).toLocaleDateString("en-GB")}
                      </div>
                    </td>
                    <td className="px-4 py-3">{row.total_stay}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      </div>
    </div>
  );
}
