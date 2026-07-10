// Role-based access control mapping
export type UserRole =
  | "ADMIN"
  | "CHIEF_PRINCIPAL"
  | "PRINCIPAL"
  | "TEACHER"
  | "STAFF"
  | "ACCOUNTANT"
  | "FEE_MANAGER"
  | "STUDENT";

export type Section =
  | "dashboard"
  | "attendance"
  | "students"
  | "teachers"
  | "classes"
  | "fees"
  | "expenses"
  | "income"
  | "attendance_time"
  | "salary"
  | "setup"
  | "exam"
  | "staff";

// Role to accessible sections mapping
const ROLE_PERMISSIONS: Record<UserRole, Section[]> = {
  ADMIN: [
    "dashboard",
    "attendance",
    "students",
    "teachers",
    "classes",
    "fees",
    "expenses",
    "income",
    "attendance_time",
    "salary",
    "setup",
    "exam",
    "staff",
  ],
  CHIEF_PRINCIPAL: [
    "dashboard",
    "attendance",
    "students",
    "teachers",
    "classes",
    "exam",
    "staff",
  ],
  PRINCIPAL: [
    "dashboard",
    "attendance",
    "students",
    "teachers",
    "classes",
    "exam",
  ],
  TEACHER: ["attendance", "students", "dashboard", "exam"],
  STAFF: ["attendance", "students", "dashboard"],
  ACCOUNTANT: ["expenses", "fees", "income", "dashboard", "salary"],
  FEE_MANAGER: ["fees", "dashboard", "students"],
  STUDENT: ["dashboard"], // Students can access own attendance & fees through filtered endpoints
};

/**
 * Check if a user with a given role can access a section
 */
export function canAccessSection(role: string | null, section: string): boolean {
  if (!role) return false;
  if (!isValidRole(role)) return false;

  const sections = ROLE_PERMISSIONS[role as UserRole];
  return sections.includes(section as Section);
}

/**
 * Get all accessible sections for a role
 */
export function getAccessibleSections(role: string | null): Section[] {
  if (!role || !isValidRole(role)) return [];
  return ROLE_PERMISSIONS[role as UserRole];
}

/**
 * Check if a user can access a given route path
 */
export function canAccessRoute(role: string | null, pathname: string): boolean {
  if (!role) return false;

  // Extract section from pathname
  // Paths like /dashboard/students -> students
  // /dashboard/attendance/time -> attendance, etc.
  const parts = pathname.split("/").filter(Boolean);

  if (parts[0] !== "dashboard") {
    // Routes outside dashboard (login, unauthorized) are generally accessible
    return true;
  }

  if (parts.length === 1) {
    // Just /dashboard
    return canAccessSection(role, "dashboard");
  }

  // Normalize singular → plural to match Section type
  const sectionMap: Record<string, string> = { expense: "expenses" };
  const raw = parts[1];
  const section = sectionMap[raw] ?? raw;
  return canAccessSection(role, section);
}

/**
 * Validate if a string is a valid role
 */
export function isValidRole(role: string): boolean {
  return ["ADMIN", "CHIEF_PRINCIPAL", "PRINCIPAL", "TEACHER", "STAFF", "ACCOUNTANT", "FEE_MANAGER", "STUDENT"].includes(
    role
  );
}

/**
 * Get display name for a role
 */
export function getRoleDisplayName(role: string | null): string {
  if (!role) return "Unknown";
  
  const displayNames: Record<UserRole, string> = {
    ADMIN: "Administrator",
    CHIEF_PRINCIPAL: "Chief Principal",
    PRINCIPAL: "Principal",
    TEACHER: "Teacher",
    STAFF: "Staff",
    ACCOUNTANT: "Accountant",
    FEE_MANAGER: "Fee Manager",
    STUDENT: "Student",
  };

  return displayNames[role as UserRole] || role;
}

/**
 * Check if a submenu item should be visible for a given role
 * Handles read-only restrictions (e.g., PRINCIPAL and ACCOUNTANT can view fees but not add)
 */
export function canAccessSubmenuItem(role: string | null, submenuPath: string): boolean {
  if (!role) return false;

  const isPrincipalLikeRole = role === "PRINCIPAL" || role === "CHIEF_PRINCIPAL";

  // PRINCIPAL and CHIEF_PRINCIPAL can view fees but not add
  if (isPrincipalLikeRole && submenuPath.includes("/fees/add_fees")) {
    return false;
  }

  // Deleted Students: only ADMIN and principal-level roles can access
  if (submenuPath.includes("/students/deleted")) {
    return role === "ADMIN" || isPrincipalLikeRole;
  }

  // Manage User: only ADMIN can access
  if (submenuPath.includes("/setup/manage_user")) {
    return role === "ADMIN";
  }

  // TEACHER/STAFF: can only access Mark Attendance, View Attendance, and the exam submenu items
  if (role === "TEACHER" || role === "STAFF") {
    return (
      submenuPath.includes("/attendance/mark_attendance") ||
      submenuPath.includes("/attendance/view_attendance") ||
      submenuPath.includes("/exam") ||
      (submenuPath.includes("/students") && !submenuPath.includes("/deleted"))
    );
  }

  // All other cases follow the section-based access control
  return true;
}
