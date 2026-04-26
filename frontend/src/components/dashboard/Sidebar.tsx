"use client";

import React, { useEffect, useState } from "react";
import { GoDotFill } from "react-icons/go";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  GraduationCap,
  Hand,
  LayoutDashboard,
  Moon,
  Sun,
  UserCog2,
  LogOut,
  ChevronDown,
  Banknote,
} from "lucide-react";
import { RiCashLine } from "react-icons/ri";
import { BsCashCoin } from "react-icons/bs";
import { GiExpense } from "react-icons/gi";
import { useRole } from "@/context/RoleContext";
import { canAccessSection, canAccessSubmenuItem } from "@/utils/rolePermissions";
import axiosInstance from "@/api/axiosInterceptorInstance";

type MenuItem = {
  id: number;
  name: string;
  icon: React.ElementType;
  path: string;
  hasSubmenu?: boolean;
  submenu?: {
    id: number;
    name: string;
    path: string;
    icon: React.ElementType;
  }[];
};

type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
};

const menuList: MenuItem[] = [
  { id: 1, name: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  {
    id: 2,
    name: "Student",
    icon: GraduationCap,
    path: "/dashboard/students",
    hasSubmenu: true,
    submenu: [
      {
        id: 21,
        name: "All Students",
        icon: GoDotFill,
        path: "/dashboard/students",
      },
      {
        id: 22,
        name: "Deleted Students",
        icon: GoDotFill,
        path: "/dashboard/students/deleted",
      },
    ],
  },
  {
    id: 3,
    name: "Attendance",
    icon: Hand,
    path: "/dashboard/attendance",
    hasSubmenu: true,
    submenu: [
      {
        id: 8,
        name: "Mark Attendance",
        icon: GoDotFill,
        path: "/dashboard/attendance/mark_attendance",
      },
      {
        id: 9,
        name: "View Attendance",
        icon: GoDotFill,
        path: "/dashboard/attendance/view_attendance",
      },
      {
        id: 31,
        name: "Attendance Summary",
        icon: GoDotFill,
        path: "/dashboard/attendance/attendance_status_summary",
      },
    ],
  },
  {
    id: 10,
    name: "Fees",
    icon: RiCashLine,
    path: "/dashboard/fees",
    hasSubmenu: true,
    submenu: [
      {
        id: 11,
        name: "Add Fees",
        icon: GoDotFill,
        path: "/dashboard/fees/add_fees",
      },
      {
        id: 12,
        name: "View Fees",
        icon: GoDotFill,
        path: "/dashboard/fees/view_fees",
      },
    ],
  },
  {
    id: 32,
    name: "Salary",
    icon: Banknote,
    path: "/dashboard/salary",
    hasSubmenu: true,
    submenu: [
      {
        id: 33,
        name: "Set Salary",
        icon: GoDotFill,
        path: "/dashboard/salary/set",
      },
      {
        id: 34,
        name: "Manage Salary",
        icon: GoDotFill,
        path: "/dashboard/salary/manage",
      },
      {
        id: 35,
        name: "Salary Logs",
        icon: GoDotFill,
        path: "/dashboard/salary/logs",
      },
      {
        id: 32.1,
        name: "View Salary",
        icon: GoDotFill,
        path: "/dashboard/salary/index",
      },
    ],
  },
  {
    id: 13,
    name: "Income",
    icon: BsCashCoin,
    path: "/dashboard/income",
    hasSubmenu: true,
    submenu: [
      {
        id: 14,
        name: "Add Income",
        icon: GoDotFill,
        path: "/dashboard/income/add_income",
      },
      {
        id: 15,
        name: "View Income",
        icon: GoDotFill,
        path: "/dashboard/income/view_income",
      },
    ],
  },
  {
    id: 17,
    name: "Expense",
    icon: GiExpense,
    path: "/dashboard/Expense",
    hasSubmenu: true,
    submenu: [
      {
        id: 18,
        name: "Add Expense",
        icon: GoDotFill,
        path: "/dashboard/expense/add_expense",
      },
      {
        id: 19,
        name: "View Expense",
        icon: GoDotFill,
        path: "/dashboard/expense/view_expense",
      },
    ],
  },
  {
    id: 4,
    name: "Setup",
    icon: UserCog2,
    path: "/dashboard/settings",
    hasSubmenu: true,
    submenu: [
      {
        id: 5,
        name: "Class Name",
        icon: GoDotFill,
        path: "/dashboard/setup/class_name",
      },
      {
        id: 6,
        name: "Class Timings",
        icon: GoDotFill,
        path: "/dashboard/setup/class_timings",
      },
      {
        id: 7,
        name: "Teacher",
        icon: GoDotFill,
        path: "/dashboard/setup/teacher",
      },
      {
        id: 16,
        name: "Income Category",
        icon: GoDotFill,
        path: "/dashboard/setup/income_category",
      },
      {
        id: 17,
        name: "Expense Category",
        icon: GoDotFill,
        path: "/dashboard/setup/expense_category",
      },
      {
        id: 21,
        name: "Manage User",
        icon: GoDotFill,
        path: "/dashboard/setup/manage_user",
      },
    ],
  },
  { id: 5, name: "Logout", icon: LogOut, path: "/login" },
];

// Map menu item paths to role access sections
const getMenuItemSection = (path: string): string => {
  const lowerPath = path.toLowerCase();
  if (lowerPath.includes("/students")) return "students";
  if (lowerPath.includes("/attendance")) return "attendance";
  if (lowerPath.includes("/fees")) return "fees";
  if (lowerPath.includes("/salary")) return "salary";
  if (lowerPath.includes("/income")) return "income";
  if (lowerPath.includes("/expense")) return "expenses";
  if (lowerPath.includes("/setup") || lowerPath.includes("/settings")) return "setup";
  if (lowerPath.includes("/dashboard")) return "dashboard";
  return "dashboard";
};

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { role, isLoading, clearRole } = useRole();
  const [openSubmenu, setOpenSubmenu] = useState<number | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [userData, setUserData] = useState<string | null>(null);
  
  useEffect(() => {
    // This runs only in the browser
    const storedUser = localStorage.getItem("user");
    setUserData(storedUser);
  }, []);

  // Filter menu items based on user role
  const visibleMenuItems = menuList.filter((item) => {
    // Logout is always visible
    if (item.name === "Logout") return true;

    // Check if role can access this section
    const section = getMenuItemSection(item.path);
    return canAccessSection(role, section);
  });

  const toggleSubmenu = (id: number) =>
    setOpenSubmenu(openSubmenu === id ? null : id);

  const handleLogout = async () => {
    try {
      await axiosInstance.post("/auth/logout");  // clears HTTPOnly cookies server-side
    } catch {
      // proceed with local cleanup even if the call fails
    } finally {
      clearRole();            // clears sessionStorage + localStorage via context
      localStorage.clear();   // belt-and-suspenders
      sessionStorage.clear();
      router.replace("/login");
    }
  };

  // Helper function to safely check if pathname starts with a path
  const isActivePath = (path: string): boolean => {
    if (!pathname) return false;
    return pathname.startsWith(path);
  };

  // Helper function to check if pathname exactly matches a path
  const isExactPath = (path: string): boolean => {
    if (!pathname) return false;
    return pathname === path;
  };

  return (
    <>
      {/* Mobile Overlay */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-70 z-40 md:hidden transition-opacity ${
          isOpen ? "opacity-100 visible" : "opacity-0 invisible -z-10"
        }`}
        onClick={onClose}
      />

      {/* Sidebar */}
      <aside
        className={`fixed z-50 top-0 left-0 h-screen w-64 bg-white dark:bg-neutral-950 border-r border-gray-200 dark:border-gray-700 p-4 flex flex-col transform transition-transform duration-300 shadow-lg
          ${
            isOpen ? "translate-x-0" : "-translate-x-full"
          } md:translate-x-0 md:static md:z-auto`}
      >
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-4">
          <Image
            src="/logo.png"
            alt="Logo"
            width={50}
            height={50}
            className="dark:invert"
            unoptimized
          />
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            MADRESSA ZAID BIN SABIT (R.A)
          </h2>
        </div>

        <div className="flex items-center space-x-4 my-4">
          <Image
            src="/image.png"
            alt="User"
            width={40}
            height={40}
            className="rounded-full"
          />
          <div>
            <h2 className="text-sm font-semibold text-gray-700 uppercase dark:text-gray-200">
                {userData ? JSON.parse(userData).username : "Guest"}
            </h2>
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
              {role || "Loading..."}
            </p>
          </div>
        </div>

        <nav className="flex-1">
          {visibleMenuItems.map((item) => (
            <div key={item.id}>
              {item.hasSubmenu ? (
                <button
                  onClick={() => toggleSubmenu(item.id)}
                  className={`w-full flex items-center justify-between p-2 rounded-lg mb-1 transition ${
                    isActivePath(item.path)
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-gray-100 dark:hover:bg-neutral-800"
                  }`}
                >
                  <div className="flex items-center">
                    <item.icon className="w-5 h-5 mr-3" />
                    <span>{item.name}</span>
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 transition-transform ${
                      openSubmenu === item.id ? "rotate-180" : "rotate-0"
                    }`}
                  />
                </button>
              ) : item.name === "Logout" ? (
                <button
                  onClick={handleLogout}
                  className="flex items-center p-2 w-full rounded-lg mb-1 hover:bg-gray-100 dark:hover:bg-neutral-800"
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  <span>{item.name}</span>
                </button>
              ) : (
                <Link
                  href={item.path}
                  className={`flex items-center p-2 rounded-lg mb-1 transition ${
                    isExactPath(item.path)
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-gray-100 dark:hover:bg-neutral-800"
                  }`}
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  <span>{item.name}</span>
                </Link>
              )}
              {item.hasSubmenu && openSubmenu === item.id && (
                <div className="ml-6 mt-1 space-y-1">
                  {item.submenu
                    ?.filter((subItem) => {
                      // Filter submenu items by role and specific restrictions
                      const section = getMenuItemSection(subItem.path);
                      return canAccessSection(role, section) && canAccessSubmenuItem(role, subItem.path);
                    })
                    .map((subItem) => (
                      <Link
                        key={subItem.id}
                      href={subItem.path}
                      className="flex p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800"
                    >
                      <subItem.icon className="w-4 h-4 mt-0.5 mr-2" />
                      {subItem.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        <button
          onClick={() => {
            setIsDarkMode(!isDarkMode);
            document.documentElement.classList.toggle("dark");
          }}
          className="mt-auto p-2 rounded-lg bg-gray-50 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
        >
          {isDarkMode ? (
            <Sun className="w-5 h-5" />
          ) : (
            <Moon className="w-5 h-5" />
          )}
        </button>
      </aside>
    </>
  );
};

export default Sidebar;
