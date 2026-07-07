import AxiosInstance from '@/api/axiosInterceptorInstance';

export const StudentProfileAPI = {
  getProfile: async (studentId: number, className?: string) => {
    const response = await AxiosInstance.get('/student_profile/', {
      params: {
        student_id: studentId,
        class_name: className || undefined,
      },
    });
    return response.data;
  },
};
