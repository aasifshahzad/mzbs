"use client";

import * as React from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getFilteredRowModel,
} from "@tanstack/react-table";
import { Search, ChevronLeft, ChevronRight, LoaderIcon } from "lucide-react";
import { AttendanceTimeAPI as API } from "@/api/AttendaceTime/attendanceTimeAPI";
export { format } from "date-fns";
import type { ClassTiming } from "@/models/classTiming/classTiming";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import AddClassTime from "./CreateTIming";
import DelConfirmMsg from "../DelConfMsg";
import { toast } from "sonner";

export default function ClassTiming() {
  const [globalFilter, setGlobalFilter] = useState("");
  const [data, setData] = useState<ClassTiming[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch data from API
  useEffect(() => {
    GetData();
  }, []);

  const GetData = async () => {
    setLoading(true);
    try {
      const response = await API.Get();
      const responseData = (response as { data?: ClassTiming[] })?.data;
      setData(Array.isArray(responseData) ? responseData : []);
    } catch (error) {
      console.error("Error fetching data:", error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const formDeleteHandler = async (confirmed: boolean, deleteData: ClassTiming) => {
    if (!confirmed) return;
    try {
      await API.Delete(deleteData.attendance_time_id);
      toast.success("Timing deleted successfully", {
        position: "bottom-center",
      });
      GetData();
    } catch (error: unknown) {
      const axiosError = error as { response?: { status: number; data?: { detail?: string } } };
      if (axiosError.response?.status === 409) {
        toast.error(
          "Please delete related attendance records first before deleting this timing.",
          { position: "bottom-center" }
        );
      } else {
        toast.error(
          axiosError.response?.data?.detail || "Failed to delete timing.",
          { position: "bottom-center" }
        );
      }
    }
  };

  // Define columns
  const columns: ColumnDef<ClassTiming>[] = [
    {
      id: "sr_no",
      header: "Sr. No",
      cell: ({ row }) => (
        <div className="font-medium">{row.index + 1}</div>
      ),
    },
    {
      accessorKey: "attendance_time",
      header: "Class Name",
    },
    {
      accessorKey: "created_at",
      header: "Created Date",
      cell: ({ row }) => {
        const date = new Date(row.getValue("created_at"));
        const formattedDate = date.toLocaleDateString("en-GB"); // Use 'en-GB' for dd/MM/yyyy
        return <div>{formattedDate}</div>;
      }
    },
    {
      id: "delete",
      header: "Delete",
      cell: ({ row }) => (
        <DelConfirmMsg
          rowId={row.original.attendance_time_id}
          OnDelete={(confirmed) => formDeleteHandler(confirmed, row.original)}
        />
      ),
    },
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
  });

  return (
    <div className="mt-4 sm:mt-7 ml-1 sm:ml-3 p-3 sm:p-6 w-full sm:w-[98%] bg-white dark:bg-transparent dark:border-gray-100 dark:border rounded-lg shadow-lg">
      <AddClassTime onClassAdded={GetData}/>
      <div className="flex flex-col gap-4 mb-6">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 sm:h-5 sm:w-5" />
          <Input
            placeholder="Search Class..."
            value={globalFilter ?? ""}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGlobalFilter(e.target.value)}
            className="pl-10 pr-4 py-2 w-full rounded-lg border-purple-300 focus:border-purple-500 focus:ring focus:ring-purple-200 transition-all duration-300"
          />
        </div>
      </div>

      {/* Desktop Table View - hidden on mobile */}
      <div className="hidden sm:block rounded-md border border-purple-200 overflow-hidden transition-shadow duration-300 hover:shadow-md">
        <Table>
          <TableHeader className="bg-primary dark:bg-secondary sticky top-0 z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="font-bold text-white dark:text-gray-100 px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-6">
                  <div className="flex justify-center">
                    <LoaderIcon className="animate-spin w-6 h-6" />
                  </div>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row, i) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className={`transition-colors duration-200 hover:bg-purple-50 ${
                    i % 2 === 0
                      ? "bg-white dark:bg-transparent"
                      : "bg-purple-50 dark:bg-black"
                  }`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-gray-500"
                >
                  No results found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View - visible only on small screens */}
      <div className="sm:hidden space-y-3">
        {loading ? (
          <div className="flex justify-center py-8">
            <LoaderIcon className="animate-spin w-6 h-6" />
          </div>
        ) : table.getRowModel().rows?.length ? (
          table.getRowModel().rows.map((row) => (
            <div
              key={row.id}
              className="bg-white dark:bg-slate-900 border border-purple-200 dark:border-slate-700 rounded-lg p-3 space-y-2"
            >
              <div>
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Time Slot</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {row.original.attendance_time}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Created Date</p>
                <p className="text-sm text-gray-900 dark:text-white">
                  {new Date(row.original.created_at).toLocaleDateString("en-GB")}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">No results found.</div>
        )}
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-4">
        <div className="text-xs sm:text-sm text-gray-500">
          Showing{" "}
          {table.getState().pagination.pageIndex *
            table.getState().pagination.pageSize +
            1}{" "}
          to{" "}
          {Math.min(
            (table.getState().pagination.pageIndex + 1) *
              table.getState().pagination.pageSize,
            table.getFilteredRowModel().rows.length
          )}{" "}
          of {table.getFilteredRowModel().rows.length} time slots
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="px-3 py-2 rounded-full"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="px-3 py-2 rounded-full"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
