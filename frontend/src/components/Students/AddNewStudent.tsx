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
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { LoaderIcon } from "lucide-react";
import { Select } from "../Select";
import { ClassNameAPI as API } from "@/api/Classname/ClassNameAPI";

const extractArrayData = <T,>(response: unknown): T[] => {
  const payload = (response as { data?: unknown }).data;

  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (payload && typeof payload === "object") {
    const nested = (payload as { data?: unknown }).data;
    if (Array.isArray(nested)) {
      return nested as T[];
    }
  }

  return [];
};

interface Inputs {
  Sname: string;
  fname: string;
  age: string;
  DOB: string;
  gender: string;
  cast: string;
  city: string;
  fatherCnic: string;
  fatherContact: string;
  fatherOccupation: string;
  education: string;
  class: string;
  contact: string;
  address: string;
}

interface ClassNameResponse {
  class_name_id: number;
  class_name: string;
}

const AddNewStudent = () => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Inputs>();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [classNameList, setClassNameList] = useState<{ id: number; title: string }[]>([]);

  const onSubmit = async (data: Inputs) => {
    setLoading(true);
    try {
      await Promise.resolve(data);
      setOpen(false);
      reset();
      toast("Student Added Successfully!");
    } finally {
      setLoading(false);
    }
  };

  const GetClassName = async () => {
    try {
      const response = await API.Get();
      const classes = extractArrayData<ClassNameResponse>(response);
      setClassNameList(
        classes.map((item) => ({
          id: item.class_name_id,
          title: item.class_name,
        }))
      );
    } catch (error) {
      console.error("Error fetching class names:", error);
    }
  };

  useEffect(() => {
    GetClassName();
  }, []);
  return (
    <div>
      <div className="flex justify-end my-4  mr-2">
        <Button
          onClick={() => setOpen(true)}
          className="bg-primary dark:bg-transparent dark:border dark:border-white text-white hover:bg-blue-600 dark:hover:bg-zinc-900"
        >
          + Add New Student
        </Button>
      </div>
      {/* Dialog for the form */}
      <Dialog open={open}>
        <DialogContent>
          <DialogHeader>
            {/* Dialog Title */}
            <DialogTitle className="text-2xl font-semibold text-gray-800 dark:text-gray-100">
              Add New Student
            </DialogTitle>
            <hr className="bg-gray-400 dark:bg-gray-200" />

            <DialogDescription>
              {/* Form starts here */}
              <form
                onSubmit={handleSubmit(onSubmit)}
                className="dark:bg-card dark:text-card-foreground max-w-4xl mx-auto"
              >
                {/* Student Name and Father Name Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="py-2">
                    <label className="text-gray-700 dark:text-gray-400">
                      Student Name
                    </label>
                    <Input
                      className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      placeholder="Enter Full Name"
                      {...register("Sname", { required: "Field is required" })} // Student name field
                    />
                    <p className="text-red-500">{errors.Sname?.message}</p>{" "}
                    {/* Error message for student name */}
                  </div>

                  <div className="py-2">
                    <label className="text-gray-700 dark:text-gray-400">
                      Father Name
                    </label>
                    <Input
                      className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      placeholder="Enter Father Name"
                      {...register("fname", { required: "Field is required" })} // Father name field
                    />
                    <p className="text-red-500">{errors.fname?.message}</p>{" "}
                    {/* Error message for father name */}
                  </div>
                </div>

                {/* Age and Date of Birth Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="py-2">
                    <label className="text-gray-700 dark:text-gray-400">
                      Age
                    </label>
                    <Input
                      type="number"
                      className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      placeholder="Enter Age"
                      {...register("age", { required: "Field is required" })} // Age field
                    />
                    <p className="text-red-500">{errors.age?.message}</p>{" "}
                    {/* Error message for age */}
                  </div>

                  <div className="py-2">
                    <label className="text-gray-700 dark:text-gray-400">
                      Date of Birth
                    </label>
                    <Input
                      type="date"
                      className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      {...register("DOB", { required: "Field is required" })} // Date of Birth field
                    />
                    <p className="text-red-500">{errors.DOB?.message}</p>{" "}
                    {/* Error message for Date of Birth */}
                  </div>
                </div>

                {/* Cast and City Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="py-2">
                    <label className="text-gray-700 dark:text-gray-400">
                      Cast
                    </label>
                    <Input
                      className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      placeholder="Enter Cast"
                      {...register("cast", { required: "Field is required" })} // Cast field
                    />
                    <p className="text-red-500">{errors.cast?.message}</p>{" "}
                    {/* Error message for cast */}
                  </div>

                  <div className="py-2">
                    <label className="text-gray-700 dark:text-gray-400">
                      City
                    </label>
                    <Input
                      className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      placeholder="Enter City"
                      {...register("city", { required: "Field is required" })} // City field
                    />
                    <p className="text-red-500">{errors.city?.message}</p>{" "}
                    {/* Error message for city */}
                  </div>
                </div>

                {/* Gender and Education Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="py-2">
                    <label className="text-gray-700 dark:text-gray-400">
                      Gender
                    </label>
                    <Input
                      className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      placeholder="Enter Gender"
                      {...register("gender", { required: "Field is required" })} // Gender field
                    />
                    <p className="text-red-500">{errors.gender?.message}</p>{" "}
                    {/* Error message for gender */}
                  </div>

                  <div className="py-2">
                    <label className="text-gray-700 dark:text-gray-400">
                      Education
                    </label>
                    <Input
                      className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      placeholder="Enter Education"
                      {...register("education", {
                        required: "Field is required",
                      })} // Education field
                    />
                    <p className="text-red-500">{errors.education?.message}</p>{" "}
                    {/* Error message for education */}
                  </div>
                </div>

                {/* Father's Occupation and Father's Contact Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="py-2">
                    <label className="text-gray-700 dark:text-gray-400">
                      Father Occupation
                    </label>
                    <Input
                      className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      placeholder="Enter Father Occupation"
                      {...register("fatherOccupation", {
                        required: "Field is required",
                      })} // Father's occupation field
                    />
                    <p className="text-red-500">
                      {errors.fatherOccupation?.message}
                    </p>{" "}
                    {/* Error message for father's occupation */}
                  </div>

                  <div className="py-2">
                    <label className="text-gray-700 dark:text-gray-400">
                      Father Contact
                    </label>
                    <Input
                      type="number"
                      className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      placeholder="Enter Father Contact"
                      {...register("fatherContact", {
                        required: "Field is required",
                      })} // Father's contact field
                    />
                    <p className="text-red-500">
                      {errors.fatherContact?.message}
                    </p>{" "}
                    {/* Error message for father's contact */}
                  </div>
                </div>

                {/* Class and Address Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="py-2 w-36">
                    <Select
                      label="Class Name"
                      options={classNameList}
                      {...register("class", {
                        required: "Field is required",
                      })}
                      DisplayItem="title" // Matches the title key from options
                      className="w-full"
                    />
                    <p className="text-red-500">
                      {errors.class?.message}
                    </p>
                  </div>

                  <div className="py-2 gap-5">
                    <label className="text-gray-700 dark:text-gray-400">
                      Address
                    </label>
                    <Input
                      className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      placeholder="Enter Address"
                      {...register("address", {
                        required: "Field is required",
                      })} // Address field
                    />
                    <p className="text-red-500">{errors.address?.message}</p>{" "}
                    {/* Error message for address */}
                  </div>
                </div>

                {/* Form Buttons: Cancel and Save */}
                <div className="flex justify-end gap-4 mt-5">
                  <Button
                    type="button"
                    onClick={() => setOpen(false)}
                    variant="ghost"
                    className="bg-gray-200 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:bg-secondary dark:hover:bg-gray-800"
                  >
                    Cancel {/* Cancel button */}
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="bg-primary dark:bg-transparent dark:border dark:border-white text-white hover:bg-blue-600 dark:hover:bg-zinc-900"
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
