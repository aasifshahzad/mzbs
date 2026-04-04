"use client";
import React, { useState } from "react";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { LoaderIcon } from "lucide-react";
import { AttendanceAPI as API } from "@/api/Attendance/AttendanceAPI";
import { FaRegEdit } from "react-icons/fa";
import { MarkAttUpdate } from "@/models/markattendace/markattendance";

interface EditAttendanceProps {
  attendanceId: number;
  onUpdate: () => void; // Add callback for refresh
}

interface APIResponse {
  status: number;
  data: {
    message?: string;
  };
}

const EditAttendance = ({ attendanceId, onUpdate }: EditAttendanceProps) => {
  const { handleSubmit, reset } = useForm<MarkAttUpdate>();
  
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);



  const handleFormSubmit = async (data: {
    attendance_date?: string;
    attendance_time_id?: number;
    class_name_id?: number;
    teacher_name_id?: number;
    student_id?: number;
    attendance_value_id?: number;
  }) => {
    setLoading(true);
    console.log(data);
    try {
      const attendanceValue = document.querySelector(
        'input[name="attendanceStatus"]:checked'
      ) as HTMLInputElement;

      const updateData: MarkAttUpdate = {
        attendance_id: attendanceId,
        attendance_value_id: getAttendanceValueId(attendanceValue.value),
        updated_at: new Date(),
      };

      if (!updateData.attendance_id) {
        throw new Error("attendance_id is required for update");
      }

      const response = (await API.Update(
        updateData.attendance_id,
        updateData
      )) as APIResponse;

      if (response.status === 200) {
        setOpen(false);
        reset();
        toast.success("Attendance Updated Successfully!", {
          position: "bottom-center",
          duration: 3000,
        });
        onUpdate(); // Call refresh callback
      } else {
        throw new Error(response.data.message || "Failed to update attendance");
      }
    } catch (error: unknown) {
      console.error("Error updating attendance:", error);
      toast.error((error as Error).message || "Failed to update attendance", {
        position: "bottom-center",
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const getAttendanceValueId = (value: string): number => {
    switch (value) {
      case "present":
        return 1;
      case "absent":
        return 2;
      case "late":
        return 3;
      case "leave":
        return 4;
      default:
        return 1;
    }
  };

  return (
    <>
      <FaRegEdit
        onClick={() => setOpen(true)}
        className="w-4 h-4 cursor-pointer hover:text-blue-500"
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl text-center font-semibold">
              Edit Attendance
            </DialogTitle>
            <hr className="border-t border-gray-300" />
          </DialogHeader>

          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
            <div className="flex justify-center items-center space-x-4 mt-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="attendanceStatus"
                  className="form-radio h-4 w-4 text-blue-600"
                  value="present"
                />
                <span className="ml-2">Present</span>
              </label>

              <label className="flex items-center">
                <input
                  type="radio"
                  name="attendanceStatus"
                  className="form-radio h-4 w-4 text-red-600"
                  value="absent"
                />
                <span className="ml-2">Absent</span>
              </label>

              <label className="flex items-center">
                <input
                  type="radio"
                  name="attendanceStatus"
                  className="form-radio h-4 w-4 text-yellow-600"
                  value="late"
                />
                <span className="ml-2">Late</span>
              </label>

              <label className="flex items-center">
                <input
                  type="radio"
                  name="attendanceStatus"
                  className="form-radio h-4 w-4 text-orange-600"
                  value="leave"
                />
                <span className="ml-2">Leave</span>
              </label>
            </div>

            <div className="flex justify-end gap-4 mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? <LoaderIcon className="animate-spin" /> : "Save"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EditAttendance;
