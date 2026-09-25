import { isAxiosError } from "axios";
import i18n from "../i18n";

export function translateErrorDetail(detail: unknown): string | null {
  if (detail && typeof detail === "object" && !Array.isArray(detail) && "code" in detail) {
    const { code, message } = detail as { code?: unknown; message?: unknown };
    if (typeof code === "string" && i18n.exists(`errors.${code}`)) {
      return i18n.t(`errors.${code}`);
    }
    if (typeof message === "string" && message) {
      return message;
    }
  }
  return null;
}

export function getApiErrorMessage(err: unknown, fallback: string): string {
  const detail = isAxiosError(err) ? err.response?.data?.detail : undefined;
  const translated = translateErrorDetail(detail);
  if (translated) {
    return translated;
  }
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
