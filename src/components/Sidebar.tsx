import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { LayoutDashboard, ClipboardList, Truck, Package, ChevronLeft, ShieldCheck, LogOut } from "lucide-react";

export type TabType = "overview" | "order" | "availability" | "shipment";

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ activeTab, setActiveTab, isOpen, onClose }: SidebarProps) {
  const menuItems = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "order", label: "Order Management", icon: ClipboardList },
    { id: "availability", label: "Resources & Availability", icon: Truck },
    { id: "shipment", label: "Shipment Tracking", icon: Package },
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
            className="w-72 bg-white text-gray-800 flex flex-col h-screen fixed left-0 top-0 z-50 border-r border-gray-200 shadow-2xl"
          >
            {/* Brand Logo Box with Close Button */}
            <div className="bg-white p-4 border-b border-gray-100 flex items-center justify-between h-20 shrink-0">
              <div className="flex items-center gap-3">
                {/* Custom Pancaran One Logo Mark */}
                <svg viewBox="0 0 100 100" className="w-10 h-10 shadow-md rounded-xl overflow-hidden shrink-0">
                  {/* Background is rich deep navy blue */}
                  <rect width="100" height="100" rx="20" fill="#011e41" />
                  {/* Left-bottom cyan overlay split */}
                  <path d="M 0,0 L 48,0 C 44,30 38,70 53,100 L 0,100 Z" fill="#00AEEF" />
                  {/* White stylized letter 'P' stem & diagonal arm */}
                  <path d="M 36,0 L 48,0 C 45,30 40,70 65,100 L 53,100 C 41,70 34,58 0,62 L 0,50 C 22,46 31,25 36,0 Z" fill="#FFFFFF" />
                  {/* White stylized crescent loop */}
                  <path d="M 44,22 C 58,10 78,4 90,4 C 96,4 97,12 95,20 C 92,34 78,54 54,64 C 70,54 82,42 82,30 C 82,20 62,26 44,22 Z" fill="#FFFFFF" />
                </svg>
                <div className="flex flex-col text-left">
                  <span className="text-[#0B2C6B] font-black tracking-wider text-base leading-none">PANCARAN</span>
                  <span className="text-gray-400 font-extrabold text-[10px] tracking-widest leading-none mt-1">ONE SYSTEM</span>
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                title="Hide Menu"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Menu */}
            <div className="flex-1 py-6 flex flex-col justify-between overflow-y-auto">
              <nav className="space-y-1.5 px-4">
                <div className="px-3 mb-3 text-[10px] uppercase font-black tracking-widest text-gray-400 opacity-90">
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
                          ? "bg-sky-50 text-sky-600 border-l-4 border-sky-500 shadow-sm translate-x-1"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${isActive ? "text-sky-500" : "text-gray-400"}`} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>

              {/* Sign Out Button */}
              <div className="px-6 pt-4 border-t border-gray-100 mt-auto">
                <button
                  id="sidebar-sign-out"
                  onClick={() => {
                    console.log("Sign Out clicked");
                  }}
                  className="flex items-center gap-3.5 py-2.5 text-sm font-bold text-[#7c94b6] hover:text-slate-800 transition-colors cursor-pointer group"
                >
                  <LogOut className="w-5 h-5 text-[#7c94b6] group-hover:text-slate-600 transition-colors" />
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

