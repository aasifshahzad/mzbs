"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/dashboard/Header";
import { getStudentPortalProfile } from "@/api/StudentPortal/studentPortalAPI";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useRouter } from "next/navigation";

interface StudentPortalProfile {
  student: {
    student_id: number;
    student_name: string;
    student_date_of_birth: string;
    student_gender: string;
    student_age: string;
    student_education: string;
    class_name: string;
    student_city: string;
    student_address: string;
    father_name: string;
    father_occupation: string;
    father_cnic: string;
    father_cast_name: string;
    father_contact: string;
  };
  attendance: Array<{
    attendance_id: number;
    attendance_date: string;
    attendance_time: string | null;
    attendance_value: string | null;
  }>;
  exams: Array<{
    exam_id: number;
    exam_date: string;
    subject_name: string;
    exam_type: string;
    total_marks: number;
    obtained_marks: number;
  }>;
  fees: Array<{
    fee_id: number;
    fee_month: string;
    fee_year: string;
    fee_amount: number | string;
    fee_status: string;
  }>;
}

function formatDate(value?: string | number | null) {
  if (!value) return "N/A";
  const dateString = String(value).split("T")[0];
  const [year, month, day] = dateString.split("-");
  if (!year || !month || !day) return String(value);
  return `${day}-${month}-${year}`;
}

function calculateAgeFromDOB(dob?: string | null) {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  let years = today.getFullYear() - d.getFullYear();
  let months = today.getMonth() - d.getMonth();
  let days = today.getDate() - d.getDate();
  if (days < 0) {
    months--;
    const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
    days += prevMonth.getDate();
  }
  if (months < 0) {
    years--;
    months += 12;
  }
  if (years < 0) return null;
  return `${years} year${years !== 1 ? "s" : ""}`;
}

function formatAmount(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return "0";
  const numeric = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(numeric)) return "0";
  return numeric.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export default function StudentPortalDashboardPage() {
  const [profile, setProfile] = useState<StudentPortalProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Collapsible sections state
  const [attendanceExpanded, setAttendanceExpanded] = useState(false);
  const [examsExpanded, setExamsExpanded] = useState(false);
  const [feesExpanded, setFeesExpanded] = useState(false);

  // Pagination state per section
  const [attendancePage, setAttendancePage] = useState(1);
  const [examsPage, setExamsPage] = useState(1);
  const [feesPage, setFeesPage] = useState(1);
  const PAGE_SIZE = 10;

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await getStudentPortalProfile();
        setProfile(response);
      } catch (err: any) {
        console.error(err);
        setError(err?.response?.data?.detail || "Unable to load student profile.");
      } finally {
        setLoading(false);
      }
    };
    void loadProfile();
  }, []);

  const router = useRouter();

  function handleLogout() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("studentPortalToken");
      localStorage.removeItem("studentPortalUser");
      router.push("/student-login");
    }
  }

  function handleChangePassword() {
    router.push("/student-portal/change-password");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header value="Student Dashboard" />
      <main className="mx-auto max-w-6xl p-4">
        <div className="rounded-xl bg-white p-6 shadow-sm">
          {loading ? (
            <p className="text-center text-gray-600">Loading profile...</p>
          ) : error ? (
            <p className="text-center text-red-600">{error}</p>
          ) : profile ? (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold mb-3">Welcome, {profile.student.student_name}</h2>
                <div className="flex gap-2">
                  <button onClick={handleChangePassword} className="px-3 py-1 rounded border text-sm">Change password</button>
                  <button onClick={handleLogout} className="px-3 py-1 rounded bg-red-600 text-white text-sm">Logout</button>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-6">
                {[
                  ["Class", profile.student.class_name],
                  ["Gender", profile.student.student_gender],
                  ["Age", profile.student.student_age || calculateAgeFromDOB(profile.student.student_date_of_birth)],
                  ["Education", profile.student.student_education],
                  ["Date of Birth", formatDate(profile.student.student_date_of_birth)],
                  ["City", profile.student.student_city],
                  ["Address", profile.student.student_address],
                  ["Father Name", profile.student.father_name],
                  ["Father Occupation", profile.student.father_occupation],
                  ["Father CNIC", profile.student.father_cnic],
                  ["Father Contact", profile.student.father_contact],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">{label}</p>
                    <p className="mt-1 text-lg font-semibold">{value || "N/A"}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-6">
                {/* Attendance Section */}
                <section className="bg-white rounded-lg p-4 border border-slate-200 mb-4">
                  <button
                    onClick={() => setAttendanceExpanded(!attendanceExpanded)}
                    className="w-full flex items-center justify-between text-left hover:bg-slate-50 rounded-lg p-2 -m-2 mb-3"
                  >
                    <h3 className="text-lg font-semibold">Attendance</h3>
                    {attendanceExpanded ? <ChevronUp className="h-5 w-5 text-gray-500" /> : <ChevronDown className="h-5 w-5 text-gray-500" />}
                  </button>

                  {attendanceExpanded && (
                    <>
                      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-50">
                        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                          <thead className="bg-slate-100 text-slate-700">
                            <tr>
                              <th className="px-4 py-3">Date</th>
                              <th className="px-4 py-3">Time</th>
                              <th className="px-4 py-3">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {(!profile || profile.attendance.length === 0) ? (
                              <tr>
                                <td colSpan={3} className="px-4 py-4 text-slate-600">No attendance records found.</td>
                              </tr>
                            ) : (
                              (() => {
                                const items = profile.attendance;
                                const total = items.length;
                                const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
                                const page = Math.min(Math.max(1, attendancePage), totalPages);
                                const slice = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
                                return (
                                  <>
                                    {slice.map((item) => (
                                      <tr key={item.attendance_id}>
                                        <td className="px-4 py-3">{formatDate(item.attendance_date)}</td>
                                        <td className="px-4 py-3">{item.attendance_time || "N/A"}</td>
                                        <td className="px-4 py-3">{item.attendance_value || "N/A"}</td>
                                      </tr>
                                    ))}
                                    <tr>
                                      <td colSpan={3} className="px-4 py-3">
                                        <div className="flex items-center justify-between">
                                          <div className="text-sm text-slate-600">Showing {(page - 1) * PAGE_SIZE + 1} - {Math.min(page * PAGE_SIZE, total)} of {total}</div>
                                          <div className="flex items-center gap-2">
                                            <button disabled={page === 1} onClick={() => setAttendancePage(1)} className="px-3 py-1 rounded border text-sm">First</button>
                                            <button disabled={page === 1} onClick={() => setAttendancePage(Math.max(1, page - 1))} className="px-3 py-1 rounded border text-sm">Prev</button>
                                            <span className="text-sm">Page {page} / {totalPages}</span>
                                            <button disabled={page === totalPages} onClick={() => setAttendancePage(Math.min(totalPages, page + 1))} className="px-3 py-1 rounded border text-sm">Next</button>
                                            <button disabled={page === totalPages} onClick={() => setAttendancePage(totalPages)} className="px-3 py-1 rounded border text-sm">Last</button>
                                          </div>
                                        </div>
                                      </td>
                                    </tr>
                                  </>
                                );
                              })()
                            )}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </section>

                {/* Exams Section */}
                <section className="bg-white rounded-lg p-4 border border-slate-200 mb-4">
                  <button
                    onClick={() => setExamsExpanded(!examsExpanded)}
                    className="w-full flex items-center justify-between text-left hover:bg-slate-50 rounded-lg p-2 -m-2 mb-3"
                  >
                    <h3 className="text-lg font-semibold">Exams</h3>
                    {examsExpanded ? <ChevronUp className="h-5 w-5 text-gray-500" /> : <ChevronDown className="h-5 w-5 text-gray-500" />}
                  </button>

                  {examsExpanded && (
                    <>
                      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-50">
                        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                          <thead className="bg-slate-100 text-slate-700">
                            <tr>
                              <th className="px-4 py-3">Date</th>
                              <th className="px-4 py-3">Subject</th>
                              <th className="px-4 py-3">Type</th>
                              <th className="px-4 py-3">Marks</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {(!profile || profile.exams.length === 0) ? (
                              <tr>
                                <td colSpan={4} className="px-4 py-4 text-slate-600">No exam records found.</td>
                              </tr>
                            ) : (
                              (() => {
                                const items = profile.exams;
                                const total = items.length;
                                const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
                                const page = Math.min(Math.max(1, examsPage), totalPages);
                                const slice = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
                                return (
                                  <>
                                    {slice.map((item) => (
                                      <tr key={item.exam_id}>
                                        <td className="px-4 py-3">{formatDate(item.exam_date)}</td>
                                        <td className="px-4 py-3">{item.subject_name}</td>
                                        <td className="px-4 py-3">{item.exam_type}</td>
                                        <td className="px-4 py-3">{item.obtained_marks}/{item.total_marks}</td>
                                      </tr>
                                    ))}
                                    <tr>
                                      <td colSpan={4} className="px-4 py-3">
                                        <div className="flex items-center justify-between">
                                          <div className="text-sm text-slate-600">Showing {(page - 1) * PAGE_SIZE + 1} - {Math.min(page * PAGE_SIZE, total)} of {total}</div>
                                          <div className="flex items-center gap-2">
                                            <button disabled={page === 1} onClick={() => setExamsPage(1)} className="px-3 py-1 rounded border text-sm">First</button>
                                            <button disabled={page === 1} onClick={() => setExamsPage(Math.max(1, page - 1))} className="px-3 py-1 rounded border text-sm">Prev</button>
                                            <span className="text-sm">Page {page} / {totalPages}</span>
                                            <button disabled={page === totalPages} onClick={() => setExamsPage(Math.min(totalPages, page + 1))} className="px-3 py-1 rounded border text-sm">Next</button>
                                            <button disabled={page === totalPages} onClick={() => setExamsPage(totalPages)} className="px-3 py-1 rounded border text-sm">Last</button>
                                          </div>
                                        </div>
                                      </td>
                                    </tr>
                                  </>
                                );
                              })()
                            )}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </section>

                {/* Fees Section */}
                <section className="bg-white rounded-lg p-4 border border-slate-200 mb-4">
                  <button
                    onClick={() => setFeesExpanded(!feesExpanded)}
                    className="w-full flex items-center justify-between text-left hover:bg-slate-50 rounded-lg p-2 -m-2 mb-3"
                  >
                    <h3 className="text-lg font-semibold">Fees</h3>
                    {feesExpanded ? <ChevronUp className="h-5 w-5 text-gray-500" /> : <ChevronDown className="h-5 w-5 text-gray-500" />}
                  </button>

                  {feesExpanded && (
                    <>
                      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-50">
                        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                          <thead className="bg-slate-100 text-slate-700">
                            <tr>
                              <th className="px-4 py-3">Month</th>
                              <th className="px-4 py-3">Year</th>
                              <th className="px-4 py-3">Amount</th>
                              <th className="px-4 py-3">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {(!profile || profile.fees.length === 0) ? (
                              <tr>
                                <td colSpan={4} className="px-4 py-4 text-slate-600">No fee records found.</td>
                              </tr>
                            ) : (
                              (() => {
                                const items = profile.fees;
                                const total = items.length;
                                const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
                                const page = Math.min(Math.max(1, feesPage), totalPages);
                                const slice = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
                                return (
                                  <>
                                    {slice.map((item) => (
                                      <tr key={item.fee_id}>
                                        <td className="px-4 py-3">{item.fee_month}</td>
                                        <td className="px-4 py-3">{item.fee_year}</td>
                                        <td className="px-4 py-3">{formatAmount(item.fee_amount)}</td>
                                        <td className="px-4 py-3">{item.fee_status}</td>
                                      </tr>
                                    ))}
                                    <tr>
                                      <td colSpan={4} className="px-4 py-3">
                                        <div className="flex items-center justify-between">
                                          <div className="text-sm text-slate-600">Showing {(page - 1) * PAGE_SIZE + 1} - {Math.min(page * PAGE_SIZE, total)} of {total}</div>
                                          <div className="flex items-center gap-2">
                                            <button disabled={page === 1} onClick={() => setFeesPage(1)} className="px-3 py-1 rounded border text-sm">First</button>
                                            <button disabled={page === 1} onClick={() => setFeesPage(Math.max(1, page - 1))} className="px-3 py-1 rounded border text-sm">Prev</button>
                                            <span className="text-sm">Page {page} / {totalPages}</span>
                                            <button disabled={page === totalPages} onClick={() => setFeesPage(Math.min(totalPages, page + 1))} className="px-3 py-1 rounded border text-sm">Next</button>
                                            <button disabled={page === totalPages} onClick={() => setFeesPage(totalPages)} className="px-3 py-1 rounded border text-sm">Last</button>
                                          </div>
                                        </div>
                                      </td>
                                    </tr>
                                  </>
                                );
                              })()
                            )}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </section>
              </div>
            </>
          ) : (
            <p className="text-center text-gray-600">No profile available.</p>
          )}
        </div>
      </main>
    </div>
  );
}
