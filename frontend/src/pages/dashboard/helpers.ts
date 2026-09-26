import type { TFunction } from "i18next";

export function translateStatus(t: TFunction, status: string): string {
  const key = status.toLowerCase().replace(/\s+(.)/g, (_, char: string) => char.toUpperCase());
  return String(t(`common.status.${key}`, { defaultValue: status })).toUpperCase();
}

export function statusPillClass(status: string): string {
  switch (status) {
    case "active":
    case "resolved":
    case "paid":
      return "pill pill-success";
    case "pending":
      return "pill pill-warning";
    case "disputed":
      return "pill pill-danger";
    default:
      return "pill pill-cyan";
  }
}

export const CARD_STAGGER = 0.08;
export const cardHover = {
  scale: 1.015,
  y: -4,
  boxShadow: "0 14px 32px rgba(0, 0, 0, 0.45)",
  transition: { type: "spring" as const, stiffness: 300, damping: 20 },
};

export function cardEntrance(index: number) {
  return {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4, delay: index * CARD_STAGGER, ease: "easeOut" as const },
  };
}

export function rowEntrance(index: number) {
  return {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3, delay: index * 0.04, ease: "easeOut" as const },
  };
}

export const rowHover = { scale: 1.01 };
