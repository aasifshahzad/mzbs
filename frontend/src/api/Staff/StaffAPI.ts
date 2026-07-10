import AxiosInstance from "@/api/axiosInterceptorInstance";

export namespace StaffAPI {
  export const getStaff = async (search?: string) => {
    const params = search ? { search } : {};
    return AxiosInstance.get("/staff/list", { params });
  };

  export const getAttendanceRows = async (attendanceDate?: string) => {
    const params = attendanceDate ? { attendance_date: attendanceDate } : {};
    return AxiosInstance.get("/staff/attendance", { params });
  };

  export const submitAttendance = async (attendanceDate: string, records: Array<{ staff_id: number; attendance_status: string }>) => {
    return AxiosInstance.post("/staff/attendance", {
      attendance_date: attendanceDate,
      records,
    });
  };

  export const getAttendanceHistory = async (staffId?: number, attendanceDate?: string) => {
    const params: Record<string, string | number> = {};
    if (staffId) params.staff_id = staffId;
    if (attendanceDate) params.attendance_date = attendanceDate;
    return AxiosInstance.get("/staff/attendance/history", { params });
  };

  export const updateAttendance = async (attendanceId: number, status: string) => {
    return AxiosInstance.put(`/staff/attendance/${attendanceId}`, { attendance_status: status });
  };

  export const deleteAttendance = async (attendanceId: number) => {
    return AxiosInstance.delete(`/staff/attendance/${attendanceId}`);
  };
}
