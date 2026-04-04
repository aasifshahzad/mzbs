import { EntityBase } from "../models/EntityBase";

export function GetActionDetail<T extends Partial<EntityBase>>(data: T, DataType: "create" | "update"): T {
    try {
        switch (DataType) {
            case "create":
                return {
                    ...data,
                    created_at: new Date(),
                    updated_at: new Date(),
                } as T;
            case "update":
                return {
                    ...data,
                    updated_at: new Date(),
                } as T;
            default:
                return data;
        }
    } catch (error) {
        console.error("Error in GetActionDetail:", error);
        throw new Error("Failed to process action details");
    }
}