'use client';

import { useState } from 'react';
import { StudentAPI } from '@/api/Student/StudentsAPI';
import { Trash2 } from 'lucide-react';
import { useRole } from '@/context/RoleContext';

interface DeletedStudent {
  student_id: number;
  student_name: string;
  class_name: string;
  reason: string;
  deleted_by: number;
  deleted_by_name?: string;
  deleted_at: string;
}

interface DeletedStudentsTableProps {
  students: DeletedStudent[];
  onRestoreSuccess: () => void;
}

export default function DeletedStudentsTable({
  students,
  onRestoreSuccess,
}: DeletedStudentsTableProps) {
  const { role } = useRole();
  const isAdmin = role === 'ADMIN';
  const [restoringId, setRestoringId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState('');

  const handleRestore = async (deletedRecordId: number, name: string) => {
    const confirmed = window.confirm(`Restore "${name}" back to active students?`);
    if (!confirmed) return;

    setRestoringId(deletedRecordId);
    setError('');
    try {
      await StudentAPI.RestoreStudent(deletedRecordId);
      onRestoreSuccess();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to restore student.');
    } finally {
      setRestoringId(null);
    }
  };

  const handlePermanentlyDelete = async (deletedRecordId: number, name: string) => {
    const confirmed = window.confirm(
      `⚠️ Permanently delete "${name}"? This action cannot be undone.`
    );
    if (!confirmed) return;

    setDeletingId(deletedRecordId);
    setError('');
    try {
      await StudentAPI.PermanentlyDeleteStudent(deletedRecordId);
      onRestoreSuccess(); // Refresh the list
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to permanently delete student.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>
      )}

      {students.length === 0 ? (
        <p className="text-gray-500 text-sm">No deleted students found.</p>
      ) : (
        <table className="w-full table-fixed border-collapse">

          {/* ── Dark header — matches Students List table header exactly ── */}
          <thead>
            <tr className="bg-black text-white">
              <th className="py-3 px-4 text-left text-sm font-semibold w-16">Sr. No</th>
              <th className="py-3 px-4 text-left text-sm font-semibold">Student Name</th>
              <th className="py-3 px-4 text-left text-sm font-semibold">Class</th>
              <th className="py-3 px-4 text-left text-sm font-semibold">Reason</th>
              <th className="py-3 px-4 text-left text-sm font-semibold">Deleted By</th>
              <th className="py-3 px-4 text-left text-sm font-semibold">Deletion Date</th>
              <th className="py-3 px-4 text-left text-sm font-semibold w-24">Actions</th>
            </tr>
          </thead>

          {/* ── Rows — matches Students List row style exactly ── */}
          <tbody>
            {students.map((student, index) => (
              <tr key={student.student_id} className="border-b border-gray-200">
                <td className="py-4 px-4 text-sm text-gray-700">{index + 1}</td>
                <td className="py-4 px-4 text-sm text-gray-700">{student.student_name}</td>
                <td className="py-4 px-4 text-sm text-gray-700">{student.class_name}</td>
                <td className="py-4 px-4 text-sm text-gray-700">{student.reason}</td>
                <td className="py-4 px-4 text-sm text-gray-700">
                  {student.deleted_by_name || `User #${student.deleted_by}`}
                </td>
                <td className="py-4 px-4 text-sm text-gray-700">
                  {new Date(student.deleted_at).toLocaleDateString()}
                </td>
                <td className="py-4 px-4 text-sm">
                  <div className="flex gap-2 items-center">
                    <button
                      onClick={() => handleRestore(student.student_id, student.student_name)}
                      disabled={restoringId === student.student_id || deletingId === student.student_id}
                      className="text-green-600 text-sm hover:underline disabled:opacity-50"
                    >
                      {restoringId === student.student_id ? 'Restoring...' : 'Restore'}
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => handlePermanentlyDelete(student.student_id, student.student_name)}
                        disabled={deletingId === student.student_id || restoringId === student.student_id}
                        title="Permanently delete this student record"
                        className="text-red-600 hover:text-red-800 disabled:opacity-50 transition-colors"
                      >
                        {deletingId === student.student_id ? (
                          <span className="text-xs">Deleting...</span>
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>

        </table>
      )}
    </div>
  );
}
