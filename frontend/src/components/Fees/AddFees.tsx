"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/Select";
import { useForm } from "react-hook-form";
import { ClassNameAPI } from "@/api/Classname/ClassNameAPI";
import { StudentAPI } from "@/api/Student/StudentsAPI";
import { FeeAPI } from "@/api/Fees/AddFeeAPI";
import { Header } from "@/components/dashboard/Header";
import { toast } from "sonner";
import { ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@/libs/utils";
import { AddFeeModel } from "@/models/Fees/Fee";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ClassNameResponse {
  class_name_id: number;
  class_name: string;
}

interface StudentResponse {
  student_id: number;
  student_name: string;
  class_name: string; // Add this property to match the data structure
}

const AddFees = () => {
  const {
    register,
    setValue: setFormValue,
    formState: { errors },
    handleSubmit,
    reset,
    watch,
  } = useForm<AddFeeModel>();

  const [isLoading, setIsLoading] = useState(false);
  const [classNameList, setClassNameList] = useState<
    { id: number; title: string }[]
  >([]);
  const [studentsList, setStudentsList] = useState<
    { id: number; title: string }[]
  >([]);
  const [filteredStudentsList, setFilteredStudentsList] = useState<
    { id: number; title: string }[]
  >([]);
  const [open, setOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState("");
  const selectedClassId = watch("class_id");

  useEffect(() => {
    GetClassName();
    GetStudents();
    // Set year to current year as default
    setFormValue("fee_year", new Date().getFullYear());
  }, [setFormValue]);

  // Watch for class changes and filter students accordingly
  // Modified to filter students using class_name instead of class_id
  const filterStudentsByClass = useCallback(
    async (classId: number) => {
      setIsLoading(true);
      try {
        // First try to get students directly from API if your backend supports it
        const response = (await StudentAPI.GetByClassId(classId)) as unknown as {
          data: StudentResponse[];
        };

        if (response.data && response.data.length > 0) {
          setFilteredStudentsList(
            response.data.map((student) => ({
              id: student.student_id,
              title: student.student_name,
            }))
          );
        } else {
          // If API returns empty data, filter locally from existing list
          // Get the class name corresponding to the selected class ID
          const selectedClass = classNameList.find((cls) => cls.id === classId);
          if (selectedClass) {
            // Use the API to get all students and filter them by class name
            const allStudentsResponse = (await StudentAPI.Get()) as {
              data: StudentResponse[];
            };

            const filteredStudents = allStudentsResponse.data.filter(
              (student) => student.class_name === selectedClass.title
            );

            setFilteredStudentsList(
              filteredStudents.map((student) => ({
                id: student.student_id,
                title: student.student_name,
              }))
            );
          } else {
            setFilteredStudentsList([]);
          }
        }
      } catch (error) {
        console.error("Error fetching students by class:", error);

        // If API fails completely, filter locally from our existing list
        // Get the class name corresponding to the selected class ID
        const selectedClass = classNameList.find((cls) => cls.id === classId);
        if (selectedClass && studentsList.length > 0) {
          // Create a simulated filtering based on class names
          // This assumes you have the full student data in the studentsList
          // and that you can match class names against class IDs
          const allStudentsResponse = (await StudentAPI.Get()) as {
            data: StudentResponse[];
          };

          const filteredStudents = allStudentsResponse.data.filter(
            (student) => student.class_name === selectedClass.title
          );

          setFilteredStudentsList(
            filteredStudents.map((student) => ({
              id: student.student_id,
              title: student.student_name,
            }))
          );
        } else {
          setFilteredStudentsList([]);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [classNameList, studentsList]
  );

  useEffect(() => {
    if (selectedClassId) {
      filterStudentsByClass(selectedClassId);
    } else {
      setFilteredStudentsList(studentsList);
    }
    // Reset selected student when class changes
    setSelectedStudent("");
    // Use 0 instead of null or undefined for student_id
    setFormValue("student_id", 0);
  }, [selectedClassId, studentsList, filterStudentsByClass, setFormValue]);

  const GetStudents = async () => {
    setIsLoading(true);
    try {
      const response = (await StudentAPI.Get()) as { data: StudentResponse[] };
      setStudentsList(
        response.data.map((student) => ({
          id: student.student_id,
          title: student.student_name,
        }))
      );
      setFilteredStudentsList(
        response.data.map((student) => ({
          id: student.student_id,
          title: student.student_name,
        }))
      );
    } catch (error) {
      console.error("Error fetching students:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const GetClassName = async () => {
    try {
      setIsLoading(true);
      const response = (await ClassNameAPI.Get()) as {
        data: ClassNameResponse[];
      };
      if (response.data && Array.isArray(response.data)) {
        setClassNameList(
          response.data.map((item: ClassNameResponse) => ({
            id: item.class_name_id,
            title: item.class_name,
          }))
        );
      }
    } catch (error) {
      console.error("Error fetching class names:", error);
    }
    setIsLoading(false);
  };

  const onSubmit = async (formData: AddFeeModel) => {
    try {
      setIsLoading(true);
      await FeeAPI.Create(formData);
      console.log("Form Data:", formData);
      toast.success("Fee record added successfully");
      reset(); // Reset form after successful submission
      setSelectedStudent(""); // Reset student selection
    } catch (error) {
      console.error("Error adding fee record:", error);
      toast.error("Failed to add fee record");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto w-auto px-4">
      <Header value="Add Fee Record" />
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="bg-white dark:bg-background rounded-xl shadow-sm border border-gray-200 dark:border-secondary p-6 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm text-gray-700 dark:text-gray-300 font-bold">
                Class Name
              </label>
              <Select
                options={classNameList}
                {...register("class_id", {
                  valueAsNumber: true,
                  required: "Class name is required",
                })}
                DisplayItem="title"
                className="w-full focus:ring-primary"
              />
              <p className="text-red-500 text-xs">{errors.class_id?.message}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-gray-700 dark:text-gray-300 font-bold">
                Student
              </label>
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between"
                    disabled={!selectedClassId}
                  >
                    {selectedStudent
                      ? filteredStudentsList.find(
                          (student) => student.id.toString() === selectedStudent
                        )?.title
                      : selectedClassId
                      ? "Select student..."
                      : "Please select a class first"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput
                      placeholder="Search student..."
                      className="h-9"
                    />
                    <CommandList>
                      {isLoading ? (
                        <div className="p-2 text-center text-gray-500">
                          Loading...
                        </div>
                      ) : (
                        <>
                          <CommandEmpty>No student found.</CommandEmpty>
                          <CommandGroup>
                            {filteredStudentsList.map((student) => (
                              <CommandItem
                                key={student.id}
                                value={student.id.toString()}
                                onSelect={(currentValue: string) => {
                                  setSelectedStudent(
                                    currentValue === selectedStudent
                                      ? ""
                                      : currentValue
                                  );
                                  setOpen(false);
                                  setFormValue(
                                    "student_id",
                                    Number(currentValue)
                                  );
                                }}
                              >
                                {student.title}
                                <Check
                                  className={cn(
                                    "ml-auto h-4 w-4",
                                    selectedStudent === student.id.toString()
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <p className="text-red-500 text-xs">
                {errors.student_id?.message}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-gray-700 dark:text-gray-300 font-bold">
                Fee Amount
              </label>
              <Input
                type="number"
                className="w-full focus:ring-primary"
                {...register("fee_amount", {
                  valueAsNumber: true,
                  required: "Fee amount is required",
                  min: {
                    value: 0,
                    message: "Fee amount must be greater than 0",
                  },
                })}
                placeholder="Enter fee amount"
              />
              <p className="text-red-500 text-xs">
                {errors.fee_amount?.message}
              </p>
            </div>

            <div className="space-y-2">
              <Select
                label="Fee Month"
                options={[
                  { id: "January", title: "January" },
                  { id: "February", title: "February" },
                  { id: "March", title: "March" },
                  { id: "April", title: "April" },
                  { id: "May", title: "May" },
                  { id: "June", title: "June" },
                  { id: "July", title: "July" },
                  { id: "August", title: "August" },
                  { id: "September", title: "September" },
                  { id: "October", title: "October" },
                  { id: "November", title: "November" },
                  { id: "December", title: "December" },
                ]}
                {...register("fee_month")}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-gray-700 dark:text-gray-300 font-bold">
                Year
              </label>
              <Input
                type="number"
                className="w-full focus:ring-primary"
                {...register("fee_year", {
                  required: "Year is required",
                  min: { value: 2000, message: "Year must be after 2000" },
                  setValueAs: (v) => v === undefined || v === null ? "" : String(v),
                })}
                placeholder="e.g. 2024"
              />
              <p className="text-red-500 text-xs">{errors.fee_year?.message}</p>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Button
              type="submit"
              className="inline-flex items-center px-6 py-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin h-4 w-4 mr-2 border-2 border-t-transparent rounded-full" />
                  Processing...
                </>
              ) : (
                "Add Fee Record"
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AddFees;
