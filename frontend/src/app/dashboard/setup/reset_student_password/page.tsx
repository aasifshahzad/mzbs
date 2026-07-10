"use client";
import React, { useEffect, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { ClassNameAPI } from '@/api/Classname/ClassNameAPI';
import { StudentAPI } from '@/api/Student/StudentsAPI';
import { adminResetStudentPassword } from '@/api/StudentPortal/studentPortalAPI';
import { Header } from '@/components/dashboard/Header';
import { toast } from 'sonner';

const extractArrayData = <T,>(response: unknown): T[] => {
  const payload = (response as { data?: unknown })?.data;

  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === 'object') {
    const nested = (payload as { data?: unknown }).data;
    if (Array.isArray(nested)) return nested as T[];
  }

  // fallback to response itself if it's an array
  if (Array.isArray(response as any)) return response as any;
  return [];
};

export default function ResetStudentPasswordPage() {
  const [classes, setClasses] = useState<Array<any>>([]);
  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [students, setStudents] = useState<Array<any>>([]);
  const [selectedStudent, setSelectedStudent] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await ClassNameAPI.Get();
        const list = extractArrayData<{ class_name_id: number; class_name: string }>(res);
        setClasses(list);
      } catch (err) {
        console.error(err);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedClass) {
      setStudents([]);
      setSelectedStudent(null);
      return;
    }

    (async () => {
      try {
        const res = await StudentAPI.GetByClassId(selectedClass);
        let list = extractArrayData<{ student_id: number; student_name: string; class_name?: string }>(res);

        if (!list.length) {
          try {
            const all = await StudentAPI.Get();
            const allList = extractArrayData<{ student_id: number; student_name: string; class_name?: string }>(all);
            const cls = classes.find((c) => c.class_name_id === selectedClass);
            if (cls && allList.length) {
              list = allList.filter((s) => s.class_name === cls.class_name);
            } else {
              list = allList;
            }
          } catch (innerErr) {
            console.error('Fallback fetch students failed', innerErr);
          }
        }

        setStudents(list);
        setSelectedStudent(null);
      } catch (err) {
        console.error(err);
      }
    })();
  }, [classes, selectedClass]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedStudent) return setMessage('Please select a student');
    if (!newPassword) return setMessage('Enter new password');
    if (newPassword !== confirmPassword) return setMessage('Passwords do not match');
    setLoading(true);
      try {
      const res = await adminResetStudentPassword(selectedStudent, newPassword);
      const msg = res?.message || 'Password reset';
      setMessage(msg);
      toast.success(msg);
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error(err);
      const detail = err?.response?.data?.detail || 'Error resetting password';
      setMessage(detail);
      toast.error(detail);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full h-screen overflow-y-auto bg-bg-light-secondary dark:bg-bg-dark-primary">
      <div className="pt-2 pl-2 pr-2">
        <Header value="Student Password" />
      </div>

      <div className="p-6">
        {message && <div className="mb-4 text-sm text-gray-700">{message}</div>}
        <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
          <div>
            <label className="block text-sm mb-1">Class</label>
            <select
              className="w-full border rounded p-2"
              value={selectedClass ?? ''}
              onChange={(e) => setSelectedClass(Number(e.target.value) || null)}
            >
              <option value="">Select class</option>
              {classes.map((c) => (
                <option key={c.class_name_id} value={c.class_name_id}>{c.class_name}</option>
              ))}
            </select>
            {classes.length === 0 && <p className="text-xs text-gray-500 mt-1">No classes available</p>}
          </div>

          <div>
            <label className="block text-sm mb-1">Student</label>
            <select
              className="w-full border rounded p-2"
              value={selectedStudent ?? ''}
              onChange={(e) => setSelectedStudent(Number(e.target.value) || null)}
            >
              <option value="">Select student</option>
              {students.map((s) => (
                <option key={s.student_id} value={s.student_id}>{s.student_name}</option>
              ))}
            </select>
            {selectedClass && students.length === 0 && (
              <p className="text-xs text-gray-500 mt-1">No students found for selected class</p>
            )}
          </div>

          <div className="relative">
            <label className="block text-sm mb-1">New Password</label>
            <input
              type={showNew ? 'text' : 'password'}
              className="w-full border rounded p-2 pr-10"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <button type="button" onClick={() => setShowNew((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500" aria-label={showNew ? 'Hide new password' : 'Show new password'}>
              {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <div className="relative">
            <label className="block text-sm mb-1">Confirm Password</label>
            <input
              type={showConfirm ? 'text' : 'password'}
              className="w-full border rounded p-2 pr-10"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <button type="button" onClick={() => setShowConfirm((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500" aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}>
              {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded"
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
