import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";

interface StreamSegment {
  label: string;
  count: number;
  percentage: number;
  color: string;
  hoverColor: string;
  shadowColor: string;
}

interface ServiceStreamCardProps {
  title: string;
  total: number;
  themeColor: "sky" | "blue" | "emerald";
  segments: StreamSegment[];
}

export default function ServiceStreamCard({ title, total, themeColor, segments }: ServiceStreamCardProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Theme configuration for headers
  const themeStyles = {
    sky: {
      badge: "bg-sky-50 text-sky-700 border border-sky-200/50",
      glow: "group-hover:border-sky-200 group-hover:shadow-sky-500/5",
    },
    blue: {
      badge: "bg-blue-50 text-blue-700 border border-blue-200/50",
      glow: "group-hover:border-blue-200 group-hover:shadow-blue-500/5",
    },
    emerald: {
      badge: "bg-emerald-50 text-emerald-700 border border-emerald-200/50",
      glow: "group-hover:border-emerald-200 group-hover:shadow-emerald-500/5",
    },
  };

  const activeTheme = themeStyles[themeColor];

  return (
    <div 
      className={`bg-white border border-gray-100 rounded-xl p-3.5 flex flex-col justify-between transition-all duration-300 hover:shadow-md hover:border-gray-200 group ${activeTheme.glow}`}
    >
      {/* Title & Total Count Header */}
      <div className="flex justify-between items-center text-[10px] mb-3">
        <span className={`font-black px-2 py-0.5 rounded-md tracking-wider ${activeTheme.badge}`}>
          {title}
        </span>
        <span className="font-extrabold text-gray-700 bg-gray-50 border border-gray-200/40 px-1.5 py-0.5 rounded">
          {total} <span className="text-[8px] text-gray-400 font-bold uppercase">Total</span>
        </span>
      </div>

      {/* Interactive Interactive Segmented Bar */}
      <div className="relative my-2.5">
        <div className="w-full h-3.5 bg-gray-50 border border-gray-200/40 rounded-full flex overflow-hidden p-[2px] relative">
          {segments.map((segment, idx) => {
            if (segment.count === 0) return null;
            const isHovered = hoveredIdx === idx;
            const isAnyHovered = hoveredIdx !== null;

            return (
              <motion.div
                key={idx}
                initial={{ width: 0 }}
                animate={{ width: `${segment.percentage}%` }}
                transition={{ duration: 1.0, delay: idx * 0.08, ease: [0.16, 1, 0.3, 1] }}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                className={`h-full cursor-pointer relative transition-all duration-300 first:rounded-l-full last:rounded-r-full ${segment.color}`}
                style={{
                  opacity: isAnyHovered ? (isHovered ? 1 : 0.4) : 0.95,
                  transform: isHovered ? "scaleY(1.18)" : "scaleY(1)",
                  boxShadow: isHovered ? `0 0 12px ${segment.shadowColor}` : "none",
                  zIndex: isHovered ? 10 : 1,
                }}
              >
                {/* Visual scan effect inside segment */}
                <motion.div
                  initial={{ left: "-100%" }}
                  animate={{ left: "100%" }}
                  transition={{
                    repeat: Infinity,
                    repeatType: "loop",
                    duration: 3.5,
                    delay: idx * 0.4,
                    ease: "linear",
                  }}
                  className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 pointer-events-none"
                />
              </motion.div>
            );
          })}
        </div>

        {/* Float Tooltip */}
        <AnimatePresence>
          {hoveredIdx !== null && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: -42, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="absolute left-1/2 -translate-x-1/2 -top-6 z-20 bg-gray-950 text-white px-3 py-1 rounded-lg text-[9px] font-black shadow-lg border border-gray-800 pointer-events-none flex items-center gap-1.5 whitespace-nowrap"
            >
              <span className={`w-2 h-2 rounded-full ${segments[hoveredIdx].color}`}></span>
              <span className="uppercase text-gray-300">{segments[hoveredIdx].label}:</span>
              <span className="text-cyan-300 font-mono font-bold">
                {segments[hoveredIdx].count} units ({segments[hoveredIdx].percentage}%)
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Legend Block containing larger high-contrast metrics underneath */}
      <div className="grid grid-cols-3 gap-1 text-center mt-1 pt-2 border-t border-gray-100/60">
        {segments.map((segment, idx) => {
          const isHovered = hoveredIdx === idx;
          const isAnyHovered = hoveredIdx !== null;

          return (
            <div 
              key={idx}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              className="flex flex-col items-center justify-center p-1 rounded-lg cursor-pointer transition-all duration-200"
              style={{
                backgroundColor: isHovered ? `${segment.shadowColor}0d` : "transparent",
                transform: isHovered ? "translateY(-1px)" : "none",
                opacity: isAnyHovered ? (isHovered ? 1 : 0.6) : 1,
              }}
            >
              <div className="flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${segment.color}`}></span>
                <span className="text-[8px] text-gray-500 font-black uppercase tracking-wider">{segment.label}</span>
              </div>
              <span className="text-xs font-black text-gray-900 mt-0.5 tabular-nums leading-none">
                {segment.count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
