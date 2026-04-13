"use client";
import React from "react";
import { useRole } from "@/context/RoleContext";
import { TeacherDashboard } from "@/components/dashboard/TeacherDashboard";
import { AccountantDashboard } from "@/components/dashboard/AccountantDashboard";
import { StudentDashboard } from "@/components/dashboard/StudentDashboard";
import { PrincipalDashboard } from "@/components/dashboard/PrincipalDashboard";
import { AdminDashboard } from "@/components/dashboard/AdminDashboard";

export default function DashboardRouter() {
  const { role, isLoading } = useRole();
  
  // Show loading state while role is being determined
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  // Route to appropriate dashboard based on role
  switch (role) {
    case "ADMIN":
      return <AdminDashboard />;
    case "PRINCIPAL":
      return <PrincipalDashboard />;
    case "TEACHER":
      return <TeacherDashboard />;
    case "ACCOUNTANT":
    case "FEE_MANAGER":
      return <AccountantDashboard />;
    case "USER":
      return <StudentDashboard />;
    default:
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-xl text-gray-600">Unknown role. Please log in again.</p>
          </div>
        </div>
      );
  }
}
