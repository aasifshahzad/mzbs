"use client";
import React, { useEffect, useState } from "react";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "../ui/input";
import { useForm, Controller } from "react-hook-form";
import { toast } from "sonner";
import { LoaderIcon } from "lucide-react";
import { StudentAPI as API } from "@/api/Student/StudentsAPI";
import { CreateStudent } from "@/models/students/Student";
import { Select, SelectOption as SelectComponentOption } from "../Select";
import { ClassNameAPI as API1 } from "@/api/Classname/ClassNameAPI";
import { useIsMobile } from "@/hooks/use-mobile";

const AddNewStudent = ({ onClassAdded }: { onClassAdded: () => void }) => {
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
    watch,
    setValue,
  } = useForm<CreateStudent>();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [classNameList, setClassNameList] = useState<SelectComponentOption[]>(
    []
  );
  const [calculatedAge, setCalculatedAge] = useState<string>("");

  interface ClassNameResponse {
    class_name_id: number;
    class_name: string;
  }

  // Watch the date of birth field and calculate age
  const dateOfBirth = watch("student_date_of_birth");
  useEffect(() => {
    if (dateOfBirth) {
      const age = calculateAge(dateOfBirth);
      setCalculatedAge(age.toString());
      // Set the age field value
      setValue("student_age", age.toString());
    }
  }, [dateOfBirth, setValue]);

  // Function to calculate age from date of birth in detailed format
  const calculateAge = (dob: string): string => {
    const birthDate = new Date(dob);
    const today = new Date();
    
    if (isNaN(birthDate.getTime())) {
      return "Invalid date";
    }

    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();
    let days = today.getDate() - birthDate.getDate();

    // Adjust for negative days
    if (days < 0) {
      months--;
      const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      days += prevMonth.getDate();
    }

    // Adjust for negative months
    if (months < 0) {
      years--;
      months += 12;
    }

    // Handle edge case where years is negative
    if (years < 0) {
      return "0 years 0 months 0 days";
    }

    return `${years} year${years !== 1 ? 's' : ''} ${months} month${months !== 1 ? 's' : ''} ${days} day${days !== 1 ? 's' : ''}`;
  };

  const handleFormSubmit = async (data: CreateStudent) => {
    console.log(data);
    setLoading(true);
    if (data.student_date_of_birth.length === 10) {
      data.student_date_of_birth += "T00:00:00Z";
    }
    try {
      const response = await CreateStudentAPI(data);
      if (response) {
        setOpen(false);
        reset();
        setCalculatedAge("");
        toast("Student Added Successfully!");
        onClassAdded(); // Call the function to refresh the table
      }
    } catch (error) {
      console.error("Error creating student:", error);
      toast("Failed to add student");
    } finally {
      setLoading(false);
    }
  };

  const GetClassName = React.useCallback(async () => {
    try {
      const response = (await API1.Get()) as { data: ClassNameResponse[] };
      if (response.data) {
        setClassNameList(
          response.data.map((item) => ({
            id: item.class_name,
            title: item.class_name,
          }))
        );
      }
    } catch (error) {
      console.error("Error fetching class names:", error);
    }
  }, []);

  useEffect(() => {
    GetClassName();
  }, [GetClassName]);

  const CreateStudentAPI = async (data: CreateStudent) => {
    try {
      const response = await API.Create(data);
      console.log("API Response:", response.data);
      return response.data;
    } catch (error: unknown) {
      if (error instanceof Error && "response" in error) {
        console.error(
          "API Error:",
          (error as { response: { data: unknown } }).response.data
        );
      } else {
        console.error("API Error:", error);
      }
      throw error;
    }
  };

  return (
    <div>
      <div className="flex justify-end my-4 mr-2">
        <Button
          onClick={() => setOpen(true)}
          className="bg-primary dark:bg-transparent dark:border dark:border-white text-white hover:bg-blue-600 dark:hover:bg-zinc-900"
        >
          + Create
        </Button>
      </div>
      {/* Dialog for the form */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-sm sm:max-w-md">
          <DialogHeader>
            {/* Dialog Title */}
            <DialogTitle className="text-xl sm:text-2xl font-semibold text-gray-800 dark:text-gray-100">
              Add Student
            </DialogTitle>
            <hr className="bg-gray-400 dark:bg-gray-200" />

            <DialogDescription>
              {/* Form starts here */}
              <form
                onSubmit={handleSubmit(handleFormSubmit)}
                className="dark:bg-card dark:text-card-foreground mx-auto space-y-3 sm:space-y-4"
              >
                <div className="w-full">
                  <label className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-400 block mb-1.5">
                    Class Name
                  </label>
                  <Controller
                    name="class_name"
                    control={control}
                    rules={{ required: "Field is required" }}
                    render={({ field }) => (
                      <Select
                        options={classNameList}
                        {...field}
                        DisplayItem="title"
                        className="w-full h-10 sm:h-11"
                      />
                    )}
                  />
                  <p className="text-red-500 text-xs mt-1">
                    {errors.class_name?.message}
                  </p>
                </div>

                {/* Student Name and Father Name Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="w-full">
                    <label className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-400 block mb-1.5">
                      Student Name
                    </label>
                    <Input
                      className="border-gray-300 focus:border-blue-500 focus:ring-blue-500 h-10 sm:h-11"
                      placeholder="Student Name"
                      {...register("student_name", {
                        required: "Field is required",
                      })}
                    />
                    <p className="text-red-500 text-xs mt-1">
                      {errors.student_name?.message}
                    </p>
                  </div>

                  <div className="w-full">
                    <label className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-400 block mb-1.5">
                      Father Name
                    </label>
                    <Input
                      className="border-gray-300 focus:border-blue-500 focus:ring-blue-500 h-10 sm:h-11"
                      placeholder="Father Name"
                      {...register("father_name", {
                        required: "Field is required",
                      })}
                    />
                    <p className="text-red-500 text-xs mt-1">
                      {errors.father_name?.message}
                    </p>
                  </div>
                </div>

                {/* Date of Birth and Age Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="w-full">
                    <label className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-400 block mb-1.5">
                      Date of Birth
                    </label>
                    <Input
                      type="date"
                      className="border-gray-300 focus:border-blue-500 focus:ring-blue-500 h-10 sm:h-11"
                      {...register("student_date_of_birth", {
                        required: "Field is required",
                      })}
                    />
                    <p className="text-red-500 text-xs mt-1">
                      {errors.student_date_of_birth?.message}
                    </p>
                  </div>

                  <div className="w-full">
                    <label className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-400 block mb-1.5">
                      Age (Auto-calculated)
                    </label>
                    <Input
                      type="text"
                      className="border-gray-300 focus:border-blue-500 focus:ring-blue-500 h-10 sm:h-11 bg-gray-100 dark:bg-gray-800 cursor-not-allowed"
                      placeholder="Age"
                      readOnly
                      value={calculatedAge || ""}
                      {...register("student_age")}
                    />
                    <p className="text-gray-500 text-xs mt-1">
                      {calculatedAge && calculatedAge !== "Invalid date" ? calculatedAge : "Select DOB to calculate"}
                    </p>
                  </div>
                </div>

                {/* Cast and City Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="w-full">
                    <label className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-400 block mb-1.5">
                      Father Caste (Optional)
                    </label>
                    <Input
                      className="border-gray-300 focus:border-blue-500 focus:ring-blue-500 h-10 sm:h-11"
                      placeholder="Father Caste"
                      {...register("father_cast_name")}
                    />
                    <p className="text-red-500 text-xs mt-1">
                      {errors.father_cast_name?.message}
                    </p>
                  </div>

                  <div className="w-full">
                    <label className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-400 block mb-1.5">
                      City
                    </label>
                    <Input
                      className="border-gray-300 focus:border-blue-500 focus:ring-blue-500 h-10 sm:h-11"
                      placeholder="City"
                      {...register("student_city", {
                        required: "Field is required",
                      })}
                    />
                    <p className="text-red-500 text-xs mt-1">
                      {errors.student_city?.message}
                    </p>
                  </div>
                </div>

                {/* Gender and CNIC Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="w-full">
                    <label className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-400 block mb-1.5">
                      Gender
                    </label>
                    <select
                      className="border border-gray-300 focus:border-blue-500 focus:ring-blue-500 h-10 sm:h-11 rounded w-full bg-white dark:bg-zinc-900 dark:text-white px-3 sm:px-4"
                      {...register("student_gender", {
                        required: "Field is required",
                      })}
                      defaultValue=""
                    >
                      <option value="" disabled>
                        Select Gender
                      </option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                    <p className="text-red-500 text-xs mt-1">
                      {errors.student_gender?.message}
                    </p>
                  </div>
                  <div className="w-full">
                    <label className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-400 block mb-1.5">
                      Father&apos;s CNIC (Optional)
                    </label>
                    <Input
                      className="border-gray-300 focus:border-blue-500 focus:ring-blue-500 h-10 sm:h-11"
                      placeholder="Father's CNIC"
                      {...register("father_cnic")}
                    />
                    <p className="text-red-500 text-xs mt-1">
                      {errors.father_cnic?.message}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="w-full">
                    <label className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-400 block mb-1.5">
                      Education (Optional)
                    </label>
                    <Input
                      className="border-gray-300 focus:border-blue-500 focus:ring-blue-500 h-10 sm:h-11"
                      placeholder="Education"
                      {...register("student_education")}
                    />
                    <p className="text-red-500 text-xs mt-1">
                      {errors.student_education?.message}
                    </p>
                  </div>

                  <div className="w-full">
                    <label className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-400 block mb-1.5">
                      Father Contact (Optional)
                    </label>
                    <Input
                      type="number"
                      className="border-gray-300 focus:border-blue-500 focus:ring-blue-500 h-10 sm:h-11"
                      placeholder="Contact Number"
                      {...register("father_contact")}
                    />
                    <p className="text-red-500 text-xs mt-1">
                      {errors.father_contact?.message}
                    </p>
                  </div>
                </div>

                {/* Father's Occupation and Address Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="w-full">
                    <label className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-400 block mb-1.5">
                      Father Occupation (Optional)
                    </label>
                    <Input
                      className="border-gray-300 focus:border-blue-500 focus:ring-blue-500 h-10 sm:h-11"
                      placeholder="Occupation"
                      {...register("father_occupation")}
                    />
                    <p className="text-red-500 text-xs mt-1">
                      {errors.father_occupation?.message}
                    </p>
                  </div>

                  <div className="w-full">
                    <label className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-400 block mb-1.5">
                      Address (Optional)
                    </label>
                    <Input
                      className="border-gray-300 focus:border-blue-500 focus:ring-blue-500 h-10 sm:h-11"
                      placeholder="Address"
                      {...register("student_address")}
                    />
                    <p className="text-red-500 text-xs mt-1">
                      {errors.student_address?.message}
                    </p>
                  </div>
                </div>

                {/* Form Buttons: Cancel and Save */}
                <div className="flex flex-col sm:flex-row gap-2 mt-4 sm:mt-6">
                  <Button
                    type="button"
                    onClick={() => setOpen(false)}
                    variant="ghost"
                    className="w-full bg-gray-200 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:bg-secondary dark:hover:bg-gray-800 font-medium h-10 sm:h-11"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-primary dark:bg-transparent dark:border dark:border-white text-white hover:bg-blue-600 dark:hover:bg-zinc-900 font-medium h-10 sm:h-11"
                  >
                    {loading ? <LoaderIcon className="animate-spin" /> : "Save"}
                  </Button>
                </div>
              </form>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AddNewStudent;
