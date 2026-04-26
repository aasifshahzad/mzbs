"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Header } from "@/components/dashboard/Header";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { UserAPI, UserResponse, UserCreate, UserUpdate } from "@/api/User/UserAPI";
import { useRole } from "@/context/RoleContext";
import { UserPlus, Edit2, Trash2, RefreshCw } from "lucide-react";

interface ManageUserForm {
  username: string;
  email: string;
  password: string;
  role: string;
}

const ManageUser = () => {
  const { role } = useRole();
  const isAdmin = role === "ADMIN";

  const [users, setUsers] = useState<UserResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingUsers, setIsFetchingUsers] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserResponse | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    register: registerCreate,
    handleSubmit: handleSubmitCreate,
    reset: resetCreate,
    formState: { errors: errorsCreate },
  } = useForm<ManageUserForm>();

  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    reset: resetEdit,
    setValue: setValueEdit,
    formState: { errors: errorsEdit },
  } = useForm<ManageUserForm>();

  const fetchUsers = async () => {
    try {
      setIsFetchingUsers(true);
      const usersData = await UserAPI.getAllUsers();
      setUsers(usersData);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users");
    } finally {
      setIsFetchingUsers(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const onCreateSubmit = async (data: ManageUserForm) => {
    setIsLoading(true);
    try {
      const userData: UserCreate = {
        username: data.username,
        email: data.email,
        password: data.password,
        role: data.role,
      };

      await UserAPI.createUser(userData);
      toast.success("User created successfully!");
      setShowCreateModal(false);
      resetCreate();
      await fetchUsers();
    } catch (error: any) {
      console.error("Error creating user:", error);
      toast.error(error?.response?.data?.detail || "Failed to create user");
    } finally {
      setIsLoading(false);
    }
  };

  const onEditSubmit = async (data: ManageUserForm) => {
    if (!editingUser) return;

    setIsLoading(true);
    try {
      const userData: UserUpdate = {
        username: data.username,
        email: data.email,
        password: data.password || undefined, // Only update if provided
        role: data.role,
      };

      await UserAPI.updateUser(editingUser.id, userData);
      toast.success("User updated successfully!");
      setShowEditModal(false);
      setEditingUser(null);
      resetEdit();
      await fetchUsers();
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast.error(error?.response?.data?.detail || "Failed to update user");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (user: UserResponse) => {
    setEditingUser(user);
    setValueEdit("username", user.username);
    setValueEdit("email", user.email);
    setValueEdit("password", ""); // Don't show current password
    setValueEdit("role", user.role);
    setShowEditModal(true);
  };

  const handleDelete = async (userId: number, username: string) => {
    if (window.confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone.`)) {
      try {
        setIsDeleting(true);
        await UserAPI.deleteUser(userId);
        toast.success("User deleted successfully!");
        await fetchUsers();
      } catch (error: any) {
        console.error("Error deleting user:", error);
        toast.error(error?.response?.data?.detail || "Failed to delete user");
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleRoleChange = async (userId: number, username: string, newRole: string) => {
    try {
      await UserAPI.updateUserRole(username, newRole);
      toast.success("User role updated successfully!");
      await fetchUsers();
    } catch (error: any) {
      console.error("Error updating user role:", error);
      toast.error(error?.response?.data?.detail || "Failed to update user role");
    }
  };

  if (!isAdmin) {
    return (
      <div className="w-full">
        <Header value="Manage User" />
        <div className="p-4 sm:p-6">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4">
            <p className="text-red-600 dark:text-red-400">
              Access denied. Only administrators can manage users.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <Header value="Manage User" />

      <div className="p-4 sm:p-6 space-y-6">
        {/* Create User Button */}
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            User Management
          </h3>
          <div className="flex gap-2">
            <button
              onClick={fetchUsers}
              disabled={isFetchingUsers}
              className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 rounded transition disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`w-5 h-5 ${isFetchingUsers ? "animate-spin" : ""}`} />
            </button>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              Create User
            </Button>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-md p-4 sm:p-6 overflow-x-auto">
          {isFetchingUsers ? (
            <div className="text-center py-8 text-gray-600 dark:text-gray-400">
              Loading users...
            </div>
          ) : users.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-2 font-semibold text-gray-700 dark:text-gray-200">
                    Serial No.
                  </th>
                  <th className="text-left py-3 px-2 font-semibold text-gray-700 dark:text-gray-200">
                    Username
                  </th>
                  <th className="text-left py-3 px-2 font-semibold text-gray-700 dark:text-gray-200">
                    Password
                  </th>
                  <th className="text-left py-3 px-2 font-semibold text-gray-700 dark:text-gray-200">
                    Role
                  </th>
                  <th className="text-left py-3 px-2 font-semibold text-gray-700 dark:text-gray-200">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, index) => (
                  <tr
                    key={user.id}
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-neutral-800"
                  >
                    <td className="py-3 px-2 text-gray-900 dark:text-gray-100">
                      {index + 1}
                    </td>
                    <td className="py-3 px-2 text-gray-900 dark:text-gray-100">
                      {user.username}
                    </td>
                    <td className="py-3 px-2 text-gray-600 dark:text-gray-400">
                      ********
                    </td>
                    <td className="py-3 px-2">
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, user.username, e.target.value)}
                        className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-neutral-800 text-gray-900 dark:text-white"
                      >
                        <option value="USER">USER</option>
                        <option value="TEACHER">TEACHER</option>
                        <option value="ACCOUNTANT">ACCOUNTANT</option>
                        <option value="FEE_MANAGER">FEE_MANAGER</option>
                        <option value="PRINCIPAL">PRINCIPAL</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                    </td>
                    <td className="py-3 px-2 flex gap-2">
                      <button
                        onClick={() => handleEdit(user)}
                        className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 rounded transition"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(user.id, user.username)}
                        disabled={isDeleting}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded transition disabled:opacity-50"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-8 text-gray-600 dark:text-gray-400">
              No users found.
            </div>
          )}
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-neutral-900 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              Create New User
            </h3>
            <form onSubmit={handleSubmitCreate(onCreateSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">
                  Username
                </label>
                <Input
                  {...registerCreate("username", {
                    required: "Username is required",
                    minLength: { value: 3, message: "Username must be at least 3 characters" },
                  })}
                  placeholder="Enter username"
                />
                {errorsCreate.username && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {errorsCreate.username.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">
                  Email
                </label>
                <Input
                  type="email"
                  {...registerCreate("email", {
                    required: "Email is required",
                    pattern: {
                      value: /^\S+@\S+$/i,
                      message: "Invalid email address",
                    },
                  })}
                  placeholder="Enter email"
                />
                {errorsCreate.email && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {errorsCreate.email.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">
                  Password
                </label>
                <Input
                  type="password"
                  {...registerCreate("password", {
                    required: "Password is required",
                    minLength: { value: 6, message: "Password must be at least 6 characters" },
                  })}
                  placeholder="Enter password"
                />
                {errorsCreate.password && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {errorsCreate.password.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">
                  Role
                </label>
                <select
                  {...registerCreate("role", { required: "Role is required" })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-neutral-800 text-gray-900 dark:text-white"
                >
                  <option value="">Select role</option>
                  <option value="USER">USER</option>
                  <option value="TEACHER">TEACHER</option>
                  <option value="ACCOUNTANT">ACCOUNTANT</option>
                  <option value="FEE_MANAGER">FEE_MANAGER</option>
                  <option value="PRINCIPAL">PRINCIPAL</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
                {errorsCreate.role && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {errorsCreate.role.message}
                  </p>
                )}
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetCreate();
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading} className="flex-1">
                  {isLoading ? "Creating..." : "Create User"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-neutral-900 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              Edit User: {editingUser.username}
            </h3>
            <form onSubmit={handleSubmitEdit(onEditSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">
                  Username
                </label>
                <Input
                  {...registerEdit("username", {
                    required: "Username is required",
                    minLength: { value: 3, message: "Username must be at least 3 characters" },
                  })}
                  placeholder="Enter username"
                />
                {errorsEdit.username && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {errorsEdit.username.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">
                  Email
                </label>
                <Input
                  type="email"
                  {...registerEdit("email", {
                    required: "Email is required",
                    pattern: {
                      value: /^\S+@\S+$/i,
                      message: "Invalid email address",
                    },
                  })}
                  placeholder="Enter email"
                />
                {errorsEdit.email && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {errorsEdit.email.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">
                  New Password (leave empty to keep current)
                </label>
                <Input
                  type="password"
                  {...registerEdit("password", {
                    minLength: { value: 6, message: "Password must be at least 6 characters" },
                  })}
                  placeholder="Enter new password"
                />
                {errorsEdit.password && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {errorsEdit.password.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">
                  Role
                </label>
                <select
                  {...registerEdit("role", { required: "Role is required" })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-neutral-800 text-gray-900 dark:text-white"
                >
                  <option value="">Select role</option>
                  <option value="USER">USER</option>
                  <option value="TEACHER">TEACHER</option>
                  <option value="ACCOUNTANT">ACCOUNTANT</option>
                  <option value="FEE_MANAGER">FEE_MANAGER</option>
                  <option value="PRINCIPAL">PRINCIPAL</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
                {errorsEdit.role && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {errorsEdit.role.message}
                  </p>
                )}
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingUser(null);
                    resetEdit();
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading} className="flex-1">
                  {isLoading ? "Updating..." : "Update User"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageUser;