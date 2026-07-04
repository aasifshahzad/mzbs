import React from "react";
import Link from "next/link";
import { BookOpenCheck } from "lucide-react";

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
            Use the exam workspace to enter marks for students and manage academic records from one place.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Link
          href="/dashboard/exam/enter_marks"
          className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-gray-800 dark:bg-neutral-900"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <BookOpenCheck className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Enter Marks
            </h2>
          </div>
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
            Select a class, teacher, subject, and exam type to enter student marks.
          </p>
        </Link>

        <Link
          href="/dashboard/exam/view_marks"
          className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-gray-800 dark:bg-neutral-900"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <BookOpenCheck className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              View Marks
            </h2>
          </div>
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
            Review class-wise results by subject and exam type across the dates that were recorded.
          </p>
        </Link>
      </div>
    </div>
  );
}
