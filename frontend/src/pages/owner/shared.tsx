export { cardEntrance, cardHover, CARD_STAGGER, rowEntrance, rowHover, CountUpValue } from "../dashboard/shared";

// Owner's status set differs from the subscriber dashboard's (needs "open" for issues,
// doesn't treat "paid" as success) so it is kept separate rather than reused as-is.
export function statusPillClass(status: string): string {
  switch (status) {
    case "active":
    case "resolved":
      return "pill pill-success";
    case "pending":
    case "open":
      return "pill pill-warning";
    case "disputed":
      return "pill pill-danger";
    default:
      return "pill pill-cyan";
  }
}

export const SUBSCRIBER_PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "whish", label: "Whish" },
  { value: "omt", label: "OMT" },
];
