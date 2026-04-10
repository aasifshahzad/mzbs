"use client";

import React from "react";
import { Header } from "@/components/dashboard/Header";
import { motion } from "framer-motion";
import Link from "next/link";
import { BookOpen, Users, Eye } from "lucide-react";
import { ResponsiveH3 } from "@/components/responsive/ResponsiveTypography";

export function TeacherDashboard() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Header value="Teacher Dashboard" />
      <main className="container mx-auto px-2 sm:px-4 py-4 sm:py-6 md:px-6 lg:px-8">
        <div className="grid grid-cols-1 place-items-center">
          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-6 sm:p-8 md:p-10 rounded-lg sm:rounded-xl shadow-md hover:shadow-lg transition-shadow w-full max-w-2xl"
          >
            <ResponsiveH3 className="mb-6 sm:mb-8 text-center">Quick Actions</ResponsiveH3>
            <div className="space-y-5 sm:space-y-6">
              {/* Mark Attendance Button */}
              <Link href="/dashboard/attendance/mark_attendance">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 sm:py-3.5 px-4 sm:px-6 rounded-lg transition text-sm sm:text-base font-medium flex items-center justify-center gap-2"
                >
                  <BookOpen size={20} />
                  Mark Attendance
                </motion.button>
              </Link>

              {/* View Students Button */}
              <Link href="/dashboard/students">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full bg-green-500 hover:bg-green-600 text-white py-3 sm:py-3.5 px-4 sm:px-6 rounded-lg transition text-sm sm:text-base font-medium flex items-center justify-center gap-2"
                >
                  <Users size={20} />
                  View Students
                </motion.button>
              </Link>

              {/* View Attendance Button */}
              <Link href="/dashboard/attendance/view_attendance">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full bg-purple-500 hover:bg-purple-600 text-white py-3 sm:py-3.5 px-4 sm:px-6 rounded-lg transition text-sm sm:text-base font-medium flex items-center justify-center gap-2"
                >
                  <Eye size={20} />
                  View Attendance
                </motion.button>
              </Link>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
