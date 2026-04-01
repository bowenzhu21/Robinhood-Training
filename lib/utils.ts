import { clsx } from "clsx";

export function cn(...values: Array<string | undefined | false | null>) {
  return clsx(values);
}

export function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

export function formatScore(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return "No score yet";
  }

  return `${Math.round(value)}/100`;
}

export function average(values: number[]) {
  if (!values.length) {
    return null;
  }

  return values.reduce((total, value) => total + value, 0) / values.length;
}
