import axiosInstance from "@/api/axiosInterceptorInstance";

// ============================================================================
// USER MANAGEMENT INTERFACES
// ============================================================================

export interface UserResponse {
  id: number;
  username: string;
  email: string;
  role: string;
}

export interface UserCreate {
  username: string;
  email: string;
  password: string;
  role: string;
}

export interface UserUpdate {
  username?: string;
  email?: string;
  password?: string;
  role?: string;
}

export namespace UserAPI {
  // ============================================================================
  // USER MANAGEMENT API METHODS
  // ============================================================================

  // Get all users (Admin only)
  export const getAllUsers = async (): Promise<UserResponse[]> => {
    try {
      const response = await axiosInstance.get<UserResponse[]>("/admin/users/");
      return response.data;
    } catch (error) {
      console.error("Error fetching users:", error);
      throw error;
    }
  };

  // Create new user (Admin only)
  export const createUser = async (userData: UserCreate): Promise<UserResponse> => {
    try {
      const response = await axiosInstance.post<UserResponse>("/admin/users/", userData);
      return response.data;
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  };

  // Update user (Admin only)
  export const updateUser = async (userId: number, userData: UserUpdate): Promise<UserResponse> => {
    try {
      const response = await axiosInstance.put<UserResponse>(`/admin/users/${userId}`, userData);
      return response.data;
    } catch (error) {
      console.error(`Error updating user ${userId}:`, error);
      throw error;
    }
  };

  // Update user role (Admin only)
  export const updateUserRole = async (username: string, role: string): Promise<UserResponse> => {
    try {
      const response = await axiosInstance.patch<UserResponse>(`/admin/users/${username}/role`, { role });
      return response.data;
    } catch (error) {
      console.error(`Error updating user role for ${username}:`, error);
      throw error;
    }
  };

  // Delete user (Admin only)
  export const deleteUser = async (userId: number): Promise<void> => {
    try {
      await axiosInstance.delete(`/admin/users/${userId}`);
    } catch (error) {
      console.error(`Error deleting user ${userId}:`, error);
      throw error;
    }
  };
}