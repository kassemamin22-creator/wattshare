import { isAxiosError } from "axios";

export function getApiErrorMessage(err: unknown, fallback: string): string {
  const detail = isAxiosError(err) ? err.response?.data?.detail : undefined;
  if (typeof detail === "string" && detail) {
    return detail;
  }
  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => (typeof item?.msg === "string" ? item.msg.replace(/^Value error, /, "") : ""))
      .filter(Boolean);
    if (messages.length > 0) {
      return messages.join("; ");
    }
  }
  return fallback;
}
