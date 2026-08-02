import React from "react";
import { Bell, Shield, Menu, ArrowLeft, UserCheck } from "lucide-react";
import { useTheme } from "../ThemeContext";
import { UserAccount } from "../types";

interface HeaderProps {
  title: string;
  subtitle?: string;
  onMenuClick: () => void;
  showBackButton?: boolean;
  onBackClick?: () => void;
  currentUser?: UserAccount | null;
}

export default function Header({ title, subtitle, onMenuClick, showBackButton, onBackClick, currentUser }: HeaderProps) {
  const isSuperAdmin = currentUser?.role === "Super Admin" || currentUser?.email.toLowerCase() === "digital.solution@pancaran-logistic.id";

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 h-16 md:h-20 px-3 md:px-6 flex items-center justify-between sticky top-0 z-10 shadow-sm transition-colors duration-200">
      {/* Title & Subtitle + Sidebar Toggle */}
      <div className="flex items-center gap-2 md:gap-4 min-w-0">
        {/* Sleek, futuristic pulsing Menu Toggle Button */}
        <button
          onClick={onMenuClick}
          className="group flex items-center justify-center p-2 md:p-2.5 bg-sky-50 dark:bg-slate-800 text-[#0B2C6B] dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-slate-700 hover:text-[#00AEEF] border border-sky-200/60 dark:border-slate-700 rounded-xl transition-all duration-300 shadow-sm hover:shadow-md cursor-pointer relative shrink-0"
          title="Open Dashboard Navigation"
        >
          <Menu className="w-4 h-4 md:w-5 md:h-5 transition-transform group-hover:scale-110" />
          {/* Subtle neon indicator dot */}
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 md:w-2.5 md:h-2.5 bg-[#00AEEF] rounded-full border-2 border-white dark:border-slate-900 animate-pulse"></span>
        </button>

        {showBackButton && onBackClick && (
          <button
            id="header-back-button"
            onClick={onBackClick}
            className="flex items-center gap-1 px-2.5 py-1.5 md:px-3.5 md:py-2 bg-[#0B2C6B] dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white border border-slate-900 dark:border-slate-700 rounded-xl transition-all duration-200 shadow-sm font-bold text-[10px] md:text-xs cursor-pointer uppercase tracking-wider shrink-0"
            title="Back to Dashboard Overview"
          >
            <ArrowLeft className="w-3.5 h-3.5 md:w-4 md:h-4 text-white" />
            <span className="hidden sm:inline">Back</span>
          </button>
        )}

        <div className="min-w-0">
          <h1 className="text-sm sm:text-base md:text-xl lg:text-2xl font-extrabold text-[#031B4E] dark:text-slate-100 tracking-tight flex items-center gap-1.5 truncate">
            <span className="truncate">{title}</span>
            <span className="text-[9px] md:text-xs bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 font-bold px-2 py-0.5 rounded-full border border-sky-200 dark:border-sky-800 hidden sm:inline-block shrink-0">
              IKPP Partner Portal
            </span>
          </h1>
          <p className="text-[10px] md:text-xs text-[#4F6C95] dark:text-slate-400 font-medium tracking-wide mt-0.5 truncate hidden xs:block">
            {subtitle || "Pancaran Inland Group Management System"}
          </p>
        </div>
      </div>

      {/* Right side controls */}
      <div className="flex items-center gap-2 md:gap-3 lg:gap-5 shrink-0">
        {/* PT Indah Kiat Pulp & Paper (IKPP) Branding - Exact Logo */}
        <div className="hidden lg:flex items-center gap-3.5 border-r border-gray-200 dark:border-slate-800 pr-4">
          <div className="flex items-center gap-3 bg-white dark:bg-slate-800 px-2.5 py-1.5 rounded-xl border border-gray-100 dark:border-slate-700 shadow-xs">
            {/* Left red icon with accurate white split circular waves */}
            <svg 
              viewBox="0 0 100 100" 
              className="w-10 h-10 shrink-0 shadow-sm rounded-xl"
              shapeRendering="geometricPrecision"
              textRendering="geometricPrecision"
            >
              <rect width="100" height="100" rx="22" fill="#E1251B" />
              
              <g fill="white">
                <path d="M 14,50 A 36,36 0 0,1 86,50 A 33,33 0 0,0 20,50 Z" />
                <path d="M 26,50 A 30,30 0 0,1 86,50 A 27,27 0 0,0 32,50 Z" />
                <path d="M 38,50 A 24,24 0 0,1 86,50 A 21,21 0 0,0 44,50 Z" />
                <path d="M 50,50 A 18,18 0 0,1 86,50 A 15,15 0 0,0 56,50 Z" />
              </g>

              <g fill="white" transform="rotate(180, 50, 50)">
                <path d="M 14,50 A 36,36 0 0,1 86,50 A 33,33 0 0,0 20,50 Z" />
                <path d="M 26,50 A 30,30 0 0,1 86,50 A 27,27 0 0,0 32,50 Z" />
                <path d="M 38,50 A 24,24 0 0,1 86,50 A 21,21 0 0,0 44,50 Z" />
                <path d="M 50,50 A 18,18 0 0,1 86,50 A 15,15 0 0,0 56,50 Z" />
              </g>

              <line x1="14" y1="50" x2="86" y2="50" stroke="#E1251B" strokeWidth="2.5" />
            </svg>

            <div className="flex flex-col text-left shrink-0 justify-center">
              <span className="text-[#031B4E] dark:text-slate-100 font-extrabold text-xs tracking-wider leading-none uppercase">
                indah kiat
              </span>
              <span className="text-gray-500 dark:text-slate-400 font-extrabold text-[8px] leading-none tracking-widest mt-1 uppercase">
                pulp & paper
              </span>
            </div>
          </div>
        </div>

        {/* User Profile Info */}
        <div className="flex items-center gap-2 md:gap-3 pl-1 md:pl-2">
          <div className={`w-8 h-8 md:w-9 md:h-9 rounded-xl flex items-center justify-center text-white text-xs md:text-sm font-black border-2 shadow shrink-0 ${
            isSuperAdmin 
              ? "bg-purple-600 border-purple-400"
              : currentUser?.role === "Internal CS"
              ? "bg-sky-600 border-sky-400"
              : "bg-[#0B2C6B] border-[#00AEEF]"
          }`}>
            {currentUser?.fullName ? currentUser.fullName.charAt(0).toUpperCase() : "U"}
          </div>
          <div className="hidden md:flex flex-col text-left">
            <span className="text-xs font-black text-gray-900 dark:text-slate-100 truncate max-w-[150px]">
              {currentUser?.fullName || "Pancaran Staff"}
            </span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
              <Shield className="w-3 h-3 text-emerald-500 shrink-0" />
              <span>{currentUser?.role || "Authorized"}</span>
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
