"use client";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "../Select";
import { useForm } from "react-hook-form";
import { ClassNameAPI as API2 } from "@/api/Classname/ClassNameAPI";
import { FeeAPI as API3 } from "@/api/Fees/AddFeeAPI"
import { GetFeeModel} from "@/models/Fees/Fee";
import { toast } from "sonner";
import { usePrint } from "@/components/print/usePrint";
import { useRole } from "@/context/RoleContext";
import { Printer } from "lucide-react";
import EditFees from "./EditFees";
import DelConfirmMsg from "../DelConfMsg";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Header } from "../dashboard/Header";

const extractArrayData = <T,>(response: unknown): T[] => {
  const payload = (response as { data?: unknown }).data;

  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (payload && typeof payload === "object") {
    const nested = (payload as { data?: unknown }).data;
    if (Array.isArray(nested)) {
      return nested as T[];
    }
  }

  return [];
};

interface ClassNameResponse {
  class_name_id: number;
  class_name: string;
}

interface FeeData {
  fee_id: number;
  student_name: string;
  father_name: string;
  class_name: string;
  fee_amount: number;
  fee_month: string;
  fee_year: number;
  fee_status: string;
  is_deleted?: boolean;
}

const ViewFees: React.FC = () => {
  const {
    register,
    handleSubmit,
    setValue: setFormValue,
    formState: { errors },
  } = useForm<GetFeeModel>();
  const { printRecords } = usePrint();
  const { role } = useRole();
  const [classNameList, setClassNameList] = useState<
    { id: number; title: string }[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [feesData, setFeesData] = useState<FeeData[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize] = useState(10);
  const [activeFilters, setActiveFilters] = useState<GetFeeModel | null>(null);

  useEffect(() => {
    GetClassName();
  }, []);

  const GetClassName = async () => {                          
    setIsLoading(true);
    try {
      const response = await API2.Get();
      const classes = extractArrayData<ClassNameResponse>(response);
      const allClasses = [{ class_name_id: 0, class_name: "All" }, ...classes];
      setClassNameList(
        allClasses.map((item) => ({
          id: item.class_name_id,
          title: item.class_name,
        }))
      );
    } catch (error) {
      console.error("Error fetching class names:", error);
    } finally {
      setIsLoading(false);
    }
  };

const handleGetFees = async (data: GetFeeModel, page = 1) => {
  try {
    if (!data.fee_year) {
      toast.error("Please select a year");
      return;
    }

    setIsLoading(true);
    setCurrentPage(page);
    setActiveFilters(data);

    const response = await API3.Filter({
      class_id: data.class_id && Number(data.class_id) !== 0
        ? Number(data.class_id)
        : undefined,
      fee_month: data.fee_month && data.fee_month !== "all"
        ? data.fee_month
        : undefined,
      fee_year: data.fee_year,
      fee_status: data.fee_status && data.fee_status !== "all"
        ? data.fee_status
        : undefined,
      page,
      page_size: pageSize,
    });

    const payload = response?.data;
    const records = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];
    const total = payload?.total ?? records.length;
    const totalPagesFromPayload = payload?.total_pages ?? Math.max(1, Math.ceil(total / pageSize));

    if (records.length === 0) {
      toast.error("No data found");
      setFeesData([]);
      setTotalPages(1);
    } else {
      setFeesData(records as FeeData[]);
      setTotalPages(totalPagesFromPayload);
      toast.success("Fees data fetched successfully");
    }
  } catch (error) {
    console.error("Error fetching fees:", error);
    toast.error("Failed to fetch fees");
  } finally {
    setIsLoading(false);
  }
};

const handlePageChange = (page: number) => {
  if (activeFilters) {
    handleGetFees(activeFilters, page);
  }
};

const handleFeeUpdate = async () => {
  // Re-fetch the fees with current filters
  setFeesData([]);
  toast.success("Fee record updated successfully");
};

const handleDeleteFee = async (feeId: number) => {
  try {
    await API3.Delete(feeId);
    toast.success("Fee record deleted successfully", {
      position: "bottom-center",
      duration: 3000,
    });
    // Remove the deleted fee from the list
    setFeesData(feesData.filter(fee => fee.fee_id !== feeId));
  } catch (error) {
    console.error("Error deleting fee:", error);
    toast.error("Failed to delete fee record");
  }
};

// Filter fees based on search query
const filteredFeesData = feesData.filter((fee) => {
  const searchLower = searchQuery.toLowerCase();
  return (
    fee.student_name.toLowerCase().includes(searchLower) ||
    fee.father_name.toLowerCase().includes(searchLower) ||
    fee.class_name.toLowerCase().includes(searchLower) ||
    fee.fee_month.toLowerCase().includes(searchLower) ||
    fee.fee_status.toLowerCase().includes(searchLower)
  );
});

  return (
    <div className="container mx-auto px-2 sm:px-4">
      <Header value="View Fees" />
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mt-3">
        <form
          onSubmit={handleSubmit((data) => handleGetFees(data, 1))}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 lg:items-end gap-3 sm:gap-4 p-3 sm:p-4"
        >
          <div className="col-span-1">
            <label className="text-sm text-gray-700 dark:text-gray-300 font-bold">
              Class Name
            </label>
            <Select
              label=""
              options={classNameList}
              {...register("class_id")}
              className="w-full"
            />
          </div>
          <div className="col-span-1">
            <label className="text-sm text-gray-700 dark:text-gray-300 font-bold">
              Fee Month
            </label>
            <Select
              label=""
              options={[
                { id: "all", title: "All" },
                { id: "January", title: "January" },
                { id: "February", title: "February" },
                { id: "March", title: "March" },
                { id: "April", title: "April" },
                { id: "May", title: "May" },
                { id: "June", title: "June" },
                { id: "July", title: "July" },
                { id: "August", title: "August" },
                { id: "September", title: "September" },
                { id: "October", title: "October" },
                { id: "November", title: "November" },
                { id: "December", title: "December" },
              ]}
              {...register("fee_month")}
              className="w-full"
            />
          </div>
          <div className="col-span-1">
            <label className="text-sm text-gray-700 dark:text-gray-300 font-bold">
              Fee Year
            </label>
            <Select
              label=""
              options={[
                { id: "2023", title: "2023" },
                { id: "2024", title: "2024" },
                { id: "2025", title: "2025" },
                { id: "2026", title: "2026" },
              ]}
              {...register("fee_year")}
              className="w-full"
            />
          </div>
          <div className="col-span-1">
            <label className="text-sm text-gray-700 dark:text-gray-300 font-bold">
              Fee Status
            </label>
            <Select
              label=""
              options={[
                { id: "all", title: "All" },
                { id: "Paid", title: "Paid" },
                { id: "Unpaid", title: "Unpaid" },
              ]}
              {...register("fee_status")}
              className="w-full"
            />
          </div>
          <Button className="w-full lg:col-span-1" type="submit">
            Get
          </Button>
        </form>

        {feesData.length > 0 && (
          <div className="p-2 sm:p-4">
            <div className="flex justify-between items-center mb-4 no-print">
              <h3 className="text-lg font-semibold">Fees Data</h3>
              <button
                onClick={() => {
                  const meta = `Total records: ${feesData.length} · Printed: ${new Date().toLocaleDateString()}`;
                  printRecords('fees-print-area', 'Fees Report', meta);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
              >
                <Printer size={16} />
                Print
              </button>
            </div>

            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 no-print">
              <p className="text-sm text-gray-500">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1 || isLoading}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages || isLoading}
                >
                  Next
                </Button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="mb-4 no-print">
              <Input
                type="text"
                placeholder="Search by student name, father name, class, month, or status..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {filteredFeesData.length !== feesData.length && (
                <p className="text-sm text-gray-500 mt-2">
                  Showing {filteredFeesData.length} of {feesData.length} records
                </p>
              )}
            </div>

            <div id="fees-print-area" className="overflow-x-auto">
              <Table className="w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-1/8">Student Name</TableHead>
                    <TableHead className="w-1/8">Father Name</TableHead>
                    <TableHead className="w-1/8">Class</TableHead>
                    <TableHead className="w-1/8">Amount</TableHead>
                    <TableHead className="w-1/8">Month</TableHead>
                    <TableHead className="w-1/8">Year</TableHead>
                    <TableHead className="w-1/8">Status</TableHead>
                    <TableHead className="w-1/8 no-print">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFeesData.length > 0 ? (
                    filteredFeesData.map((fee) => (
                      <TableRow 
                        key={fee.fee_id} 
                        className={fee.is_deleted ? "bg-gray-100 dark:bg-gray-800 opacity-60" : ""}
                      >
                        <TableCell className={fee.is_deleted ? "text-gray-500 dark:text-gray-400" : ""}>
                          {fee.student_name}
                        </TableCell>
                        <TableCell className={fee.is_deleted ? "text-gray-500 dark:text-gray-400" : ""}>
                          {fee.father_name}
                        </TableCell>
                        <TableCell className={fee.is_deleted ? "text-gray-500 dark:text-gray-400" : ""}>
                          {fee.class_name}
                        </TableCell>
                        <TableCell className={fee.is_deleted ? "text-gray-500 dark:text-gray-400" : ""}>
                          {fee.fee_amount}
                        </TableCell>
                        <TableCell className={fee.is_deleted ? "text-gray-500 dark:text-gray-400" : ""}>
                          {fee.fee_month}
                        </TableCell>
                        <TableCell className={fee.is_deleted ? "text-gray-500 dark:text-gray-400" : ""}>
                          {fee.fee_year}
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            fee.fee_status === "Paid" 
                              ? "bg-green-100 text-green-800" 
                              : "bg-red-100 text-red-800"
                          }`}>
                            {fee.fee_status}
                          </span>
                        </TableCell>
                        <TableCell className="no-print">
                          <div className="flex items-center gap-2 justify-center">
                            <EditFees
                              feeId={fee.fee_id}
                              studentName={fee.student_name}
                              fatherName={fee.father_name}
                              className={fee.class_name}
                              feeStatus={fee.fee_status}
                              feeAmount={fee.fee_amount}
                              feeMonth={fee.fee_month}
                              feeYear={fee.fee_year}
                              onUpdate={handleFeeUpdate}
                            />
                            {role === "ADMIN" && fee.fee_id && (
                              <DelConfirmMsg
                                rowId={fee.fee_id}
                                OnDelete={(confirmed) => {
                                  if (confirmed) {
                                    handleDeleteFee(fee.fee_id);
                                  }
                                }}
                                title="Delete Fee Record?"
                                text={`Are you sure you want to delete the fee record for ${fee.student_name}? This action cannot be undone.`}
                              />
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-gray-500 py-4">
                        No records found matching your search.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewFees;
