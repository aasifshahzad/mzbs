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
import { TeacherNameAPI as API } from "@/api/Teacher/TeachetAPI";
export { format } from "date-fns";

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
import { TeacherModel } from "@/models/teacher/Teacher";
import { useEffect, useState } from "react";
import AddNewTeacher from "./CreateTeacher";
import DelConfirmMsg from "../DelConfMsg";
import { toast } from "sonner";

export default function TeacherTable() {
  const [globalFilter, setGlobalFilter] = useState("");
  const [data, setData] = useState<TeacherModel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    GetData();
  }, []);

  const GetData = async () => {
    setLoading(true);
    try {
      const response = await API.Get();
      setData(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (confirmed: boolean, row: TeacherModel) => {
    if (!confirmed) return;
    try {
      await API.Delete(row.teacher_name_id);
      toast.success("Teacher deleted successfully", { position: "bottom-center" });
      GetData(); // refresh table
    } catch (error: unknown) {
      const axiosError = error as { response?: { status: number; data?: { detail?: string } } };
      if (axiosError.response?.status === 409) {
        toast.error(
          "Please delete related attendance records first before deleting this teacher.",
          { position: "bottom-center" }
        );
      } else {
        toast.error(
          axiosError.response?.data?.detail || "Failed to delete teacher.",
          { position: "bottom-center" }
        );
      }
    }
  };

  const columns: ColumnDef<TeacherModel>[] = [
    {
      id: "sr_no",
      header: "Sr. No",
      cell: ({ row }) => (
        <div className="font-medium">{row.index + 1}</div>
      ),
    },
    {
      accessorKey: "teacher_name",
      header: "Teacher Name",
    },
    {
      accessorKey: "created_at",
      header: "Created Date",
      cell: ({ row }) => {
        const date = new Date(row.getValue("created_at"));
        return <div>{date.toLocaleDateString("en-GB")}</div>;
      },
    },
    {
      id: "delete",
      header: "Delete",
      cell: ({ row }) => (
        <DelConfirmMsg
          rowId={row.original.teacher_name_id}
          OnDelete={(confirmed) => handleDelete(confirmed, row.original)}
        />
      ),
    },
  ];

  const table = useReactTable<TeacherModel>({
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
    <div className="ml-3 mt-7 p-6 w-[98%] bg-white dark:bg-transparent dark:border-gray-100 dark:border rounded-lg shadow-lg">
      <AddNewTeacher onClassAdded={GetData} />
      <div className="flex items-center justify-between mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search Class..."
            value={globalFilter ?? ""}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setGlobalFilter(e.target.value)
            }
            className="pl-10 pr-4 py-2 w-64 rounded-full border-purple-300 focus:border-purple-500 focus:ring focus:ring-purple-200 focus:ring-opacity-50 transition-all duration-300"
          />
        </div>
      </div>

      {/* Table rendering */}
      <div className="rounded-md border border-purple-200 overflow-hidden transition-shadow duration-300 hover:shadow-md">
        <Table>
          <TableHeader className="bg-primary dark:bg-secondary">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="font-bold text-white dark:text-gray-100"
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
                <TableCell colSpan={columns.length} className="text-center">
                  <div className="flex justify-center">
                    <LoaderIcon className="animate-spin w-10 h-10" />
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
                    <TableCell key={cell.id} className="py-3">
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

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-gray-500">
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
          of {table.getFilteredRowModel().rows.length} students
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
