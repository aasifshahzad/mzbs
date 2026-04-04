import { EntityBase } from "../EntityBase";

export interface ClassNameModel extends EntityBase{
    class_name_id: number;
    class_name: string;
}
export interface CreateClassModel {
    class_name: string;
    created_at?: Date;
    updated_at?: Date;
}
