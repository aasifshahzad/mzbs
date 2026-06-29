export const extractResponsePayload = <T>(response: unknown): T | undefined => {
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
