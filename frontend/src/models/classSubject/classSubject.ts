export interface ClassSubjectModel {
  id?: number;
  class_name_id: number;
  subject_name: string;
  class_name?: string;
  created_at?: string;
}

export interface ClassSubjectSetPayload {
  class_name_id: number;
  subjects: string[];
}
