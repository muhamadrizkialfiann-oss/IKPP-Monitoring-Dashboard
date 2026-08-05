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
  themeColor: "sky" | "blue" | "emerald" | "amber" | "teal" | "purple";
  segments: StreamSegment[];
}

export default function ServiceStreamCard({ title, total, themeColor, segments }: ServiceStreamCardProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Theme configuration for headers
  const themeStyles = {
    sky: {
      badge: "bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border border-sky-200/60 dark:border-sky-800/60",
      glow: "group-hover:border-sky-300 dark:group-hover:border-sky-700 group-hover:shadow-sky-500/5",
    },
    blue: {
      badge: "bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60",
      glow: "group-hover:border-blue-300 dark:group-hover:border-blue-700 group-hover:shadow-blue-500/5",
    },
    emerald: {
      badge: "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60",
      glow: "group-hover:border-emerald-300 dark:group-hover:border-emerald-700 group-hover:shadow-emerald-500/5",
    },
    amber: {
      badge: "bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60",
      glow: "group-hover:border-amber-300 dark:group-hover:border-amber-700 group-hover:shadow-amber-500/5",
    },
    teal: {
      badge: "bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-200/60 dark:border-teal-800/60",
      glow: "group-hover:border-teal-300 dark:group-hover:border-teal-700 group-hover:shadow-teal-500/5",
    },
    purple: {
      badge: "bg-purple-50 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/60",
      glow: "group-hover:border-purple-300 dark:group-hover:border-purple-700 group-hover:shadow-purple-500/5",
    },
  };

  const activeTheme = themeStyles[themeColor];

  // Check if all segments are 0 or total is 0
  const isZeroTotal = total === 0 || segments.every((s) => s.count === 0);

  return (
    <div 
      className={`bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-3.5 flex flex-col justify-between transition-all duration-300 hover:shadow-md dark:hover:shadow-slate-950/50 group ${activeTheme.glow}`}
    >
      {/* Title & Total Count Header */}
      <div className="flex justify-between items-center text-[10px] mb-3">
        <span className={`font-black px-2.5 py-1 rounded-lg tracking-wider text-[10px] uppercase shadow-2xs ${activeTheme.badge}`}>
          {title}
        </span>
        <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-slate-800 border border-gray-200/80 dark:border-slate-700/80 px-2.5 py-1 rounded-lg">
          <span className="font-black text-xs md:text-sm text-gray-900 dark:text-slate-100 tabular-nums">{total}</span>
          <span className="text-[8px] font-extrabold text-gray-400 dark:text-slate-400 uppercase tracking-wider">TOTAL</span>
        </div>
      </div>

      {/* Interactive Segmented Progress Bar */}
      <div className="relative my-2">
        <div className="w-full h-3 bg-gray-100 dark:bg-slate-800/80 border border-gray-200/50 dark:border-slate-700/50 rounded-full flex overflow-hidden p-[2px] relative">
          {isZeroTotal ? (
            <div className="w-full h-full bg-gray-200/60 dark:bg-slate-700/50 rounded-full" />
          ) : (
            segments.map((segment, idx) => {
              if (segment.count === 0) return null;
              const isHovered = hoveredIdx === idx;
              const isAnyHovered = hoveredIdx !== null;

              return (
                <motion.div
                  key={idx}
                  initial={{ width: 0 }}
                  animate={{ width: `${segment.percentage}%` }}
                  transition={{ duration: 0.8, delay: idx * 0.06, ease: [0.16, 1, 0.3, 1] }}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  className={`h-full cursor-pointer relative transition-all duration-200 first:rounded-l-full last:rounded-r-full ${segment.color}`}
                  style={{
                    opacity: isAnyHovered ? (isHovered ? 1 : 0.4) : 0.95,
                    transform: isHovered ? "scaleY(1.15)" : "scaleY(1)",
                    boxShadow: isHovered ? `0 0 10px ${segment.shadowColor}` : "none",
                    zIndex: isHovered ? 10 : 1,
                  }}
                >
                  {/* Subtle glossy scan line */}
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
                    className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/25 to-transparent -skew-x-12 pointer-events-none"
                  />
                </motion.div>
              );
            })
          )}
        </div>

        {/* Float Tooltip */}
        <AnimatePresence>
          {hoveredIdx !== null && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: -40, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="absolute left-1/2 -translate-x-1/2 -top-6 z-20 bg-gray-950 text-white px-2.5 py-1 rounded-lg text-[9px] font-black shadow-lg border border-gray-800 pointer-events-none flex items-center gap-1.5 whitespace-nowrap"
            >
              <span className={`w-2 h-2 rounded-full ${segments[hoveredIdx].color}`}></span>
              <span className="uppercase text-gray-300">{segments[hoveredIdx].label}:</span>
              <span className="text-cyan-300 font-mono font-bold">
                {segments[hoveredIdx].count} ({segments[hoveredIdx].percentage}%)
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Legend Block containing status metrics underneath */}
      <div className="grid grid-cols-3 gap-y-2 gap-x-1 text-center mt-1 pt-2.5 border-t border-gray-100 dark:border-slate-800/80">
        {segments.map((segment, idx) => {
          const isHovered = hoveredIdx === idx;
          const isAnyHovered = hoveredIdx !== null;

          return (
            <div 
              key={idx}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              className="flex flex-col items-center justify-center p-0.5 rounded-lg cursor-pointer transition-all duration-200"
              style={{
                backgroundColor: isHovered ? `${segment.shadowColor}12` : "transparent",
                transform: isHovered ? "translateY(-1px)" : "none",
                opacity: isAnyHovered ? (isHovered ? 1 : 0.5) : 1,
              }}
            >
              <div className="flex items-center gap-1 min-w-0">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${segment.color}`}></span>
                <span className="text-[8px] text-gray-500 dark:text-slate-400 font-extrabold uppercase tracking-tight truncate max-w-[55px] sm:max-w-none">
                  {segment.label}
                </span>
              </div>
              <span className="text-xs md:text-sm font-black text-gray-900 dark:text-slate-100 mt-0.5 tabular-nums leading-tight">
                {segment.count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

