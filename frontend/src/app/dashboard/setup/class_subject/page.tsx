import React from "react";
import { Header } from "@/components/dashboard/Header";
import ClassSubjectManager from "@/components/ClassSubject/ClassSubjectManager";

const page = () => {
  return (
    <div className="w-full h-screen overflow-y-auto bg-bg-light-secondary dark:bg-bg-dark-primary">
      <div className="pt-2 pl-2 pr-2">
        <Header value="Class Subjects" />
      </div>
      <ClassSubjectManager />
    </div>
  );
};

export default page;
