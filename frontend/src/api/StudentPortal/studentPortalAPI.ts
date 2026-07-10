import axiosInstance from '@/api/axiosInterceptorInstance';

export interface StudentPortalLoginPayload {
  student_name: string;
  father_contact: string;
  password: string;
}

export interface StudentPortalChangePasswordPayload {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export async function studentPortalLogin(payload: StudentPortalLoginPayload) {
  const response = await axiosInstance.post('/student-portal/login', payload);
  return response.data;
}

export async function studentPortalChangePassword(payload: StudentPortalChangePasswordPayload) {
  const response = await axiosInstance.post('/student-portal/change-password', payload);
  return response.data;
}

export async function getStudentPortalProfile() {
  const response = await axiosInstance.get('/student-portal/profile');
  return response.data;
}

export async function getStudentPortalMe() {
  const response = await axiosInstance.get('/student-portal/me');
  return response.data;
}

export async function adminResetStudentPassword(student_id: number, new_password: string) {
  const response = await axiosInstance.post('/student-portal/admin/reset-password', { student_id, new_password });
  return response.data;
}
