import { EntityBase } from "../EntityBase";

export interface ClassTiming extends EntityBase {
    attendance_time_id: number;
    attendance_time: string;
}

export interface CreateTiming {
    attendance_time: string;
    created_at?: Date;
    updated_at?: Date;
}

