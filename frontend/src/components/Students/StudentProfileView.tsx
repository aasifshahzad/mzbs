'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronFirst, ChevronLast } from 'lucide-react';
import { ClassNameAPI } from '@/api/Classname/ClassNameAPI';
import AxiosInstance from '@/api/axiosInterceptorInstance';
import { StudentProfileAPI } from '@/api/StudentProfile/StudentProfileAPI';
import { Select } from '@/components/Select';
import { Button } from '@/components/ui/button';

interface ClassOption {
  class_name_id: number;
  class_name: string;
}

interface StudentOption {
  student_id: number;
  student_name: string;
}

interface StudentProfileData {
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

type TabKey = 'personal' | 'attendance' | 'exams' | 'fees';

const formatDate = (value?: string | null) => {
  if (!value) return 'N/A';
  const dateValue = new Date(value);
  if (Number.isNaN(dateValue.getTime())) return value;
  const day = String(dateValue.getDate()).padStart(2, '0');
  const month = String(dateValue.getMonth() + 1).padStart(2, '0');
  const year = String(dateValue.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
};

const formatCurrency = (value: number | string) => {
  const numeric = typeof value === 'number' ? value : Number(value || 0);
  return Number.isNaN(numeric) ? '0' : numeric.toLocaleString();
};

const extractArrayData = <T,>(response: unknown): T[] => {
  const payload = (response as { data?: unknown }).data;

  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (payload && typeof payload === 'object') {
    const nestedPayload = (payload as { data?: unknown }).data;
    if (Array.isArray(nestedPayload)) {
      return nestedPayload as T[];
    }
  }

  return [];
};

export default function StudentProfileView() {
  const [classOptions, setClassOptions] = useState<{ id: string | number; title: string }[]>([]);
  const [studentOptions, setStudentOptions] = useState<{ id: string | number; title: string }[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [profile, setProfile] = useState<StudentProfileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('personal');
  const [error, setError] = useState<string | null>(null);
  const [tabPages, setTabPages] = useState<Record<TabKey, number>>({
    personal: 1,
    attendance: 1,
    exams: 1,
    fees: 1,
  });
  const pageSize = 6;

  useEffect(() => {
    const loadClasses = async () => {
      try {
        const response = await ClassNameAPI.Get();
        const classesData = extractArrayData<ClassOption>(response);
        const classes = classesData.map((item) => ({
          id: item.class_name,
          title: item.class_name,
        }));
        setClassOptions(classes);
      } catch (error) {
        console.error('Failed to load classes', error);
      }
    };

    void loadClasses();
  }, []);

  useEffect(() => {
    const loadStudents = async () => {
      if (!selectedClass) {
        setStudentOptions([]);
        setSelectedStudent('');
        return;
      }

      try {
        const response = await AxiosInstance.get('/students/by_class_name/', {
          params: { class_name: selectedClass },
        });
        const studentsData = extractArrayData<StudentOption>(response);
        const students = studentsData.map((item) => ({
          id: item.student_id,
          title: item.student_name,
        }));
        setStudentOptions(students);
        setSelectedStudent('');
      } catch (error) {
        console.error('Failed to load students', error);
        setStudentOptions([]);
      }
    };

    void loadStudents();
  }, [selectedClass]);

  const handleGetInfo = async () => {
    if (!selectedStudent) {
      setError('Please select a student first.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await StudentProfileAPI.getProfile(Number(selectedStudent), selectedClass || undefined);
      setProfile(data);
    } catch (error) {
      console.error('Failed to load student profile', error);
      setError('Unable to load student profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const tabConfig = useMemo(
    () => [
      { key: 'personal' as const, label: 'Personal Information' },
      { key: 'attendance' as const, label: 'Attendance' },
      { key: 'exams' as const, label: 'Exams' },
      { key: 'fees' as const, label: 'Fee History' },
    ],
    []
  );

  const renderPagination = (tab: TabKey, totalItems: number, currentPage: number, totalPages: number) => {
    const safePage = Math.min(Math.max(1, currentPage), Math.max(1, totalPages));
    if (totalItems <= pageSize) return null;

    return (
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
        <p className="text-sm text-gray-600">
          Page {safePage} of {totalPages}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setTabPages((prev) => ({ ...prev, [tab]: 1 }))}
            disabled={safePage === 1}
          >
            <ChevronFirst className="mr-1 h-4 w-4" />
            First
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setTabPages((prev) => ({ ...prev, [tab]: Math.max(1, safePage - 1) }))}
            disabled={safePage === 1}
          >
            Previous
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setTabPages((prev) => ({ ...prev, [tab]: Math.min(totalPages, safePage + 1) }))}
            disabled={safePage === totalPages}
          >
            Next
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setTabPages((prev) => ({ ...prev, [tab]: totalPages }))}
            disabled={safePage === totalPages}
          >
            Last
            <ChevronLast className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  const renderPersonal = () => {
    if (!profile?.student) return null;
    const student = profile.student;
    const fields = [
      ['Student Name', student.student_name],
      ['Class', student.class_name],
      ['Gender', student.student_gender],
      ['Age', student.student_age],
      ['Education', student.student_education],
      ['Date of Birth', formatDate(student.student_date_of_birth)],
      ['City', student.student_city],
      ['Address', student.student_address],
      ['Father Name', student.father_name],
      ['Father Occupation', student.father_occupation],
      ['Father CNIC', student.father_cnic],
      ['Father Contact', student.father_contact],
    ];
    const totalPages = Math.max(1, Math.ceil(fields.length / pageSize));
    const currentPage = Math.min(Math.max(1, tabPages.personal), totalPages);
    const startIndex = (currentPage - 1) * pageSize;
    const visibleFields = fields.slice(startIndex, startIndex + pageSize);

    return (
      <div>
        {renderPagination('personal', fields.length, currentPage, totalPages)}
        <div className="grid gap-4 md:grid-cols-2">
          {visibleFields.map(([label, value]) => (
            <div key={label} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-sm font-semibold text-gray-600">{label}</p>
              <p className="mt-1 text-sm text-gray-900">{value || 'N/A'}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderAttendance = () => {
    if (!profile?.attendance?.length) {
      return <p className="text-sm text-gray-500">No attendance records found.</p>;
    }

    const totalPages = Math.max(1, Math.ceil(profile.attendance.length / pageSize));
    const currentPage = Math.min(Math.max(1, tabPages.attendance), totalPages);
    const startIndex = (currentPage - 1) * pageSize;
    const visibleAttendance = profile.attendance.slice(startIndex, startIndex + pageSize);

    return (
      <div>
        {renderPagination('attendance', profile.attendance.length, currentPage, totalPages)}
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Time</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {visibleAttendance.map((item) => (
                <tr key={item.attendance_id} className="border-t border-gray-200">
                  <td className="px-3 py-2">{formatDate(item.attendance_date)}</td>
                  <td className="px-3 py-2">{item.attendance_time || 'N/A'}</td>
                  <td className="px-3 py-2">{item.attendance_value || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderExams = () => {
    if (!profile?.exams?.length) {
      return <p className="text-sm text-gray-500">No exam records found.</p>;
    }

    const totalPages = Math.max(1, Math.ceil(profile.exams.length / pageSize));
    const currentPage = Math.min(Math.max(1, tabPages.exams), totalPages);
    const startIndex = (currentPage - 1) * pageSize;
    const visibleExams = profile.exams.slice(startIndex, startIndex + pageSize);

    return (
      <div>
        {renderPagination('exams', profile.exams.length, currentPage, totalPages)}
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Subject</th>
                <th className="px-3 py-2">Exam Type</th>
                <th className="px-3 py-2">Marks</th>
              </tr>
            </thead>
            <tbody>
              {visibleExams.map((item) => (
                <tr key={item.exam_id} className="border-t border-gray-200">
                  <td className="px-3 py-2">{formatDate(item.exam_date)}</td>
                  <td className="px-3 py-2">{item.subject_name}</td>
                  <td className="px-3 py-2">{item.exam_type}</td>
                  <td className="px-3 py-2">{item.obtained_marks}/{item.total_marks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderFees = () => {
    if (!profile?.fees?.length) {
      return <p className="text-sm text-gray-500">No fee history found.</p>;
    }

    const totalPages = Math.max(1, Math.ceil(profile.fees.length / pageSize));
    const currentPage = Math.min(Math.max(1, tabPages.fees), totalPages);
    const startIndex = (currentPage - 1) * pageSize;
    const visibleFees = profile.fees.slice(startIndex, startIndex + pageSize);

    return (
      <div>
        {renderPagination('fees', profile.fees.length, currentPage, totalPages)}
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-3 py-2">Month</th>
                <th className="px-3 py-2">Year</th>
                <th className="px-3 py-2">Amount</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {visibleFees.map((item) => (
                <tr key={item.fee_id} className="border-t border-gray-200">
                  <td className="px-3 py-2">{item.fee_month}</td>
                  <td className="px-3 py-2">{item.fee_year}</td>
                  <td className="px-3 py-2">{formatCurrency(item.fee_amount)}</td>
                  <td className="px-3 py-2">{item.fee_status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Filter Card */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg shadow-sm">
        <div className="p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">
            Select Student
          </h3>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleGetInfo();
            }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Class Dropdown */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block">
                  Class
                </label>
                <Select
                  options={classOptions}
                  value={selectedClass}
                  onChange={(event) => setSelectedClass(event.target.value)}
                  className="h-10 text-sm rounded-lg w-full"
                />
              </div>

              {/* Student Dropdown */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block">
                  Student Name
                </label>
                <Select
                  options={studentOptions}
                  value={selectedStudent}
                  onChange={(event) => setSelectedStudent(event.target.value)}
                  disabled={!selectedClass}
                  className="h-10 text-sm rounded-lg w-full"
                />
              </div>

              {/* Action Buttons - span remaining space */}
              <div className="flex items-end gap-2 col-span-1 sm:col-span-2 lg:col-span-1">
                <button
                  type="submit"
                  className="flex-1 h-10 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 dark:bg-blue-700 dark:hover:bg-blue-600 text-white font-semibold text-sm rounded-lg transition-colors shadow-sm"
                  disabled={loading}
                >
                  {loading ? 'Loading...' : 'Get Info'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedStudent) {
                      void handleGetInfo();
                    }
                  }}
                  className="flex-1 h-10 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 font-semibold text-sm rounded-lg transition-colors"
                >
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex-1 h-10 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 font-semibold text-sm rounded-lg transition-colors"
                >
                  Print
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {profile && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex flex-wrap gap-2 no-print">
            {tabConfig.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-full px-3 py-2 text-sm font-semibold ${
                  activeTab === tab.key
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {activeTab === 'personal' && renderPersonal()}
            {activeTab === 'attendance' && renderAttendance()}
            {activeTab === 'exams' && renderExams()}
            {activeTab === 'fees' && renderFees()}
          </div>
        </div>
      )}
    </div>
  );
}
