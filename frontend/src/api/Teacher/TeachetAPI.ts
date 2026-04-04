// import axiosIntance from "@/api/axiosInterceptorInstance";
import AxiosInstance from "@/api/axiosInterceptorInstance";
import {GetActionDetail} from "@/utils/GetActionDetail";
import { TeacherModel } from "@/models/teacher/Teacher";

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace TeacherNameAPI {
  export const Get = async () => {
    try {
      const response = await AxiosInstance.get<TeacherModel>(
        "/teacher_name/teacher-names-all/"
      );
      return response;
    } catch (error) {
      console.error("API Error:", error);
      throw error;
    }
  };

  export const Create = async (ClassName: TeacherModel) => {
    try {
      const payload: TeacherModel = {
        ...ClassName,
        ...GetActionDetail(ClassName, "create"),
      };
      const response = await AxiosInstance.post<TeacherModel>(
        "/teacher_name/add_teacher_name/",
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
  };
  export async function Delete(teacher_id: number) {
    try {
      const response = await AxiosInstance.delete(
        `/teacher_name/${teacher_id}`
      );
      return response;
    } catch (error) {
      console.error("API Error:", error);
      throw error;
    }
  }
}
