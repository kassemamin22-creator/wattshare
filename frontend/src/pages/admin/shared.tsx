import type { TFunction } from "i18next";

export { cardEntrance, cardHover, CARD_STAGGER, rowEntrance, rowHover, CountUpValue, SUBSCRIBER_PAYMENT_METHODS, translateStatus } from "../owner/shared";

export function displayRole(t: TFunction, role: string): string {
  return String(t(`common.roles.${role}`, { defaultValue: role }));
}

// Admin's status set differs from both the subscriber dashboard's and the manager's
// (adds "admin"/"owner" role pills and a "none" subscription-status case), so it is
// kept separate rather than reused as-is.
export function statusPillClass(status: string): string {
  switch (status) {
    case "active":
    case "resolved":
    case "paid":
    case "admin":
      return "pill pill-success";
    case "pending":
    case "owner":
      return "pill pill-warning";
    case "disputed":
      return "pill pill-danger";
    case "none":
      return "pill pill-muted";
    default:
      return "pill pill-cyan";
  }
}
