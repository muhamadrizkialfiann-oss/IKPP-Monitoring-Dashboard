import React from "react";
import { LucideIcon } from "lucide-react";
import { motion } from "motion/react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  description?: string;
  statusType?: "success" | "warning" | "info" | "neutral" | "danger";
  breakdown?: {
    label: string;
    value: string | number;
    color: string;
  }[];
  onClick?: () => void;
  id?: string;
}

export default function StatCard({
  title,
  value,
  icon: Icon,
  description,
  statusType = "neutral",
  breakdown,
  onClick,
  id
}: StatCardProps) {
  // Border & Glow Accents based on statusType
  const borderClasses = {
    success: "border-l-4 border-l-emerald-500 border-gray-200 focus:ring-emerald-400",
    warning: "border-l-4 border-l-sky-500 border-gray-200 focus:ring-sky-400",
    info: "border-l-4 border-l-blue-600 border-gray-200 focus:ring-blue-400",
    danger: "border-l-4 border-l-rose-500 border-gray-200 focus:ring-rose-400",
    neutral: "border-l-4 border-l-[#0B2C6B] border-gray-200 focus:ring-blue-900"
  }[statusType];

  const valueColor = {
    success: "text-emerald-700",
    warning: "text-sky-700",
    info: "text-blue-700",
    danger: "text-rose-700",
    neutral: "text-gray-900"
  }[statusType];

  return (
    <motion.div
      id={id}
      whileHover={onClick ? { scale: 1.015, y: -2 } : {}}
      transition={{ duration: 0.15 }}
      onClick={onClick}
      className={`bg-white rounded-xl border p-5 shadow-sm flex flex-col justify-between min-h-[140px] relative ${borderClasses} ${
        onClick ? "cursor-pointer hover:shadow-md transition-all group hover:border-blue-200" : ""
      }`}
    >
      {/* Card Header */}
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
            {title}
          </span>
          <h3 className={`text-3xl font-extrabold tabular-nums mt-1 tracking-tight ${valueColor}`}>
            {value}
          </h3>
        </div>
        {Icon && (
          <div className={`p-2.5 rounded-lg ${
            onClick ? "bg-blue-50 text-[#0B2C6B] group-hover:bg-[#0B2C6B] group-hover:text-white" : "bg-gray-50 text-gray-400"
          } transition-colors`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      {/* Breakdown or Description */}
      <div className="mt-4">
        {breakdown ? (
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100">
            {breakdown.map((item, idx) => (
              <div key={idx} className="flex flex-col">
                <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                  {item.label}
                </span>
                <span className={`text-sm font-bold mt-0.5 ${item.color}`}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        ) : (
          description && (
            <p className="text-xs text-gray-400 font-medium tracking-wide flex items-center gap-1.5">
              {statusType === "success" && <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>}
              {statusType === "warning" && <span className="w-2 h-2 rounded-full bg-sky-500 inline-block"></span>}
              {statusType === "info" && <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>}
              {description}
            </p>
          )
        )}
      </div>

      {/* Dynamic Link Badge if Clickable */}
      {onClick && (
        <div className="absolute right-3 bottom-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase tracking-wider">
            View Details →
          </span>
        </div>
      )}
    </motion.div>
  );
}
