import { StudentModel, CreateStudent} from "@/models/students/Student";
import AxiosInstance from "@/api/axiosInterceptorInstance";

// Define the StudentResponse type
interface StudentResponse {
  id: number;
  name: string;
  // Add other student properties as needed
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace StudentAPI {
  export const Get = async (page = 1, pageSize = 10) => {
    try {
      const response = await AxiosInstance.get<unknown>(
        "/students/all_students/",
        { params: { page, page_size: pageSize } }
      );
      return response;
    } catch (error) {
      throw error;
    }
  };

  export const Create = async (AddStudent: CreateStudent) => {
    try {
      const response = await AxiosInstance.post<CreateStudent>(
        "/students/add/",
        JSON.stringify(AddStudent),
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
  };

  export async function Update(student_id: number, data: Partial<StudentModel>) {
    try {
      const response = await AxiosInstance.patch(
        `/students/${student_id}`,
        JSON.stringify(data),
        {
          headers: { "Content-Type": "application/json" },
        }
      );
      return response;
    } catch (error) {
      throw error;
    }
  }

  export async function Delete(student_id: number, payload?: { reason: string; deleted_by: number }) {
    try {
      const response = await AxiosInstance.delete(
        `/students/${student_id}`,
        payload ? { data: payload } : undefined
      );
      return response;
    } catch (error) {
      throw error;
    }
  }

  export async function GetDeletedStudents() {
    try {
      const response = await AxiosInstance.get('/deleted-students/');
      const payload = response.data;
      return payload?.data ?? (Array.isArray(payload) ? payload : []);
    } catch (error) {
      throw error;
    }
  }

  export async function RestoreStudent(deletedRecordId: number) {
    try {
      const response = await AxiosInstance.post(
        `/deleted-students/${deletedRecordId}/restore`
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  export async function PermanentlyDeleteStudent(deletedRecordId: number) {
    try {
      const response = await AxiosInstance.delete(
        `/deleted-students/${deletedRecordId}/permanent`
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  export async function GetStudentbyFilter(class_id: number) {
    try {
      const response = await AxiosInstance.get(
        `/students/by_class_id/?class_id=${class_id}`
      );
      return response;
    } catch (error) {
      throw error;
    }
  }

  export async function GetByClassId(classId: number): Promise<unknown> {
    try {
      const response = await AxiosInstance.get(
        `/students/by_class_id/?class_id=${classId}`
      );
      return response;
    } catch (error) {
      throw error;
    }
  }
}

