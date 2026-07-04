import AxiosInstance from "@/api/axiosInterceptorInstance";

export namespace ViewMarksAPI {
  export const Get = async (params: Record<string, string | number>) => {
    return AxiosInstance.get("/exam_marks/view/", { params });
  };
}
