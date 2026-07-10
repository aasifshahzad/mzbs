"use client";

import { useState } from "react";
import { studentPortalChangePassword } from "@/api/StudentPortal/studentPortalAPI";
import { Eye, EyeOff } from "lucide-react";

export default function StudentPortalChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const response = await studentPortalChangePassword({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      setMessage(response.message || "Password updated successfully");
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Unable to update password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4">
      <div className="mx-auto max-w-md rounded-xl bg-white p-6 shadow-lg">
        <h1 className="mb-2 text-xl font-semibold">Change Portal Password</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              className="w-full rounded border p-2 pr-10"
              type={showCurrent ? "text" : "password"}
              placeholder="Current Password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
            <button type="button" onClick={() => setShowCurrent((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500" aria-label={showCurrent ? "Hide current password" : "Show current password"}>
              {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <div className="relative">
            <input
              className="w-full rounded border p-2 pr-10"
              type={showNew ? "text" : "password"}
              placeholder="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <button type="button" onClick={() => setShowNew((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500" aria-label={showNew ? "Hide new password" : "Show new password"}>
              {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <div className="relative">
            <input
              className="w-full rounded border p-2 pr-10"
              type={showConfirm ? "text" : "password"}
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <button type="button" onClick={() => setShowConfirm((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500" aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}>
              {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {message ? <p className="text-sm text-green-600">{message}</p> : null}
          <button className="w-full rounded bg-green-600 px-4 py-2 text-white" disabled={loading}>{loading ? "Updating..." : "Update Password"}</button>
        </form>
      </div>
    </div>
  );
}
