import axiosIntance from "@/api/axiosInterceptorInstance";

interface LoginData {
  username: string;
  password: string;
}

interface UserResponse {
  username: string;
  email: string;
  role: "ADMIN" | "PRINCIPAL" | "TEACHER" | "ACCOUNTANT" | "FEE_MANAGER" | "USER";
  id: number;
}

interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: UserResponse;
}
  export async function LoginAPI(loginData: LoginData) {
    try {
      const response = await axiosIntance.post<LoginResponse>(
        "/login",
        loginData,
        {
          headers: {
            "Content-Type": "application/json",
          },
          withCredentials: true,
          timeout: 10000,
        }
      );

      return response.data;
    } catch (error) {
      console.error("Error during login API call:", error);
      throw error;
    }
  }
