# Working Tree Detailed Diff Report

Generated: 2026-06-28

This report lists removed and inserted lines for each modified tracked file in the working tree.

## frontend/package-lock.json

- Removed lines: 0
- Inserted lines: 27

### Inserted

- `        "@tanstack/react-query": "^5.101.2",`
- `    "node_modules/@tanstack/query-core": {`
- `      "version": "5.101.2",`
- `      "resolved": "https://registry.npmjs.org/@tanstack/query-core/-/query-core-5.101.2.tgz",`
- `      "integrity": "sha512-hH5MLoJhF7KaIGd7q3xTXGXvslI+GYlM1Z/35aSHHWaCJWB7XvTSHYuV3eM7tw+aE0mT/xMro4M4Q9rCGHT0lw==",`
- `      "license": "MIT",`
- `      "funding": {`
- `        "type": "github",`
- `        "url": "https://github.com/sponsors/tannerlinsley"`
- `      }`
- `    },`
- `    "node_modules/@tanstack/react-query": {`
- `      "version": "5.101.2",`
- `      "resolved": "https://registry.npmjs.org/@tanstack/react-query/-/react-query-5.101.2.tgz",`
- `      "integrity": "sha512-seDkr6kzGzX1okaaTtZPtgA688CDPlXUz1C6xSg0ESqn04Vuc8tlrYms1s3de+znBqhPVxFRfpAfUf+6XvfPWg==",`
- `      "license": "MIT",`
- `      "dependencies": {`
- `        "@tanstack/query-core": "5.101.2"`
- `      },`
- `      "funding": {`
- `        "type": "github",`
- `        "url": "https://github.com/sponsors/tannerlinsley"`
- `      },`
- `      "peerDependencies": {`
- `        "react": "^18 || ^19"`
- `      }`
- `    },`

## frontend/package.json

- Removed lines: 0
- Inserted lines: 1

### Inserted

- `    "@tanstack/react-query": "^5.101.2",`

## frontend/src/api/Attendance/AttendanceAPI.ts

- Removed lines: 20
- Inserted lines: 15

### Removed

- `export const Create = async (Attendances: MarkAttInput) => {`
- `      console.log("API Response:", response);`
- `      console.log("API Response Data:", response.data);`
- `      console.error("API Error:", error);`
- `      throw error; `
- `  }`
- `      // Build query parameters, only including non-zero/non-empty values`
- `      `
- `      `
- `    }`
- `    catch (error) {`
- `      console.error("API Error:", error);`
- `  }`
- `      `
- `      console.log("API Response:", response);`
- `      console.error("API Error:", error);`
- `      throw error; `
- `  }`
- `      `
- `      console.error("API Error:", error);`

### Inserted

- `  export const Create = async (Attendances: MarkAttInput) => {`
- `      throw error;`
- `  };`
- ``
- ``
- ``
- `    } catch (error) {`
- `  };`
- ``
- ``
- `      throw error;`
- `  };`
- ``
- ``
- ``

## frontend/src/api/Classname/ClassNameAPI.ts

- Removed lines: 2
- Inserted lines: 1

### Removed

- `      return error;`
- `      console.log("API Response:", response);`

### Inserted

- `      throw error;`

## frontend/src/api/Dashboard/dashboardAPI.ts

- Removed lines: 16
- Inserted lines: 14

### Removed

- `      console.log("API Response:", response);`
- `      return error;`
- `      console.log("Student Summary API Response:", response);`
- `      return error;`
- `      console.log("Attendance Summary API Response:", response);`
- `      console.error("Attendance Summary API Error:", error);`
- `      console.log("Income Expense Summary API Response:", response);`
- `      return error;`
- `      console.log("Fee Summary API Response:", response);`
- `      return error;`
- `      `
- `      console.log("Income Summary API Response:", response);`
- `      return error;`
- `      `
- `      console.log("Expense Summary API Response:", response);`
- `      return error;`

### Inserted

- `      throw error;`
- ``
- `      throw error;`
- ``
- ``
- `      throw error;`
- ``
- `      throw error;`
- ``
- ``
- `      throw error;`
- ``
- ``
- `      throw error;`

## frontend/src/api/Expense/ExpenseAPI.ts

- Removed lines: 6
- Inserted lines: 0

### Removed

- `      console.log("API Response:", response.data);`
- `      console.log("API Response:", response.data);`
- `      console.log("API Response:", response);`
- `      console.log("API Response:", response);`
- `      console.log("API Response:", response.data);`
- `      console.log("API Response:", response);`

## frontend/src/api/Fees/AddFeeAPI.tsx

- Removed lines: 14
- Inserted lines: 7

### Removed

- `// Export as a single API object`
- `      console.log("API Response:", response);`
- `      console.error("API Error:", error);`
- `      throw error; `
- `  // New API for class fee status`
- `      console.error("API Error:", error);`
- `  // New API for filtering with all 5 filter parameters`
- `      console.error("API Error:", error);`
- `  // Update fee record - only paid fees can be edited`
- `      console.log("Update Response:", response);`
- `      console.error("API Error:", error);`
- `  // Delete fee record`
- `      console.log("Delete Response:", response);`
- `      console.error("API Error:", error);`

### Inserted

- `      throw error;`
- `    page,`
- `    page_size,`
- `    page?: number;`
- `    page_size?: number;`
- `      if (page)       params.append("page",       String(page));`
- `      if (page_size)  params.append("page_size",  String(page_size));`

## frontend/src/api/Income/IncomeAPI.ts

- Removed lines: 23
- Inserted lines: 2

### Removed

- `// Helper function to get standard headers`
- `// const getHeaders = () => ({`
- `//   "Content-Type": "application/json",`
- `//   Authorization: \`Bearer ${localStorage.getItem("access_token")}\`,`
- `// });`
- ``
- `// Export as a single API object`
- `      console.log("API Response:", response.data)`
- `      console.error("API Error:", error);`
- `      console.log("API Response:", response.data)`
- `      console.error("API Error:", error);`
- `      console.log("API Response:", response);`
- `      console.error("API Error:", error);`
- `      throw error; `
- `      // console.log("API Response:", response.data);`
- `      console.error("API Error:", error);`
- `      console.log("API Response:", response);`
- `      console.error("API Error:", error);`
- `      throw error; `
- `      console.error("API Error:", error);`
- `      console.log("API Response:", response);`
- `      console.error("API Error:", error);`
- `      console.error("API Error:", error);`

### Inserted

- `      throw error;`
- `      throw error;`

## frontend/src/api/Salary/SalaryAPI.ts

- Removed lines: 32
- Inserted lines: 6

### Removed

- `      const response = await axiosInstance.get<TeacherSalaryResponse[]>("/salary/teacher-salary/all");`
- `      return response.data;`
- `      console.error("Error fetching teacher salaries:", error);`
- `      console.error("Error creating teacher salary:", error);`
- `      console.error(\`Error updating teacher salary ${salaryId}:\`, error);`
- `      console.error(\`Error fetching teacher salary summary for ${teacherId}:\`, error);`
- `      console.error(\`Error fetching teacher salary history for ${teacherId}:\`, error);`
- `      console.error(\`Error deleting teacher salary ${salaryId}:\`, error);`
- `      const response = await axiosInstance.get<SalaryLedgerResponse[]>("/salary/ledger/all");`
- `      return response.data;`
- `      console.error("Error fetching salary ledgers:", error);`
- `      console.error("Error creating salary ledger:", error);`
- `      console.error(\`Error ensuring salary ledger for ${teacherId}/${month}/${year}:\`, error);`
- `      console.error(\`Error deleting salary ledger ${ledgerId}:\`, error);`
- `      console.error(\`Error updating salary ledger ${ledgerId}:\`, error);`
- `      console.error("Error creating salary payment:", error);`
- `      console.error(\`Error fetching payments for ledger ${ledgerId}:\`, error);`
- `      console.error("Error fetching all salary payments:", error);`
- `      console.error("Error creating allowance:", error);`
- `      console.error(\`Error fetching allowances for teacher ${teacherId}:\`, error);`
- `      console.error("Error fetching all allowances:", error);`
- `      console.error("Error creating deduction:", error);`
- `      console.error(\`Error fetching deductions for teacher ${teacherId}:\`, error);`
- `      const response = await axiosInstance.get<DeductionResponse[]>("/salary/deduction/all");`
- `      return response.data;`
- `      console.error("Error fetching all deductions:", error);`
- `      console.error(\`Error deleting salary payment ${paymentId}:\`, error);`
- `      console.error(\`Error updating salary payment ${paymentId}:\`, error);`
- `      console.error(\`Error deleting allowance ${allowanceId}:\`, error);`
- `      console.error(\`Error updating allowance ${allowanceId}:\`, error);`
- `      console.error(\`Error deleting deduction ${deductionId}:\`, error);`
- `      console.error(\`Error updating deduction ${deductionId}:\`, error);`

### Inserted

- `      const response = await axiosInstance.get("/salary/teacher-salary/all");`
- `      return response.data?.data ?? response.data;`
- `      const response = await axiosInstance.get("/salary/ledger/all");`
- `      return response.data?.data ?? response.data;`
- `      const response = await axiosInstance.get("/salary/deduction/all");`
- `      return response.data?.data ?? response.data;`

## frontend/src/api/Student/StudentsAPI.tsx

- Removed lines: 14
- Inserted lines: 7

### Removed

- `      return error;`
- `        // ClassName = GetActionDetail(ClassName, "create");`
- `      console.log("API Response:", response);`
- `      console.error("API Error:", error);`
- `      throw error; `
- `      console.error("API Error:", error);`
- `      console.error("API Error:", error);`
- `      return response.data;`
- `      console.error('Error fetching deleted students:', error);`
- `      console.error('Error restoring student:', error);`
- `      console.error('Error permanently deleting student:', error);`
- `      return error;`
- `  export async function GetByClassId(classId: number): Promise<{ data: StudentResponse[] }> {`
- `      console.error("Error fetching students by class ID:", error);`

### Inserted

- `      throw error;`
- `      throw error;`
- `      const payload = response.data;`
- `      return payload?.data ?? (Array.isArray(payload) ? payload : []);`
- ``
- `      throw error;`
- `  export async function GetByClassId(classId: number): Promise<unknown> {`

## frontend/src/api/Teacher/TeachetAPI.ts

- Removed lines: 1
- Inserted lines: 0

### Removed

- `      console.log("API Response:", response);`

## frontend/src/api/axiosInterceptorInstance.ts

- Removed lines: 1
- Inserted lines: 1

### Removed

- `  timeout: 10000,`

### Inserted

- `  timeout: 30000, // increased from 10s → 30s to handle Neon cold starts`

## frontend/src/app/dashboard/expense/add_expense/page.tsx

- Removed lines: 4
- Inserted lines: 3

### Removed

- `import { AxiosResponse } from "axios";`
- `      const res: AxiosResponse<ExpenseCategory[]> = await API.GetExpenseCategory();`
- `      const data = res.data.map((item: ExpenseCategory) => ({`
- `      // console.log("Categories:", data);`

### Inserted

- `import { extractArrayData } from "@/utils/apiResponse";`
- `      const res = await API.GetExpenseCategory();`
- `      const data = extractArrayData<ExpenseCategory>(res).map((item) => ({`

## frontend/src/app/dashboard/income/add_income/page.tsx

- Removed lines: 4
- Inserted lines: 3

### Removed

- `import { AxiosResponse } from "axios";`
- `      const res: AxiosResponse<IncomeCategory[]> = await API.GetIncomeCategory();`
- `      const data = res.data.map((item: IncomeCategory) => ({`
- `      // console.log("Categories:", data);`

### Inserted

- `import { extractArrayData } from "@/utils/apiResponse";`
- `      const res = await API.GetIncomeCategory();`
- `      const data = extractArrayData<IncomeCategory>(res).map((item) => ({`

## frontend/src/app/layout.tsx

- Removed lines: 13
- Inserted lines: 14

### Removed

- `        <RoleProvider>`
- `          <ThemeProvider`
- `          attribute="class" `
- `          defaultTheme="light"`
- `          enableSystem`
- `          disableTransitionOnChange`
- `        >`
- `          <Toaster/>`
- `        <main>`
- `          {children}`
- `        </main>`
- `        </ThemeProvider>`
- `        </RoleProvider>`

### Inserted

- `import { QueryProvider } from "@/components/providers/QueryProvider";`
- `        <QueryProvider>`
- `          <RoleProvider>`
- `            <ThemeProvider`
- `              attribute="class"`
- `              defaultTheme="light"`
- `              enableSystem`
- `              disableTransitionOnChange`
- `            >`
- `              <Toaster />`
- `              <main>{children}</main>`
- `            </ThemeProvider>`
- `          </RoleProvider>`
- `        </QueryProvider>`

## frontend/src/components/Attendance/AttendanceStatusSummary.tsx

- Removed lines: 2
- Inserted lines: 6

### Removed

- `      const response = await ClassNameAPI.Get() as { data: ClassNamesData[] };`
- `      setClasses(response.data || []);`

### Inserted

- `      const response = await ClassNameAPI.Get();`
- `      const payload = (response as { data?: unknown }).data;`
- `      const classesData = Array.isArray(payload)`
- `        ? payload`
- `        : (payload as { data?: ClassNamesData[] } | undefined)?.data ?? [];`
- `      setClasses(Array.isArray(classesData) ? classesData : []);`

## frontend/src/components/Attendance/MarkAttendance.tsx

- Removed lines: 54
- Inserted lines: 56

### Removed

- `import { AxiosResponse } from "axios";`
- `      const response = (await API.Get()) as { data: ClassNameResponse[] };`
- `      if (response.data && Array.isArray(response.data)) {`
- `        setClassNameList(`
- `          response.data.map((item: ClassNameResponse) => ({`
- `            id: item.class_name_id,`
- `            title: item.class_name,`
- `          }))`
- `        );`
- `      }`
- `      const response = (await API1.Get()) as { data: AttendanceTimeResponse[] };`
- `      if (response.data && Array.isArray(response.data)) {`
- `        setClassTimeList(`
- `          response.data.map((item: AttendanceTimeResponse) => ({`
- `            id: item.attendance_time_id,`
- `            title: item.attendance_time,`
- `          }))`
- `        );`
- `      }`
- `      const response = (await API2.Get()) as unknown as {`
- `        data: TeacherResponse[];`
- `      };`
- `      if (response.data && Array.isArray(response.data)) {`
- `        setTeacherNameList(`
- `          response.data.map((item: TeacherResponse) => ({`
- `            id: item.teacher_name_id,`
- `            title: item.teacher_name,`
- `          }))`
- `        );`
- `      }`
- `      const response = (await AttendanceAPI.Create(`
- `        payload`
- `      )) as unknown as AxiosResponse<BulkAttendanceResponse>;`
- `      `
- `      console.log("Full response object:", response);`
- `      console.log("Response status:", response.status);`
- `      console.log("Response data:", response.data);`
- `      console.log("Response data type:", typeof response.data);`
- `      `
- `      if (response.status === 200 || response.status === 201) {`
- `        // Extract summary safely from response.data`
- `        const summary = response.data as BulkAttendanceResponse;`
- `        `
- `        console.log("Extracted summary:", summary);`
- `        `
- `      console.error("Error details:", {`
- `        message: error instanceof Error ? error.message : String(error),`
- `        stack: error instanceof Error ? error.stack : undefined,`
- `      });`
- `      const response = (await API3.GetStudentbyFilter(`
- `        formData.class_name_id`
- `      )) as { data: StudentResponse[] };`
- `      if (response.data && Array.isArray(response.data)) {`
- `          response.data.map((item: StudentResponse) => ({`

### Inserted

- `const extractArrayData = <T,>(response: unknown): T[] => {`
- `  const payload = (response as { data?: unknown }).data;`
- ``
- `  if (Array.isArray(payload)) {`
- `    return payload as T[];`
- `  }`
- ``
- `  if (payload && typeof payload === "object") {`
- `    const nestedPayload = (payload as { data?: unknown }).data;`
- `    if (Array.isArray(nestedPayload)) {`
- `      return nestedPayload as T[];`
- `    }`
- `  }`
- ``
- `  return [];`
- `};`
- ``
- `      const response = await API.Get();`
- `      const classNames = extractArrayData<ClassNameResponse>(response);`
- `      setClassNameList(`
- `        classNames.map((item) => ({`
- `          id: item.class_name_id,`
- `          title: item.class_name,`
- `        }))`
- `      );`
- `      const response = await API1.Get();`
- `      const classTimes = extractArrayData<AttendanceTimeResponse>(response);`
- `      setClassTimeList(`
- `        classTimes.map((item) => ({`
- `          id: item.attendance_time_id,`
- `          title: item.attendance_time,`
- `        }))`
- `      );`
- `      const response = await API2.Get();`
- `      const teachers = extractArrayData<TeacherResponse>(response);`
- `      setTeacherNameList(`
- `        teachers.map((item) => ({`
- `          id: item.teacher_name_id,`
- `          title: item.teacher_name,`
- `        }))`
- `      );`
- `      const response = await AttendanceAPI.Create(payload);`
- `      const status = (response as { status?: number }).status;`
- `      const data = (response as { data?: BulkAttendanceResponse }).data;`
- ``
- `      if (status === 200 || status === 201) {`
- `        const summary = data ?? {`
- `          saved: [],`
- `          skipped: [],`
- `          summary: { total: 0, saved: 0, skipped: 0 },`
- `        };`
- ``
- `      const response = await API3.GetStudentbyFilter(formData.class_name_id);`
- `      const students = extractArrayData<StudentResponse>(response);`
- `      if (students.length > 0) {`
- `          students.map((item) => ({`

## frontend/src/components/Attendance/ViewAttendance.tsx

- Removed lines: 45
- Inserted lines: 49

### Removed

- `          const records = response.data as unknown as AttendanceRecord[];`
- `          if (records && Array.isArray(records) && records.length > 0) {`
- `          console.error("API Error:", errorMessage);`
- `          console.error("Error:", error.message);`
- `          console.error("Unknown error:", error);`
- `      const response = (await API5.Get()) as { data: StudentResponse[] };`
- `      // Add "All" option at the beginning`
- `        ...response.data,`
- `      const response = (await API2.Get()) as { data: ClassNameResponse[] };`
- `      // FIX 3: create new array instead of mutating response.data`
- `        ...response.data,`
- `      if (allClasses && Array.isArray(allClasses)) {`
- `        setClassNameList(`
- `          allClasses.map((item: ClassNameResponse) => ({`
- `            id: item.class_name_id,`
- `            title: item.class_name,`
- `          }))`
- `        );`
- `      }`
- `      const response = (await API13.Get()) as {`
- `        data: AttendanceTimeResponse[];`
- `      };`
- `      // FIX 3: create new array instead of mutating response.data`
- `        ...response.data,`
- `      if (allTimes && Array.isArray(allTimes)) {`
- `        setClassTimeList(`
- `          allTimes.map((item: AttendanceTimeResponse) => ({`
- `            id: item.attendance_time_id,`
- `            title: item.attendance_time,`
- `          }))`
- `        );`
- `      }`
- `      const response = (await API4.Get()) as unknown as {`
- `        data: TeacherResponse[];`
- `      };`
- `      // FIX 3: create new array instead of mutating response.data`
- `        ...response.data,`
- `      if (allTeachers && Array.isArray(allTeachers)) {`
- `        setTeacherNameList(`
- `          allTeachers.map((item: TeacherResponse) => ({`
- `            id: item.teacher_name_id,`
- `            title: item.teacher_name,`
- `          }))`
- `        );`
- `      }`

### Inserted

- `const extractArrayData = <T,>(response: unknown): T[] => {`
- `  const payload = (response as { data?: unknown }).data;`
- ``
- `  if (Array.isArray(payload)) {`
- `    return payload as T[];`
- `  }`
- ``
- `  if (payload && typeof payload === "object") {`
- `    const nestedPayload = (payload as { data?: unknown }).data;`
- `    if (Array.isArray(nestedPayload)) {`
- `      return nestedPayload as T[];`
- `    }`
- `  }`
- ``
- `  return [];`
- `};`
- ``
- `          const records = extractArrayData<AttendanceRecord>(response);`
- `          if (records.length > 0) {`
- `      const response = await API5.Get();`
- `      const students = extractArrayData<StudentResponse>(response);`
- `        ...students,`
- `      const response = await API2.Get();`
- `      const classes = extractArrayData<ClassNameResponse>(response);`
- `        ...classes,`
- `      setClassNameList(`
- `        allClasses.map((item: ClassNameResponse) => ({`
- `          id: item.class_name_id,`
- `          title: item.class_name,`
- `        }))`
- `      );`
- `      const response = await API13.Get();`
- `      const times = extractArrayData<AttendanceTimeResponse>(response);`
- `        ...times,`
- `      setClassTimeList(`
- `        allTimes.map((item: AttendanceTimeResponse) => ({`
- `          id: item.attendance_time_id,`
- `          title: item.attendance_time,`
- `        }))`
- `      );`
- `      const response = await API4.Get();`
- `      const teachers = extractArrayData<TeacherResponse>(response);`
- `        ...teachers,`
- `      setTeacherNameList(`
- `        allTeachers.map((item: TeacherResponse) => ({`
- `          id: item.teacher_name_id,`
- `          title: item.teacher_name,`
- `        }))`
- `      );`

## frontend/src/components/ClassName/ClassTable.tsx

- Removed lines: 2
- Inserted lines: 20

### Removed

- `      const response = (await API.Get()) as { data: ClassNameModel[] };`
- `      setData(Array.isArray(response?.data) ? response.data : []);`

### Inserted

- `const extractArrayData = <T,>(response: unknown): T[] => {`
- `  const payload = (response as { data?: unknown }).data;`
- ``
- `  if (Array.isArray(payload)) {`
- `    return payload as T[];`
- `  }`
- ``
- `  if (payload && typeof payload === "object") {`
- `    const nested = (payload as { data?: unknown }).data;`
- `    if (Array.isArray(nested)) {`
- `      return nested as T[];`
- `    }`
- `  }`
- ``
- `  return [];`
- `};`
- ``
- `      const response = await API.Get();`
- `      const classes = extractArrayData<ClassNameModel>(response);`
- `      setData(classes);`

## frontend/src/components/Expense/viewExpense.tsx

- Removed lines: 21
- Inserted lines: 12

### Removed

- `interface ApiResponse<T> {`
- `  data: T;`
- `  status: number;`
- `  message?: string;`
- `}`
- ``
- `      const res = (await API.GetExpenseCategory()) as ApiResponse<`
- `        ExpenseCategory[]`
- `      >;`
- `      setExpenseCategory(res.data);`
- `      console.error("Error fetching Expense categories:", error);`
- `      const res = (await API.GetAllExpenseData()) as ApiResponse<ExpenseDataItem[]>;`
- `      if (res && Array.isArray(res.data) && res.data.length > 0) {`
- `        setExpenseData(sortByDateDesc(res.data));`
- `      console.error("Error fetching all Expense data:", error);`
- `      const res = (await API.GetExpenseData(CategoryId)) as ApiResponse<ExpenseDataItem[]>;`
- `      if (res && Array.isArray(res.data)) {`
- `        setExpenseData(sortByDateDesc(res.data));`
- `      console.error("Error fetching Expense data:", error);`
- `      console.error("Error deleting expense:", error);`
- `      console.error("Error updating expense:", error);`

### Inserted

- `import { extractArrayData } from "@/utils/apiResponse";`
- `      const res = await API.GetExpenseCategory();`
- `      const categories = extractArrayData<ExpenseCategory>(res);`
- `      setExpenseCategory(categories);`
- `      const res = await API.GetAllExpenseData();`
- `      const items = extractArrayData<ExpenseDataItem>(res);`
- `      if (items.length > 0) {`
- `        setExpenseData(sortByDateDesc(items));`
- `      const res = await API.GetExpenseData(CategoryId);`
- `      const items = extractArrayData<ExpenseDataItem>(res);`
- `      if (items.length > 0) {`
- `        setExpenseData(sortByDateDesc(items));`

## frontend/src/components/Fees/AddFees.tsx

- Removed lines: 32
- Inserted lines: 43

### Removed

- `        const response = (await StudentAPI.GetByClassId(classId)) as unknown as {`
- `          data: StudentResponse[];`
- `        };`
- `        if (response.data && response.data.length > 0) {`
- `            response.data.map((student) => ({`
- `            const allStudentsResponse = (await StudentAPI.Get()) as {`
- `              data: StudentResponse[];`
- `            };`
- `            const filteredStudents = allStudentsResponse.data.filter(`
- `              (student) => student.class_name === selectedClass.title`
- `            );`
- `          const allStudentsResponse = (await StudentAPI.Get()) as {`
- `            data: StudentResponse[];`
- `          };`
- `          const filteredStudents = allStudentsResponse.data.filter(`
- `            (student) => student.class_name === selectedClass.title`
- `          );`
- `      const response = (await StudentAPI.Get()) as { data: StudentResponse[] };`
- `        response.data.map((student) => ({`
- `        response.data.map((student) => ({`
- `      const response = (await ClassNameAPI.Get()) as {`
- `        data: ClassNameResponse[];`
- `      };`
- `      if (response.data && Array.isArray(response.data)) {`
- `        setClassNameList(`
- `          response.data.map((item: ClassNameResponse) => ({`
- `            id: item.class_name_id,`
- `            title: item.class_name,`
- `          }))`
- `        );`
- `      }`
- `      console.log("Form Data:", formData);`

### Inserted

- `const extractArrayData = <T,>(response: unknown): T[] => {`
- `  const payload = (response as { data?: unknown }).data;`
- ``
- `  if (Array.isArray(payload)) {`
- `    return payload as T[];`
- `  }`
- ``
- `  if (payload && typeof payload === "object") {`
- `    const nested = (payload as { data?: unknown }).data;`
- `    if (Array.isArray(nested)) {`
- `      return nested as T[];`
- `    }`
- `  }`
- ``
- `  return [];`
- `};`
- ``
- `        const response = await StudentAPI.GetByClassId(classId);`
- `        const students = extractArrayData<StudentResponse>(response);`
- `        if (students.length > 0) {`
- `            students.map((student) => ({`
- `            const allStudentsResponse = await StudentAPI.Get();`
- `        const allStudents = extractArrayData<StudentResponse>(allStudentsResponse);`
- `        const filteredStudents = allStudents.filter(`
- `          (student) => student.class_name === selectedClass.title`
- `        );`
- `          const allStudentsResponse = await StudentAPI.Get();`
- `        const allStudents = extractArrayData<StudentResponse>(allStudentsResponse);`
- `        const filteredStudents = allStudents.filter(`
- `          (student) => student.class_name === selectedClass.title`
- `        );`
- `      const response = await StudentAPI.Get();`
- `      const students = extractArrayData<StudentResponse>(response);`
- `        students.map((student) => ({`
- `        students.map((student) => ({`
- `      const response = await ClassNameAPI.Get();`
- `      const classes = extractArrayData<ClassNameResponse>(response);`
- `      setClassNameList(`
- `        classes.map((item) => ({`
- `          id: item.class_name_id,`
- `          title: item.class_name,`
- `        }))`
- `      );`

## frontend/src/components/Fees/ViewFees.tsx

- Removed lines: 26
- Inserted lines: 81

### Removed

- `      const response = (await API2.Get()) as { data: ClassNameResponse[] };`
- `      if (response.data && Array.isArray(response.data)) {`
- `        response.data.unshift({`
- `          class_name_id: 0,`
- `          class_name: "All",`
- `        });`
- `        setClassNameList(`
- `          response.data.map((item: ClassNameResponse) => ({`
- `            id: item.class_name_id,`
- `            title: item.class_name,`
- `          }))`
- `        );`
- `      }`
- `const handleGetFees = async (data: GetFeeModel) => {`
- `    // Validate that year is selected (year is now mandatory)`
- `    // Use Filter API with Class, Month, Year, Status filters`
- `      // class_id: 0 is the "All" option prepended in GetClassName()`
- `      // "all" string = skip this filter; empty string = skip this filter`
- `      // Year is now mandatory, always send it`
- `      // "all" or empty string = skip fee_status filter`
- `    if (Array.isArray(response.data) && response.data.length === 0) {`
- `    } else if (Array.isArray(response.data)) {`
- `      setFeesData(response.data as FeeData[]);`
- `      toast.success("Fees data fetched successfully");`
- `      toast.error("Unexpected response format");`
- `          onSubmit={handleSubmit(handleGetFees)}`

### Inserted

- `const extractArrayData = <T,>(response: unknown): T[] => {`
- `  const payload = (response as { data?: unknown }).data;`
- ``
- `  if (Array.isArray(payload)) {`
- `    return payload as T[];`
- `  }`
- ``
- `  if (payload && typeof payload === "object") {`
- `    const nested = (payload as { data?: unknown }).data;`
- `    if (Array.isArray(nested)) {`
- `      return nested as T[];`
- `    }`
- `  }`
- ``
- `  return [];`
- `};`
- `  const [currentPage, setCurrentPage] = useState(1);`
- `  const [totalPages, setTotalPages] = useState(1);`
- `  const [pageSize] = useState(10);`
- `  const [activeFilters, setActiveFilters] = useState<GetFeeModel | null>(null);`
- `      const response = await API2.Get();`
- `      const classes = extractArrayData<ClassNameResponse>(response);`
- `      const allClasses = [{ class_name_id: 0, class_name: "All" }, ...classes];`
- `      setClassNameList(`
- `        allClasses.map((item) => ({`
- `          id: item.class_name_id,`
- `          title: item.class_name,`
- `        }))`
- `      );`
- `const handleGetFees = async (data: GetFeeModel, page = 1) => {`
- `    setIsLoading(true);`
- `    setCurrentPage(page);`
- `    setActiveFilters(data);`
- ``
- `      page,`
- `      page_size: pageSize,`
- `    const payload = response?.data;`
- `    const records = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];`
- `    const total = payload?.total ?? records.length;`
- `    const totalPagesFromPayload = payload?.total_pages ?? Math.max(1, Math.ceil(total / pageSize));`
- ``
- `    if (records.length === 0) {`
- `      setTotalPages(1);`
- `      setFeesData(records as FeeData[]);`
- `      setTotalPages(totalPagesFromPayload);`
- `      toast.success("Fees data fetched successfully");`
- `  } finally {`
- `    setIsLoading(false);`
- `  }`
- `};`
- ``
- `const handlePageChange = (page: number) => {`
- `  if (activeFilters) {`
- `    handleGetFees(activeFilters, page);`
- `          onSubmit={handleSubmit((data) => handleGetFees(data, 1))}`
- `            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 no-print">`
- `              <p className="text-sm text-gray-500">`
- `                Page {currentPage} of {totalPages}`
- `              </p>`
- `              <div className="flex items-center gap-2">`
- `                <Button`
- `                  type="button"`
- `                  variant="outline"`
- `                  size="sm"`
- `                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))}`
- `                  disabled={currentPage === 1 || isLoading}`
- `                >`
- `                  Previous`
- `                </Button>`
- `                <Button`
- `                  type="button"`
- `                  variant="outline"`
- `                  size="sm"`
- `                  onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}`
- `                  disabled={currentPage === totalPages || isLoading}`
- `                >`
- `                  Next`
- `                </Button>`
- `              </div>`
- `            </div>`
- ``

## frontend/src/components/Income/ViewIncome.tsx

- Removed lines: 16
- Inserted lines: 9

### Removed

- `interface ApiResponse<T> {`
- `  data: T;`
- `  status: number;`
- `  message?: string;`
- `}`
- ``
- `      const res = (await API.GetIncomeCategory()) as ApiResponse<IncomeCategory[]>;`
- `      const data = res.data.map((item: IncomeCategory) => ({`
- `      console.error("Error fetching income categories:", error);`
- `      const res = (await API.GetAllIncomeData()) as ApiResponse<IncomeDataItem[]>;`
- `      setIncomeData(sortByDateDesc(res.data));`
- `      console.error("Error fetching all income data:", error);`
- `      const res = (await API.GetIncomeData(CategoryId)) as ApiResponse<IncomeDataItem[]>;`
- `      setIncomeData(sortByDateDesc(res.data));`
- `      console.error("Error fetching income data:", error);`
- `      console.error("Error deleting income:", error);`

### Inserted

- `import { extractArrayData } from "@/utils/apiResponse";`
- `      const res = await API.GetIncomeCategory();`
- `      const data = extractArrayData<IncomeCategory>(res).map((item) => ({`
- `      const res = await API.GetAllIncomeData();`
- `      const items = extractArrayData<IncomeDataItem>(res);`
- `      setIncomeData(sortByDateDesc(items));`
- `      const res = await API.GetIncomeData(CategoryId);`
- `      const items = extractArrayData<IncomeDataItem>(res);`
- `      setIncomeData(sortByDateDesc(items));`

## frontend/src/components/Salary/SalaryLogs.tsx

- Removed lines: 1
- Inserted lines: 1

### Removed

- `                        <td className="py-3 px-2 text-gray-900 dark:text-gray-100 font-medium text-green-600 dark:text-green-400">`

### Inserted

- `                        <td className="py-3 px-2 font-medium text-green-600 dark:text-green-400">`

## frontend/src/components/Salary/ViewSalary.tsx

- Removed lines: 9
- Inserted lines: 0

### Removed

- `      console.log("Teachers with salary records:", teacherSalaries.length);`
- `      console.log("Unique teacher IDs:", uniqueTeacherIds);`
- ``
- `          console.log(\`Fetching summary for teacher ${teacherId}...\`);`
- `          console.log(\`Summary for teacher ${teacherId}:\`, apiSummary);`
- `          console.error(\`Error fetching summary for teacher ${teacherId}:\`, error);`
- `      console.log("Final summary list:", summaryList.length, summaryList);`
- ``
- `      console.error("Error fetching salary data:", error);`

## frontend/src/components/Students/AddNewStudent.tsx

- Removed lines: 14
- Inserted lines: 30

### Removed

- `  const onSubmit = (data: Inputs) => {`
- `    if (data) {`
- `      setLoading(false);`
- `    setLoading(false);`
- `    console.log("form Data", data);`
- `      const response = (await API.Get()) as { data: ClassNameResponse[] };`
- `      if (response.data) {`
- `        setClassNameList(`
- `          response.data.map((item) => ({`
- `            id: item.class_name_id,`
- `            title: item.class_name,`
- `          }))`
- `        );`
- `      }`

### Inserted

- `const extractArrayData = <T,>(response: unknown): T[] => {`
- `  const payload = (response as { data?: unknown }).data;`
- ``
- `  if (Array.isArray(payload)) {`
- `    return payload as T[];`
- `  }`
- ``
- `  if (payload && typeof payload === "object") {`
- `    const nested = (payload as { data?: unknown }).data;`
- `    if (Array.isArray(nested)) {`
- `      return nested as T[];`
- `    }`
- `  }`
- ``
- `  return [];`
- `};`
- ``
- `  const onSubmit = async (data: Inputs) => {`
- `    try {`
- `      await Promise.resolve(data);`
- `    } finally {`
- `      setLoading(false);`
- `      const response = await API.Get();`
- `      const classes = extractArrayData<ClassNameResponse>(response);`
- `      setClassNameList(`
- `        classes.map((item) => ({`
- `          id: item.class_name_id,`
- `          title: item.class_name,`
- `        }))`
- `      );`

## frontend/src/components/Students/CreateStudent.tsx

- Removed lines: 10
- Inserted lines: 9

### Removed

- `    console.log(data);`
- `      const response = (await API1.Get()) as { data: ClassNameResponse[] };`
- `      if (response.data) {`
- `        setClassNameList(`
- `          response.data.map((item) => ({`
- `            id: item.class_name,`
- `            title: item.class_name,`
- `          }))`
- `        );`
- `      }`

### Inserted

- `import { extractArrayData } from "@/utils/apiResponse";`
- `      const response = await API1.Get();`
- `      const classes = extractArrayData<ClassNameResponse>(response);`
- `      setClassNameList(`
- `        classes.map((item) => ({`
- `          id: item.class_name,`
- `          title: item.class_name,`
- `        }))`
- `      );`

## frontend/src/components/Students/StudentTable.tsx

- Removed lines: 13
- Inserted lines: 28

### Removed

- `        const response = (await ClassNameAPI.Get()) as { data: Array<{ class_name_id: number; class_name: string }> };`
- `        if (response.data) {`
- `          setClassNameList(`
- `            response.data.map((item) => ({`
- `              id: item.class_name,`
- `              title: item.class_name,`
- `            }))`
- `          );`
- `        }`
- `      console.log("Error on Delete", error);`
- `      const response = await API.Get() as { data: StudentModel[] };`
- `      const sortedData = response.data.sort((a, b) => {`
- `      console.error("Error fetching data:", error);`

### Inserted

- `const extractArrayData = <T,>(response: unknown): T[] => {`
- `  const payload = (response as { data?: unknown }).data;`
- ``
- `  if (Array.isArray(payload)) {`
- `    return payload as T[];`
- `  }`
- ``
- `  if (payload && typeof payload === "object") {`
- `    const nested = (payload as { data?: unknown }).data;`
- `    if (Array.isArray(nested)) {`
- `      return nested as T[];`
- `    }`
- `  }`
- ``
- `  return [];`
- `};`
- ``
- `        const response = await ClassNameAPI.Get();`
- `        const classes = extractArrayData<{ class_name_id: number; class_name: string }>(response);`
- `        setClassNameList(`
- `          classes.map((item) => ({`
- `            id: item.class_name,`
- `            title: item.class_name,`
- `          }))`
- `        );`
- `      const response = await API.Get();`
- `      const rows = extractArrayData<StudentModel>(response);`
- `      const sortedData = rows.sort((a, b) => {`

## frontend/src/components/dashboard/AccountantDashboard.tsx

- Removed lines: 19
- Inserted lines: 15

### Removed

- `interface ApiResponse<T> {`
- `  data: T;`
- `  message?: string;`
- `  status?: number;`
- `}`
- `      const response = (await DashboardAPI.GetIncomeExpenseSummary(year)) as ApiResponse<IncomeExpenseSummaryData>;`
- `      if (response && response.data) setIncomeExpenseSummaryData(response.data);`
- `    } catch (error) {`
- `      console.error("Error fetching income expense summary:", error);`
- `      const response = (await DashboardAPI.GetIncomeSummary(year, month === null ? undefined : month)) as ApiResponse<IncomeSummaryData>;`
- `      if (response && response.data) setIncomeSummaryData(response.data);`
- `    } catch (error) {`
- `      console.error("Error fetching income summary:", error);`
- `      const response = (await DashboardAPI.GetExpenseSummary(year, month === null ? undefined : month)) as ApiResponse<ExpenseSummaryData>;`
- `      if (response && response.data) setExpenseSummaryData(response.data);`
- `    } catch (error) {`
- `      console.error("Error fetching expense summary:", error);`
- `      const response = (await DashboardAPI.GetFeeSummary(year)) as ApiResponse<FeeSummaryData>;`
- `      if (response && response.data) setFeeSummaryData(response.data);`

### Inserted

- `import { extractPayloadData } from "@/utils/apiResponse";`
- `      const response = await DashboardAPI.GetIncomeExpenseSummary(year);`
- `      const payload = extractPayloadData<IncomeExpenseSummaryData>(response);`
- `      if (payload) setIncomeExpenseSummaryData(payload);`
- `    } catch {`
- `      const response = await DashboardAPI.GetIncomeSummary(year, month === null ? undefined : month);`
- `      const payload = extractPayloadData<IncomeSummaryData>(response);`
- `      if (payload) setIncomeSummaryData(payload);`
- `    } catch {`
- `      const response = await DashboardAPI.GetExpenseSummary(year, month === null ? undefined : month);`
- `      const payload = extractPayloadData<ExpenseSummaryData>(response);`
- `      if (payload) setExpenseSummaryData(payload);`
- `    } catch {`
- `      const response = await DashboardAPI.GetFeeSummary(year);`
- `      const payload = extractPayloadData<FeeSummaryData>(response);`

## frontend/src/components/dashboard/AdminDashboard.tsx

- Removed lines: 14
- Inserted lines: 22

### Removed

- `      const response = await DashboardAPI.GetUserRoles() as any;`
- `      setUserRolesData(response?.data ?? null);`
- `      const response = await DashboardAPI.GetStudentSummary(date) as any;`
- `      setStudentSummaryData(response?.data ?? null);`
- `      const response = await DashboardAPI.GetAttendanceSummary(date) as any;`
- `      setAttendanceSummaryData(response?.data ?? null);`
- `      const response = await DashboardAPI.GetIncomeExpenseSummary(year) as any;`
- `      setIncomeExpenseData(response?.data ?? null);`
- `      const response = await DashboardAPI.GetIncomeSummary(year, month ?? undefined) as any;`
- `      setIncomeSummaryData(response?.data ?? null);`
- `      const response = await DashboardAPI.GetExpenseSummary(year, month ?? undefined) as any;`
- `      setExpenseSummaryData(response?.data ?? null);`
- `      const response = await DashboardAPI.GetFeeSummary(year) as any;`
- `      setFeeSummaryData(response?.data ?? null);`

### Inserted

- `import { extractPayloadData } from "@/utils/apiResponse";`
- `      const response = await DashboardAPI.GetUserRoles();`
- `      const payload = extractPayloadData<UserRolesData>(response);`
- `      setUserRolesData(payload ?? null);`
- `      const response = await DashboardAPI.GetStudentSummary(date);`
- `      const payload = extractPayloadData<StudentSummaryData>(response);`
- `      setStudentSummaryData(payload ?? null);`
- `      const response = await DashboardAPI.GetAttendanceSummary(date);`
- `      const payload = extractPayloadData<AttendanceSummaryData>(response);`
- `      setAttendanceSummaryData(payload ?? null);`
- `      const response = await DashboardAPI.GetIncomeExpenseSummary(year);`
- `      const payload = extractPayloadData<IncomeExpenseSummaryData>(response);`
- `      setIncomeExpenseData(payload ?? null);`
- `      const response = await DashboardAPI.GetIncomeSummary(year, month ?? undefined);`
- `      const payload = extractPayloadData<CategorySummaryData>(response);`
- `      setIncomeSummaryData(payload ?? null);`
- `      const response = await DashboardAPI.GetExpenseSummary(year, month ?? undefined);`
- `      const payload = extractPayloadData<CategorySummaryData>(response);`
- `      setExpenseSummaryData(payload ?? null);`
- `      const response = await DashboardAPI.GetFeeSummary(year);`
- `      const payload = extractPayloadData<FeeSummaryData>(response);`
- `      setFeeSummaryData(payload ?? null);`

## frontend/src/components/dashboard/PrincipalDashboard.tsx

- Removed lines: 4
- Inserted lines: 7

### Removed

- `      const response = await DashboardAPI.GetStudentSummary(date) as any;`
- `      setStudentSummaryData(response?.data ?? null);`
- `      const response = await DashboardAPI.GetAttendanceSummary(date) as any;`
- `      setAttendanceSummaryData(response?.data ?? null);`

### Inserted

- `import { extractPayloadData } from "@/utils/apiResponse";`
- `      const response = await DashboardAPI.GetStudentSummary(date);`
- `      const payload = extractPayloadData<StudentSummaryData>(response);`
- `      setStudentSummaryData(payload ?? null);`
- `      const response = await DashboardAPI.GetAttendanceSummary(date);`
- `      const payload = extractPayloadData<AttendanceSummaryData>(response);`
- `      setAttendanceSummaryData(payload ?? null);`

## main.py

- Removed lines: 1
- Inserted lines: 2

### Removed

- ``

### Inserted

- `from fastapi.middleware.gzip import GZipMiddleware`
- `app.add_middleware(GZipMiddleware, minimum_size=1000)`

## router/adm_del.py

- Removed lines: 1
- Inserted lines: 1

### Removed

- `from fastapi import APIRouter, Depends, HTTPException`

### Inserted

- `from fastapi import APIRouter, Depends, HTTPException, Query`

## router/admin_create_user.py

- Removed lines: 1
- Inserted lines: 1

### Removed

- `from fastapi import APIRouter, Depends, HTTPException`

### Inserted

- `from fastapi import APIRouter, Depends, HTTPException, Query`

## router/attendance_time.py

- Removed lines: 1
- Inserted lines: 1

### Removed

- `from fastapi import APIRouter, Depends, HTTPException`

### Inserted

- `from fastapi import APIRouter, Depends, HTTPException, Query`

## router/attendance_value.py

- Removed lines: 1
- Inserted lines: 1

### Removed

- `from fastapi import APIRouter, Depends, HTTPException`

### Inserted

- `from fastapi import APIRouter, Depends, HTTPException, Query`

## router/class_names.py

- Removed lines: 1
- Inserted lines: 1

### Removed

- `from fastapi import APIRouter, Depends, HTTPException`

### Inserted

- `from fastapi import APIRouter, Depends, HTTPException, Query`

## router/dashboard.py

- Removed lines: 2
- Inserted lines: 0

### Removed

- `        print(f"[attendance-summary] Querying for date: {selected_date}")`
- ``

## router/deleted_students.py

- Removed lines: 4
- Inserted lines: 18

### Removed

- `@deleted_students_router.get("/", response_model=List[DeletedStudentResponse])`
- `    session: Annotated[Session, Depends(get_session)]`
- `        select(DeletedStudent).order_by(DeletedStudent.deleted_at.desc())`
- `    return records`

### Inserted

- `from sqlalchemy import func`
- `@deleted_students_router.get("/", response_model=dict)`
- `    session: Annotated[Session, Depends(get_session)],`
- `    page: int = Query(1, ge=1),`
- `    page_size: int = Query(10, ge=1, le=50),`
- `    total = session.exec(select(func.count(DeletedStudent.student_id))).one()`
- `        select(DeletedStudent)`
- `        .order_by(DeletedStudent.deleted_at.desc())`
- `        .offset((page - 1) * page_size)`
- `        .limit(page_size)`
- ``
- `    return {`
- `        "data": records,`
- `        "total": total,`
- `        "page": page,`
- `        "page_size": page_size,`
- `        "total_pages": (total + page_size - 1) // page_size,`
- `    }`

## router/expense.py

- Removed lines: 18
- Inserted lines: 35

### Removed

- `from fastapi import APIRouter, Depends, HTTPException`
- `@expense_router.get("/expenses-all/", response_model=List[ExpenseResponse])`
- `def read_expenses(user: Annotated[User, Depends(require_admin_accountant())], session: Session = Depends(get_session)):`
- `    expenses = session.exec(select(Expense)).all()`
- `    # Map category to its string representation`
- `    return [`
- `        ExpenseResponse(`
- `            id=expense.id,`
- `            created_at=expense.created_at,`
- `            recipt_number=expense.recipt_number,`
- `            date=expense.date,`
- `            category=expense.category.expense_cat_name if expense.category else None,`
- `            to_whom=expense.to_whom,`
- `            description=expense.description,`
- `            amount=expense.amount,`
- `        )`
- `        for expense in expenses`
- `    ]`

### Inserted

- `from fastapi import APIRouter, Depends, HTTPException, Query`
- `from sqlalchemy import func`
- `@expense_router.get("/expenses-all/", response_model=dict)`
- `def read_expenses(`
- `    user: Annotated[User, Depends(require_admin_accountant())],`
- `    session: Session = Depends(get_session),`
- `    page: int = Query(1, ge=1),`
- `    page_size: int = Query(10, ge=1, le=50),`
- `):`
- `    total = session.exec(select(func.count(Expense.id))).one()`
- `    expenses = session.exec(`
- `        select(Expense)`
- `        .offset((page - 1) * page_size)`
- `        .limit(page_size)`
- `    ).all()`
- ``
- `    return {`
- `        "data": [`
- `            ExpenseResponse(`
- `                id=e.id,`
- `                created_at=e.created_at,`
- `                recipt_number=e.recipt_number,`
- `                date=e.date,`
- `                category=e.category.expense_cat_name if e.category else None,`
- `                to_whom=e.to_whom,`
- `                description=e.description,`
- `                amount=e.amount,`
- `            )`
- `            for e in expenses`
- `        ],`
- `        "total": total,`
- `        "page": page,`
- `        "page_size": page_size,`
- `        "total_pages": (total + page_size - 1) // page_size,`
- `    }`

## router/expense_cat_names.py

- Removed lines: 1
- Inserted lines: 1

### Removed

- `from fastapi import APIRouter, Depends, HTTPException`

### Inserted

- `from fastapi import APIRouter, Depends, HTTPException, Query`

## router/fee.py

- Removed lines: 22
- Inserted lines: 21

### Removed

- `    fees = db.exec(select(Fee)).all()`
- `    `
- `    for fee in fees:`
- `        # If student_id is NULL, it means the student was deleted but paid fee is kept`
- `        if fee.student_id is None:`
- `            student = await get_student_by_id(db, fee.student_id)`
- `            student_name = student.student_name if student else None`
- `            father_name = student.father_name if student else None`
- `        `
- `        class_name = db.exec(`
- `            select(ClassNames)`
- `            .where(ClassNames.class_name_id == fee.class_id)`
- `        ).first()`
- `        `
- `        response = FeeResponse(`
- `            class_name=class_name.class_name if class_name else None,`
- `        )`
- `        response_list.append(response)`
- `    `
- `    skip: int = Query(0, description="Skip records"),`
- `    limit: int = Query(100, description="Limit records per page"),`
- `        filtered_response = filtered_response[skip:skip + limit]`

### Inserted

- `    from sqlalchemy import outerjoin`
- ``
- `    stmt = (`
- `        select(Fee, Students, ClassNames)`
- `        .outerjoin(Students, Fee.student_id == Students.student_id)`
- `        .outerjoin(ClassNames, Fee.class_id == ClassNames.class_name_id)`
- `    )`
- `    results = db.exec(stmt).all()`
- ``
- `    for fee, student, class_obj in results:`
- `        if student is None:`
- `            student_name = student.student_name`
- `            father_name = student.father_name`
- ``
- `        response_list.append(FeeResponse(`
- `            class_name=class_obj.class_name if class_obj else None,`
- `        ))`
- ``
- `    page: int = Query(1, ge=1, description="Page number"),`
- `    page_size: int = Query(10, ge=1, le=50, description="Records per page"),`
- `        filtered_response = filtered_response[(page - 1) * page_size : page * page_size]`

## router/income.py

- Removed lines: 82
- Inserted lines: 63

### Removed

- `from fastapi import APIRouter, Depends, HTTPException, status`
- `from sqlmodel import Session`
- `@income_router.get("/all", response_model=List[IncomeResponse])`
- `    user: User = Depends(require_admin_accountant())`
- `        # Query to get all income records`
- `        incomes = session.query(Income).all()`
- `        # Prepare the response`
- `            response.append(`
- `                IncomeResponse(`
- `                    id=income.id,  # type: ignore`
- `                    created_at=income.created_at or datetime.utcnow(),  # Ensure created_at is not None`
- `                    recipt_number=income.recipt_number,`
- `                    date=income.date,  # type: ignore`
- `                    category=category.income_cat_name if category else None,  # Convert category to string`
- `                    source=income.source,`
- `                    description=income.description,`
- `                    contact=income.contact,`
- `                    amount=income.amount`
- `                )`
- `            )`
- `        `
- `        return response`
- `@income_router.get("/filter_income", response_model=List[IncomeResponse])`
- `    user: User = Depends(require_admin_accountant())`
- `        # Return all when category_id is omitted or 0 (frontend uses 0 for "All")`
- `        if category_id is None or category_id == 0:`
- `            incomes = session.query(Income).all()`
- `        else:`
- `            incomes = session.query(Income).filter(Income.category_id == category_id).all()`
- `        # Prepare the response`
- `            filtered_response.append(`
- `                IncomeResponse(`
- `                    id=income.id,  # type: ignore`
- `                    created_at=income.created_at or datetime.utcnow(),`
- `                    recipt_number=income.recipt_number,`
- `                    date=income.date,  # type: ignore`
- `                    category=category.income_cat_name if category else None,`
- `                    source=income.source,`
- `                    description=income.description,`
- `                    contact=income.contact,`
- `                    amount=income.amount`
- `                )`
- `            )`
- `        `
- `        return filtered_response`
- `# @income_router.get("/filter_income", response_model=List[IncomeResponse])`
- `# def filter_income(`
- `#     category_id: Optional[int] = None,   # <-- make it optional`
- `#     session: Session = Depends(get_session),`
- `#     user: User = Depends(require_admin_accountant())`
- `# ):`
- `#     """Filter income records by category_id, or return all if None."""`
- `#     try:`
- `#         if category_id is None:  # <-- if no category_id passed, fetch all`
- `#             incomes = session.query(Income).all()`
- `#         else:`
- `#             incomes = session.query(Income).filter(Income.category_id == category_id).all()`
- ``
- `#         # Prepare the response`
- `#         response = []`
- `#         for income in incomes:`
- `#             category = session.get(IncomeCatNames, income.category_id)`
- `#             response.append(`
- `#                 IncomeResponse(`
- `#                     id=income.id,  # type: ignore`
- `#                     created_at=income.created_at or datetime.utcnow(),`
- `#                     recipt_number=income.recipt_number,`
- `#                     date=income.date,  # type: ignore`
- `#                     category=category.income_cat_name if category else None,`
- `#                     source=income.source,`
- `#                     description=income.description,`
- `#                     contact=income.contact,`
- `#                     amount=income.amount`
- `#                 )`
- `#             )`
- ``
- `#         return response`
- `#     except Exception as e:`
- `#         raise HTTPException(`
- `#             status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,`
- `#             detail=f"Error filtering income records: {str(e)}"`
- `#         )`

### Inserted

- `from fastapi import APIRouter, Depends, HTTPException, Query, status`
- `from sqlmodel import Session, select`
- `from sqlalchemy import func`
- `@income_router.get("/all", response_model=dict)`
- `    user: User = Depends(require_admin_accountant()),`
- `    page: int = Query(1, ge=1),`
- `    page_size: int = Query(10, ge=1, le=50),`
- `        total = session.exec(select(func.count(Income.id))).one()`
- `        incomes = session.exec(`
- `            select(Income)`
- `            .offset((page - 1) * page_size)`
- `            .limit(page_size)`
- `        ).all()`
- `            response.append(IncomeResponse(`
- `                id=income.id,`
- `                created_at=income.created_at or datetime.utcnow(),`
- `                recipt_number=income.recipt_number,`
- `                date=income.date,`
- `                category=category.income_cat_name if category else None,`
- `                source=income.source,`
- `                description=income.description,`
- `                contact=income.contact,`
- `                amount=income.amount`
- `            ))`
- ``
- `        return {`
- `            "data": response,`
- `            "total": total,`
- `            "page": page,`
- `            "page_size": page_size,`
- `            "total_pages": (total + page_size - 1) // page_size,`
- `        }`
- `@income_router.get("/filter_income", response_model=dict)`
- `    user: User = Depends(require_admin_accountant()),`
- `    page: int = Query(1, ge=1),`
- `    page_size: int = Query(10, ge=1, le=50),`
- `        query = select(Income)`
- `        if category_id and category_id != 0:`
- `            query = query.where(Income.category_id == category_id)`
- ``
- `        total = session.exec(select(func.count()).select_from(query.subquery())).one()`
- `        incomes = session.exec(`
- `            query.offset((page - 1) * page_size).limit(page_size)`
- `        ).all()`
- `            filtered_response.append(IncomeResponse(`
- `                id=income.id,`
- `                created_at=income.created_at or datetime.utcnow(),`
- `                recipt_number=income.recipt_number,`
- `                date=income.date,`
- `                category=category.income_cat_name if category else None,`
- `                source=income.source,`
- `                description=income.description,`
- `                contact=income.contact,`
- `                amount=income.amount`
- `            ))`
- ``
- `        return {`
- `            "data": filtered_response,`
- `            "total": total,`
- `            "page": page,`
- `            "page_size": page_size,`
- `            "total_pages": (total + page_size - 1) // page_size,`
- `        }`

## router/income_cat_names.py

- Removed lines: 1
- Inserted lines: 1

### Removed

- `from fastapi import APIRouter, Depends, HTTPException`

### Inserted

- `from fastapi import APIRouter, Depends, HTTPException, Query`

## router/mark_attendance.py

- Removed lines: 12
- Inserted lines: 29

### Removed

- `@mark_attendance_router.get("/show_all_attendance", response_model=List[FilteredAttendanceResponse])`
- `def get_all_attendance(                                    # FIX 1: unique function name`
- `    skip: int = Query(default=0, ge=0, description="Records to skip"),`
- `    limit: int = Query(default=50, ge=1, le=500, description="Max records to return"),  # FIX 2: pagination`
- `    stmt = _eager_select().offset(skip).limit(limit)`
- `    records = session.exec(stmt).unique().all()`
- `    if not records:`
- `        raise HTTPException(status_code=404, detail="No attendance records found")`
- `    return [_build_response(att) for att in records]`
- `@mark_attendance_router.get("/filter_attendance_by_ids", response_model=List[FilteredAttendanceResponse])`
- `    if not records:`
- `    return [_build_response(att) for att in records]`

### Inserted

- `@mark_attendance_router.get("/show_all_attendance", response_model=dict)`
- `def get_all_attendance(`
- `    page: int = Query(default=1, ge=1, description="Page number"),`
- `    page_size: int = Query(default=10, ge=1, le=50, description="Records per page"),`
- `    from sqlalchemy import func`
- `    total = session.exec(select(func.count(Attendance.attendance_id))).one()`
- `    stmt = _eager_select().offset((page - 1) * page_size).limit(page_size)`
- `    records = session.exec(stmt).unique().all()`
- `    return {`
- `        "data": [_build_response(att) for att in records],`
- `        "total": total,`
- `        "page": page,`
- `        "page_size": page_size,`
- `        "total_pages": (total + page_size - 1) // page_size,`
- `    }`
- `@mark_attendance_router.get("/filter_attendance_by_ids", response_model=dict)`
- `    page: int = Query(default=1, ge=1),`
- `    page_size: int = Query(default=10, ge=1, le=50),`
- `    total = len(records)`
- `    paginated = records[(page - 1) * page_size : page * page_size]`
- ``
- `    if not paginated:`
- `    return {`
- `        "data": [_build_response(att) for att in paginated],`
- `        "total": total,`
- `        "page": page,`
- `        "page_size": page_size,`
- `        "total_pages": (total + page_size - 1) // page_size,`
- `    }`

## router/salary.py

- Removed lines: 53
- Inserted lines: 87

### Removed

- `from fastapi import APIRouter, Depends, HTTPException, status`
- `@salary_router.get("/teacher-salary/all", response_model=List[TeacherSalaryResponse])`
- `    user: Annotated[User, Depends(require_admin_accountant())]`
- `        salaries = db.exec(select(TeacherSalary)).all()`
- ``
- `            response.append(`
- `                TeacherSalaryResponse(`
- `                    id=salary.id,`
- `                    teacher_id=salary.teacher_id,`
- `                    teacher_name=teacher.teacher_name if teacher else None,`
- `                    base_salary=salary.base_salary,`
- `                    effective_from=_serialize_date_value(salary.effective_from),`
- `                    effective_till=_serialize_date_value(salary.effective_till),`
- `                    created_at=salary.created_at`
- `                )`
- `            )`
- `        return response`
- `@salary_router.get("/ledger/all", response_model=List[SalaryLedgerResponse])`
- `    user: Annotated[User, Depends(require_admin_accountant())]`
- `        # Use JOIN to fetch ledgers with teacher names in a single query (avoids N+1 problem)`
- `            response.append(`
- `                SalaryLedgerResponse(`
- `                    id=ledger.id,`
- `                    teacher_id=ledger.teacher_id,`
- `                    teacher_name=teacher.teacher_name if teacher else None,`
- `                    month=ledger.month,`
- `                    year=ledger.year,`
- `                    base_salary=ledger.base_salary,`
- `                    allowance_total=ledger.allowance_total or 0,`
- `                    deduction_total=ledger.deduction_total or 0,`
- `                    net_salary=ledger.net_salary,`
- `                    total_paid=ledger.total_paid or 0,`
- `                    remaining=ledger.remaining,`
- `                    created_at=ledger.created_at`
- `                )`
- `            )`
- `        return response`
- `@salary_router.get("/deduction/all", response_model=List[DeductionResponse])`
- `    user: Annotated[User, Depends(require_admin_accountant())]`
- `            response.append(`
- `                DeductionResponse(`
- `                    id=deduction.id,`
- `                    teacher_id=deduction.teacher_id,`
- `                    teacher_name=teacher.teacher_name if teacher else None,`
- `                    month=deduction.month,`
- `                    year=deduction.year,`
- `                    amount=deduction.amount,`
- `                    type=deduction.type,`
- `                    reason=deduction.reason,`
- `                    created_at=deduction.created_at`
- `                )`
- `            )`
- `        return response`

### Inserted

- `from fastapi import APIRouter, Depends, HTTPException, Query, status`
- `from sqlalchemy import func`
- `@salary_router.get("/teacher-salary/all", response_model=dict)`
- `    user: Annotated[User, Depends(require_admin_accountant())],`
- `    page: int = Query(1, ge=1),`
- `    page_size: int = Query(10, ge=1, le=50),`
- `        from sqlalchemy import func`
- `        total = db.exec(select(func.count(TeacherSalary.id))).one()`
- `        salaries = db.exec(`
- `            select(TeacherSalary)`
- `            .offset((page - 1) * page_size)`
- `            .limit(page_size)`
- `        ).all()`
- `            response.append(TeacherSalaryResponse(`
- `                id=salary.id,`
- `                teacher_id=salary.teacher_id,`
- `                teacher_name=teacher.teacher_name if teacher else None,`
- `                base_salary=salary.base_salary,`
- `                effective_from=_serialize_date_value(salary.effective_from),`
- `                effective_till=_serialize_date_value(salary.effective_till),`
- `                created_at=salary.created_at`
- `            ))`
- ``
- `        return {`
- `            "data": response,`
- `            "total": total,`
- `            "page": page,`
- `            "page_size": page_size,`
- `            "total_pages": (total + page_size - 1) // page_size,`
- `        }`
- `@salary_router.get("/ledger/all", response_model=dict)`
- `    user: Annotated[User, Depends(require_admin_accountant())],`
- `    page: int = Query(1, ge=1),`
- `    page_size: int = Query(10, ge=1, le=50),`
- `        from sqlalchemy import func`
- `        total = db.exec(select(func.count(SalaryLedger.id))).one()`
- `            .offset((page - 1) * page_size)`
- `            .limit(page_size)`
- `            response.append(SalaryLedgerResponse(`
- `                id=ledger.id,`
- `                teacher_id=ledger.teacher_id,`
- `                teacher_name=teacher.teacher_name if teacher else None,`
- `                month=ledger.month,`
- `                year=ledger.year,`
- `                base_salary=ledger.base_salary,`
- `                allowance_total=ledger.allowance_total or 0,`
- `                deduction_total=ledger.deduction_total or 0,`
- `                net_salary=ledger.net_salary,`
- `                total_paid=ledger.total_paid or 0,`
- `                remaining=ledger.remaining,`
- `                created_at=ledger.created_at`
- `            ))`
- ``
- `        return {`
- `            "data": response,`
- `            "total": total,`
- `            "page": page,`
- `            "page_size": page_size,`
- `            "total_pages": (total + page_size - 1) // page_size,`
- `        }`
- `@salary_router.get("/deduction/all", response_model=dict)`
- `    user: Annotated[User, Depends(require_admin_accountant())],`
- `    page: int = Query(1, ge=1),`
- `    page_size: int = Query(10, ge=1, le=50),`
- `        from sqlalchemy import func`
- `        total = db.exec(select(func.count(Deduction.id))).one()`
- `            .offset((page - 1) * page_size)`
- `            .limit(page_size)`
- `            response.append(DeductionResponse(`
- `                id=deduction.id,`
- `                teacher_id=deduction.teacher_id,`
- `                teacher_name=teacher.teacher_name if teacher else None,`
- `                month=deduction.month,`
- `                year=deduction.year,`
- `                amount=deduction.amount,`
- `                type=deduction.type,`
- `                reason=deduction.reason,`
- `                created_at=deduction.created_at`
- `            ))`
- ``
- `        return {`
- `            "data": response,`
- `            "total": total,`
- `            "page": page,`
- `            "page_size": page_size,`
- `            "total_pages": (total + page_size - 1) // page_size,`
- `        }`

## router/students.py

- Removed lines: 4
- Inserted lines: 18

### Removed

- `@students_router.get("/all_students/", response_model=List[StudentsResponse])`
- `    session: Annotated[Session, Depends(get_session)]`
- `    students = session.exec(select(Students)).all()`
- `    return students`

### Inserted

- `from sqlalchemy import func`
- `@students_router.get("/all_students/", response_model=dict)`
- `    session: Annotated[Session, Depends(get_session)],`
- `    page: int = Query(10, ge=1, le=50, description="Page number"),`
- `    page_size: int = Query(10, ge=1, le=50, description="Records per page"),`
- `    total = session.exec(select(func.count(Students.student_id))).one()`
- `    students = session.exec(`
- `        select(Students)`
- `        .offset((page - 1) * page_size)`
- `        .limit(page_size)`
- `    ).all()`
- `    return {`
- `        "data": students,`
- `        "total": total,`
- `        "page": page,`
- `        "page_size": page_size,`
- `        "total_pages": (total + page_size - 1) // page_size,`
- `    }`

## router/teacher_names.py

- Removed lines: 1
- Inserted lines: 1

### Removed

- `from fastapi import APIRouter, Depends, HTTPException`

### Inserted

- `from fastapi import APIRouter, Depends, HTTPException, Query`

## utils/folder_structure.py

- Removed lines: 53
- Inserted lines: 72

### Removed

- `def get_all_files(start_path):`
- `    """Recursively get all files in a directory"""`
- `    all_files = []`
- `    `
- `    for root, dirs, files in os.walk(start_path):`
- `        # Remove ignored folders from dirs to prevent descending into them`
- `        dirs[:] = [d for d in dirs if d not in IGNORE_FOLDERS]`
- `        `
- `        for file in files:`
- `            file_path = os.path.join(root, file)`
- `            # Store relative path from start_path`
- `            rel_path = os.path.relpath(file_path, start_path)`
- `            all_files.append(rel_path)`
- `    `
- `    return sorted(all_files)`
- ``
- `# Get all files in frontend/src`
- `src_path = "./frontend/src"`
- ``
- `if os.path.exists(src_path):`
- `    files = get_all_files(src_path)`
- `    print(f"All files in {src_path}:\n")`
- `    for file in files:`
- `        print(file)`
- `    print(f"\nTotal files: {len(files)}")`
- `else:`
- `    print(f"Error: {src_path} does not exist")`
- ``
- ``
- `# import os`
- `# import sys`
- `# print("Current directory:", os.getcwd())`
- `# print("Directory contents:", os.listdir('.'))`
- `# print("Parent contents:", os.listdir('..'))`
- ``
- ``
- ``
- `# print("=== DEBUG INFO ===")`
- `# print("Current dir:", os.getcwd())`
- `# print("Python path:", sys.path)`
- `# print("Files in current dir:", os.listdir('.'))`
- `# if 'api' in os.listdir('.'):`
- `#     print("✓ 'api' directory exists")`
- `# else:`
- `#     print("✗ 'api' directory NOT found!")`
- `# print("==================")`
- ``
- `# # Debug for deployment`
- `# print("=== NORTHFLANK DEBUG ===")`
- `# print("Working directory:", os.getcwd())`
- `# print("Python path:", sys.path)`
- `# print("Listing current directory:", os.listdir('.'))`
- `# print("=======================")`

### Inserted

- `import argparse`
- ``
- `def build_tree(start_path):`
- `    """Recursively build a sorted tree structure of directories and files."""`
- `    tree = {`
- `        "name": os.path.basename(start_path.rstrip(os.sep)) or start_path,`
- `        "children": [],`
- `        "is_dir": True,`
- `    }`
- ``
- `    try:`
- `        entries = sorted(`
- `            os.listdir(start_path),`
- `            key=lambda name: (not os.path.isdir(os.path.join(start_path, name)), name.lower()),`
- `        )`
- `    except OSError:`
- `        return tree`
- ``
- `    for entry in entries:`
- `        if entry in IGNORE_FOLDERS:`
- `            continue`
- ``
- `        full_path = os.path.join(start_path, entry)`
- `        if os.path.isdir(full_path):`
- `            tree["children"].append(build_tree(full_path))`
- `        else:`
- `            tree["children"].append({"name": entry, "children": [], "is_dir": False})`
- ``
- `    return tree`
- ``
- ``
- `def format_tree(node, prefix="", is_last=True):`
- `    """Format a tree node into a printable string list."""`
- `    connector = "└── " if is_last else "├── "`
- `    lines = [f"{prefix}{connector}{node['name']}"]`
- ``
- `    if node["is_dir"] and node["children"]:`
- `        next_prefix = f"{prefix}{'    ' if is_last else '│   '}"`
- `        for idx, child in enumerate(node["children"]):`
- `            lines.extend(format_tree(child, next_prefix, idx == len(node["children"]) - 1))`
- ``
- `    return lines`
- ``
- ``
- `def main():`
- `    parser = argparse.ArgumentParser(description="Print a formatted folder tree.")`
- `    parser.add_argument(`
- `        "path",`
- `        nargs="?",`
- `        default=".",`
- `        help="Root path to print (default: current working directory)",`
- `    )`
- `    args = parser.parse_args()`
- ``
- `    start_path = os.path.abspath(args.path)`
- `    if not os.path.exists(start_path):`
- `        print(f"Error: {start_path} does not exist")`
- `        return`
- ``
- `    tree = build_tree(start_path)`
- `    print(f"Folder structure for: {start_path}\n")`
- ``
- `    # Print root name explicitly for top-level directory`
- `    root_name = os.path.basename(start_path.rstrip(os.sep)) or start_path`
- `    print(root_name)`
- `    for idx, child in enumerate(tree["children"]):`
- `        lines = format_tree(child, prefix="", is_last=idx == len(tree["children"]) - 1)`
- `        print("\n".join(lines))`
- ``
- ``
- `if __name__ == "__main__":`
- `    main()`

## utils/help.txt

- Removed lines: 0
- Inserted lines: 26

### Inserted

- `For Day 3 I need the following frontend files:`
- `Layout & Setup`
- `frontend/src/app/layout.tsx — to add QueryClientProvider`
- `Dashboard`
- ``
- `frontend/src/components/dashboard/AdminDashboard.tsx — has the 7 concurrent useEffect hooks to fix`
- ``
- `List page components — these need hooks + pagination UI:`
- ``
- `frontend/src/components/Students/StudentTable.tsx`
- `frontend/src/components/Fees/ViewFees.tsx`
- `frontend/src/components/Attendance/ViewAttendance.tsx`
- `frontend/src/components/Income/ViewIncome.tsx`
- `frontend/src/components/Expense/viewExpense.tsx`
- `frontend/src/components/Salary/SalaryLogs.tsx`
- ``
- `API files — to update response shape handling (response.data.data instead of response.data):`
- ``
- `frontend/src/api/Student/StudentsAPI.tsx`
- `frontend/src/api/Attendance/AttendanceAPI.ts`
- `frontend/src/api/Salary/SalaryAPI.ts`
- ``
- ``
- ``
- `SalaryLogs.tsx`
- `ViewSalary.tsx`

