export const extractArrayData = <T,>(response: unknown): T[] => {
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

  if (Array.isArray(response)) {
    return response as T[];
  }

  return [];
};

export const extractPayloadData = <T>(response: unknown): T | undefined => {
  const payload = (response as { data?: unknown }).data;

  if (payload === undefined) {
    return response as T;
  }

  if (payload && typeof payload === "object") {
    const nested = (payload as { data?: unknown }).data;
    if (nested !== undefined) {
      return nested as T;
    }
  }

  return payload as T;
};
