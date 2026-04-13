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
      // Build query parameters, only including non-zero/non-empty values
      const params = new URLSearchParams();
      
      if (FilteredAttendance.attendance_date) {
        params.append('attendance_date', FilteredAttendance.attendance_date);
      }
      if (FilteredAttendance.attendance_time_id && FilteredAttendance.attendance_time_id !== 0) {
        params.append('attendance_time_id', FilteredAttendance.attendance_time_id.toString());
      }
      if (FilteredAttendance.class_name_id && FilteredAttendance.class_name_id !== 0) {
        params.append('class_name_id', FilteredAttendance.class_name_id.toString());
      }
      if (FilteredAttendance.teacher_name_id && FilteredAttendance.teacher_name_id !== 0) {
        params.append('teacher_name_id', FilteredAttendance.teacher_name_id.toString());
      }
      if (FilteredAttendance.student_id && FilteredAttendance.student_id !== 0) {
        params.append('student_id', FilteredAttendance.student_id.toString());
      }
      if (FilteredAttendance.father_name) {
        params.append('father_name', FilteredAttendance.father_name);
      }
      if (FilteredAttendance.attendance_value_id && FilteredAttendance.attendance_value_id !== 0) {
        params.append('attendance_value_id', FilteredAttendance.attendance_value_id.toString());
      }

      const queryString = params.toString();
      const url = `/mark_attendance/filter_attendance_by_ids${queryString ? '?' + queryString : ''}`;
      
      const response = await AxiosInstance.get<FilteredAttendance>(url);
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