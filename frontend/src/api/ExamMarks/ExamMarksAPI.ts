import AxiosInstance from "@/api/axiosInterceptorInstance";
import { ExamMarksSubmitPayload } from "@/models/examMarks/examMarks";

export namespace ExamMarksAPI {
  export const Submit = async (payload: ExamMarksSubmitPayload) => {
    return AxiosInstance.post("/exam_marks/submit/", payload);
  };

  export const Get = async (params?: Record<string, string | number | undefined>) => {
    return AxiosInstance.get("/exam_marks/all/", { params });
  };

  export const GetByFilters = async (params?: Record<string, string | number | undefined>) => {
    return AxiosInstance.get("/exam_marks/by_filters/", { params });
  };

  export const Update = async (examMarkId: number, payload: Partial<ExamMarksSubmitPayload>) => {
    return AxiosInstance.patch(`/exam_marks/${examMarkId}`, payload);
  };

  export const Delete = async (examMarkId: number) => {
    return AxiosInstance.delete(`/exam_marks/${examMarkId}`);
  };
}
