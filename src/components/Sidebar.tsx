import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { LayoutDashboard, ClipboardList, Truck, Package, ChevronLeft, ShieldCheck, LogOut } from "lucide-react";
import PANCARAN_LOGO_DATA_URL from "../assets/logo";
import { useTheme } from "../ThemeContext";

export type TabType = "overview" | "logistik_pro" | "order" | "availability" | "shipment";

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ activeTab, setActiveTab, isOpen, onClose }: SidebarProps) {
  const { isDark, toggleTheme } = useTheme();
  const [lang, setLang] = useState<"EN" | "ID">("ID");

  const menuItems = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "order", label: "Order Management", icon: ClipboardList },
    { id: "availability", label: "Resources & Availability", icon: Truck },
    { id: "shipment", label: "Shipment Tracking", icon: Package },
    { id: "logistik_pro", label: "Dashboard Logistik Pro IKK", icon: ShieldCheck },
  ] as const;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay Backdrop - click to close */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.25 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900 z-40 cursor-pointer md:hidden"
          />

          {/* Drawer Container */}
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 35 }}
            className="w-72 bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-100 flex flex-col h-screen fixed left-0 top-0 z-50 border-r border-gray-200 dark:border-slate-800 shadow-2xl transition-colors duration-200"
          >
            {/* Brand Logo Box with Close Button */}
            <div className="bg-white dark:bg-slate-900 p-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between h-20 shrink-0">
              <div className="flex items-center gap-3">
                {/* Official Pancaran Logo from Google Drive */}
                <img 
                  src={PANCARAN_LOGO_DATA_URL} 
                  alt="Pancaran Logo" 
                  className="w-10 h-10 object-contain rounded-xl shadow-md shrink-0 border border-slate-100 dark:border-slate-800"
                  referrerPolicy="no-referrer"
                />
                <div className="flex flex-col text-left">
                  <span className="text-[#0B2C6B] dark:text-sky-400 font-black tracking-wider text-base leading-none">PANCARAN</span>
                  <span className="text-gray-400 dark:text-slate-500 font-extrabold text-[10px] tracking-widest leading-none mt-1">ONE SYSTEM</span>
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                title="Hide Menu"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Menu */}
            <div className="flex-1 py-6 flex flex-col justify-between overflow-y-auto">
              <nav className="space-y-1.5 px-4">
                <div className="px-3 mb-3 text-[10px] uppercase font-black tracking-widest text-gray-400 dark:text-slate-500 opacity-90">
                  Navigation Menu
                </div>
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      id={`sidebar-tab-${item.id}`}
                      onClick={() => {
                        setActiveTab(item.id);
                        if (typeof window !== "undefined" && window.innerWidth < 768) {
                          onClose();
                        }
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all duration-200 cursor-pointer ${
                        isActive
                          ? "bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-300 border-l-4 border-sky-500 shadow-sm translate-x-1"
                          : "text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-slate-100"
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${isActive ? "text-sky-500 dark:text-sky-400" : "text-gray-400 dark:text-slate-400"}`} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>

              {/* Controls & Sign Out Section */}
              <div className="px-5 pt-4 border-t border-gray-100 dark:border-slate-800 mt-auto space-y-3">
                {/* Language Selector EN / ID right above Sign Out */}
                <div className="flex items-center justify-between p-1.5 bg-gray-50 dark:bg-slate-800/60 rounded-2xl border border-gray-100 dark:border-slate-800">
                  <span className="text-xs font-bold text-gray-500 dark:text-slate-400 pl-2">Language</span>
                  <div className="flex items-center bg-gray-200/70 dark:bg-slate-900 rounded-xl p-1 border border-gray-200 dark:border-slate-700">
                    <button
                      onClick={() => setLang("EN")}
                      className={`text-xs font-black px-3 py-1 rounded-lg transition-all cursor-pointer ${
                        lang === "EN"
                          ? "bg-white dark:bg-sky-950 text-[#0B2C6B] dark:text-sky-300 shadow-xs"
                          : "text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200"
                      }`}
                    >
                      EN
                    </button>
                    <button
                      onClick={() => setLang("ID")}
                      className={`text-xs font-black px-3 py-1 rounded-lg transition-all cursor-pointer ${
                        lang === "ID"
                          ? "bg-white dark:bg-sky-950 text-[#0B2C6B] dark:text-sky-300 shadow-xs"
                          : "text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200"
                      }`}
                    >
                      ID
                    </button>
                  </div>
                </div>

                {/* Sign Out Button */}
                <button
                  id="sidebar-sign-out"
                  onClick={() => {
                    console.log("Sign Out clicked");
                  }}
                  className="w-full flex items-center gap-3.5 px-3 py-2.5 text-sm font-bold text-[#7c94b6] dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 transition-colors cursor-pointer group"
                >
                  <LogOut className="w-5 h-5 text-[#7c94b6] dark:text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-colors" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

