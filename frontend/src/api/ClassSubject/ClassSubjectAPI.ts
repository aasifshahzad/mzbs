import AxiosInstance from "@/api/axiosInterceptorInstance";
import { ClassSubjectModel, ClassSubjectSetPayload } from "@/models/classSubject/classSubject";

export namespace ClassSubjectAPI {
  export const Get = async () => {
    try {
      const response = await AxiosInstance.get<ClassSubjectModel[]>("/class_subject/class-subjects-all/");
      return response;
    } catch (error) {
      throw error;
    }
  };

  export const Set = async (payload: ClassSubjectSetPayload) => {
    try {
      const response = await AxiosInstance.post<ClassSubjectSetPayload>("/class_subject/set/", payload);
      return response;
    } catch (error) {
      throw error;
    }
  };

  export const Create = async (payload: ClassSubjectModel) => {
    try {
      const response = await AxiosInstance.post<ClassSubjectModel>("/class_subject/add/", payload);
      return response;
    } catch (error) {
      throw error;
    }
  };

  export const Delete = async (classSubjectId: number) => {
    try {
      const response = await AxiosInstance.delete(`/class_subject/${classSubjectId}`);
      return response;
    } catch (error) {
      throw error;
    }
  };
}
