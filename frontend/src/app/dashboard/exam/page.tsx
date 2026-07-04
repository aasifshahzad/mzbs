import React from "react";

export default function ExamPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-neutral-900">
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium uppercase tracking-wide text-primary">
            Exam Management
          </p>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            Exam
          </h1>
          <p className="max-w-2xl text-sm text-gray-600 dark:text-gray-400">
            This page is now available for administrators, principals, chief principals, and teachers from the dashboard sidebar.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-neutral-900">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Upcoming Exams
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Track scheduled exams and academic milestones from one place.
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-neutral-900">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Results Overview
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Review exam performance and share summaries with the relevant staff.
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-neutral-900">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Attendance & Reports
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Keep attendance, reporting, and exam records aligned with the dashboard.
          </p>
        </div>
      </div>
    </div>
  );
}
