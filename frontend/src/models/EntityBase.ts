export interface EntityBase {
    created_at: Date;
    updated_at: Date;
    
//   modifiedDate: Date;

//   createdBy: string;
//   modifiedBy: string;

//   rowVersion: string;
}

export function GetActionDetail<T>(data: T, DataType: string): T {
  try {
    switch (DataType) {
      case "create":
        return {
          ...data,
          created_at: new Date(),
          updated_at: new Date(),
        };

      case "update":
        return {
          ...data,
          updated_at: new Date(),
        };

      default:
        return data;
    }
  } catch (error) {
    console.log(error);
    return data;
  }
}
