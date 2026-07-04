"use client";

import React, { useEffect, useMemo, useState } from "react";
import { LoaderIcon, PlusCircle, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClassNameAPI } from "@/api/Classname/ClassNameAPI";
import { ClassSubjectAPI } from "@/api/ClassSubject/ClassSubjectAPI";
import { ClassNameModel } from "@/models/className/className";
import { ClassSubjectModel } from "@/models/classSubject/classSubject";

export default function ClassSubjectManager() {
  const [classes, setClasses] = useState<ClassNameModel[]>([]);
  const [subjects, setSubjects] = useState<ClassSubjectModel[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [draftSubjects, setDraftSubjects] = useState<string[]>([]);
  const [newSubject, setNewSubject] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const selectedClass = useMemo(
    () => classes.find((item) => String(item.class_name_id) === selectedClassId),
    [classes, selectedClassId]
  );

  const loadData = async () => {
    setLoading(true);
    try {
      const [classResponse, subjectResponse] = await Promise.all([ClassNameAPI.Get(), ClassSubjectAPI.Get()]);
      const classList = Array.isArray(classResponse?.data) ? classResponse.data : [];
      const subjectList = Array.isArray(subjectResponse?.data) ? subjectResponse.data : [];
      setClasses(classList);
      setSubjects(subjectList);
      if (classList.length && !selectedClassId) {
        setSelectedClassId(String(classList[0].class_name_id));
      }
    } catch (error) {
      console.error(error);
      toast.error("Unable to load class subject data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!selectedClassId) {
      setDraftSubjects([]);
      return;
    }
    const current = subjects.filter((item) => String(item.class_name_id) === selectedClassId).map((item) => item.subject_name);
    setDraftSubjects(current);
  }, [selectedClassId, subjects]);

  const addSubject = () => {
    const trimmed = newSubject.trim();
    if (!trimmed) return;
    if (draftSubjects.includes(trimmed)) {
      toast.error("Subject already added for this class");
      return;
    }
    setDraftSubjects((prev) => [...prev, trimmed]);
    setNewSubject("");
  };

  const removeSubject = (subject: string) => {
    setDraftSubjects((prev) => prev.filter((item) => item !== subject));
  };

  const saveSubjects = async () => {
    if (!selectedClassId) return;
    setSaving(true);
    try {
      await ClassSubjectAPI.Set({ class_name_id: Number(selectedClassId), subjects: draftSubjects });
      toast.success("Subjects saved successfully");
      await loadData();
    } catch (error) {
      console.error(error);
      toast.error("Unable to save subjects");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-4 sm:mt-7 ml-1 sm:ml-3 p-3 sm:p-6 w-full sm:w-[98%] bg-white dark:bg-transparent rounded-lg shadow-lg border border-purple-200 dark:border-gray-700">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Class Subjects</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">Choose a class and manage the subjects assigned to it.</p>
        </div>
        <div className="w-full md:w-72">
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Select Class</label>
          <Select value={selectedClassId} onValueChange={setSelectedClassId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a class" />
            </SelectTrigger>
            <SelectContent>
              {classes.map((item) => (
                <SelectItem key={item.class_name_id} value={String(item.class_name_id)}>
                  {item.class_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <LoaderIcon className="h-6 w-6 animate-spin text-purple-600" />
        </div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-xl border border-purple-200 p-4 dark:border-gray-700">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                {selectedClass ? `${selectedClass.class_name} subjects` : "Subjects"}
              </h3>
              <Button onClick={saveSubjects} disabled={saving} className="bg-primary text-white">
                {saving ? <LoaderIcon className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save
              </Button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {draftSubjects.length ? (
                draftSubjects.map((subject) => (
                  <div key={subject} className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-slate-900">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{subject}</span>
                    <button onClick={() => removeSubject(subject)} className="text-red-500 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="md:col-span-2 rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                  No subjects assigned yet.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-purple-200 p-4 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Add subject</h3>
            <div className="mt-4 space-y-3">
              <Input
                placeholder="Enter subject name"
                value={newSubject}
                onChange={(event) => setNewSubject(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addSubject();
                  }
                }}
              />
              <Button onClick={addSubject} className="w-full bg-primary text-white">
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Subject
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
