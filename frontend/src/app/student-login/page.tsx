"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { studentPortalLogin } from "@/api/StudentPortal/studentPortalAPI";

export default function StudentLoginPage() {
  const [studentName, setStudentName] = useState("");
  const [fatherContact, setFatherContact] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await studentPortalLogin({
        student_name: studentName,
        father_contact: fatherContact,
        password,
      });
      localStorage.setItem("studentPortalToken", response.access_token);
      localStorage.setItem("studentPortalUser", JSON.stringify(response.student));
      router.push("/student-portal/dashboard");
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
        <h1 className="mb-2 text-2xl font-semibold">Student / Parent Login</h1>
        <p className="mb-4 text-sm text-slate-600">Use the student name, father contact, and portal password.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            className="w-full rounded border p-2"
            placeholder="Student Name"
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
          />
          <input
            className="w-full rounded border p-2"
            placeholder="Father Contact"
            value={fatherContact}
            onChange={(e) => setFatherContact(e.target.value)}
          />
          <div className="relative">
            <input
              className="w-full rounded border p-2 pr-10"
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button className="w-full rounded bg-blue-600 px-4 py-2 text-white" disabled={loading}>
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
