/** Backend error envelope (src/helpers/sendErrorResponse.js). */
export interface ApiError {
  error: string;
  status: number;
}

export function apiErrorMessage(err: unknown, fallback = "Something went wrong. Please try again."): string {
  if (typeof err === "object" && err !== null) {
    const maybeAxios = err as { response?: { data?: Partial<ApiError> }; message?: string };
    const apiMsg = maybeAxios.response?.data?.error;
    if (typeof apiMsg === "string" && apiMsg.length > 0) return apiMsg;
    if (typeof maybeAxios.message === "string" && maybeAxios.message.length > 0) return maybeAxios.message;
  }
  return fallback;
}
