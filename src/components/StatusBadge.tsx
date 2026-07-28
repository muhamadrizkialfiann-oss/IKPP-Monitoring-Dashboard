import React from "react";
import { OrderStatus, TripStatus, UnitStatus, OrderType } from "../types";

type BadgeType = OrderStatus | TripStatus | UnitStatus | OrderType | string;

interface StatusBadgeProps {
  status: BadgeType;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const normalized = status.toLowerCase().replace(/_/g, " ");

  // Styling maps based on Design System & RGB Status Colors
  let classes = "bg-gray-100 text-gray-700 border-gray-200";

  switch (normalized) {
    // Open / Standby / Pre-Trip / Ekspor -> CYAN / SKY BLUE
    case "open":
    case "standby":
    case "pre trip":
    case "pre_trip":
    case "ekspor":
      classes = "bg-sky-50 text-sky-700 border border-sky-200/60";
      break;

    // In Progress / On Trip / Utilized / Impor -> BLUE / CYAN (B in RGB)
    case "in progress":
    case "in_progress":
    case "on trip":
    case "on_trip":
    case "utilized":
    case "impor":
      classes = "bg-blue-50 text-blue-700 border border-blue-200/60";
      break;

    // Done / End Trip / Available / Repo -> GREEN / EMERALD (G in RGB)
    case "done":
    case "end trip":
    case "end_trip":
    case "available":
    case "repo":
      classes = "bg-emerald-50 text-emerald-700 border border-emerald-200/60";
      break;

    // Downtime / Maintenance / Cancel -> ROSE / RED
    case "downtime":
    case "maintenance":
    case "cancel":
    case "canceled":
    case "cancelled":
      classes = "bg-rose-50 text-rose-700 border border-rose-200/60 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800";
      break;
  }

  // Capitalize for display
  const displayLabel = normalized
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs sm:text-sm font-bold tracking-wide ${classes}`}>
      {/* Decorative dot for status badges */}
      <span className={`w-2 h-2 rounded-full mr-1.5 ${
        normalized === "open" || normalized === "standby" || normalized === "pre trip" || normalized === "pre_trip" || normalized === "ekspor" ? "bg-sky-500" :
        normalized === "in progress" || normalized === "in_progress" || normalized === "on trip" || normalized === "on_trip" || normalized === "utilized" || normalized === "impor" ? "bg-blue-500" :
        normalized === "downtime" || normalized === "maintenance" ? "bg-rose-500" :
        "bg-emerald-500"
      }`}></span>
      {displayLabel}
    </span>
  );
}
