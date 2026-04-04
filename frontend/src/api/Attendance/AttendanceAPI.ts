import { MarkAttInput, MarkAttUpdate } from "@/models/markattendace/markattendance";
import AxiosInstance from "@/api/axiosInterceptorInstance";
import { GetActionDetail } from "@/models/EntityBase";

interface FilteredAttendance {
  attendance_date: string;
  attendance_time_id: number;
  class_name_id: number;
  teacher_name_id: number;
  student_id: number;
  father_name: string;
  attendance_value_id: number;
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace AttendanceAPI {
export const Create = async (Attendances: MarkAttInput) => {
    try {
      const response = await AxiosInstance.post<MarkAttInput>(
        "/mark_attendance/add_bulk_attendance/",
        JSON.stringify(Attendances),
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      console.log("API Response:", response);
      return response;
    } catch (error) {
      console.error("API Error:", error);
      throw error; 
    }
  }
  export const GetbyFilter = async (FilteredAttendance: FilteredAttendance) => {
    try {
      const response = await AxiosInstance.get<FilteredAttendance>(
        `/mark_attendance/filter_attendance_by_ids?attendance_date=${FilteredAttendance.attendance_date}&attendance_time_id=${FilteredAttendance.attendance_time_id}&class_name_id=${FilteredAttendance.class_name_id}&teacher_name_id=${FilteredAttendance.teacher_name_id}&student_id=${FilteredAttendance.student_id}&father_name=${FilteredAttendance.father_name}&attendance_value_id=${FilteredAttendance.attendance_value_id}`
      );
      return response;
    }
    catch (error) {
      console.error("API Error:", error);
      throw error;
    }
  }
  export const Update = async (attendance_id: number, Attendances: MarkAttUpdate) => {
    try {
      const payload: MarkAttUpdate = {
        ...Attendances,
        ...GetActionDetail(Attendances, "update"),
      };
      if (!payload) throw new Error("Failed to update attendance");
      
      const response = await AxiosInstance.patch<MarkAttUpdate>(
        `/mark_attendance/update_attendance/${attendance_id}`,
        JSON.stringify(payload),
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      console.log("API Response:", response);
      return response;
    } catch (error) {
      console.error("API Error:", error);
      throw error; 
    }
  }
  export async function Delete(attendance_id: number) {
    try {
      const response = await AxiosInstance.delete(
        `mark_attendance/delete_attendance/${attendance_id}`,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      return response;
    } catch (error) {
      throw error;
    }
  }
}