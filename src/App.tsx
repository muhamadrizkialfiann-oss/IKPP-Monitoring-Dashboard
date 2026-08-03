import React, { useState } from "react";
import Sidebar, { TabType } from "./components/Sidebar";
import Header from "./components/Header";
import Overview from "./pages/Overview";
import OrderPage from "./pages/Order";
import AvailabilityPage from "./pages/Availability";
import ShipmentPage from "./pages/Shipment";
import UserApprovalPage from "./pages/UserApprovalPage";
import TikProLiveDashboard from "./components/TikProLiveDashboard";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import { UserAccount } from "./types";

export default function App() {
  // Navigation View State ('landing' | 'login' | 'dashboard')
  const [view, setView] = useState<"landing" | "login" | "dashboard">("login");
  const [initialPortal, setInitialPortal] = useState<"customer" | "internal" | "partner">("internal");

  // Current Logged In User Account
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);

  // Dashboard Active Tab State
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);

  // Filter deep-linking state from Overview cards to Order page
  const [initialOrderFilter, setInitialOrderFilter] = useState<string | undefined>(undefined);

  // Deep-linking navigation handler
  const handleNavigate = (tab: TabType, filterType?: string) => {
    if (tab === "order" && filterType) {
      setInitialOrderFilter(filterType);
    } else {
      setInitialOrderFilter(undefined);
    }
    setActiveTab(tab);
  };

  const handleLoginSuccess = (user: UserAccount | null) => {
    setCurrentUser(user);
    // Default to Overview tab for all logged in accounts
    setActiveTab("overview");
    setView("dashboard");
  };

  const handleSignOut = () => {
    setCurrentUser(null);
    setView("landing");
  };

  const handleOpenLogin = (portal: "customer" | "internal" | "partner" = "customer") => {
    setInitialPortal(portal);
    setView("login");
  };

  // Views handling
  if (view === "landing") {
    return <LandingPage onLogin={handleOpenLogin} />;
  }

  if (view === "login") {
    return (
      <LoginPage
        initialPortal={initialPortal}
        onBackToHome={() => setView("landing")}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  // Get dynamic titles and subtitles for each view
  const headerDetails = {
    overview: {
      title: "IKPP Monitoring Dashboard",
      subtitle: "PT Indah Kiat Pulp & Paper Tbk (IKPP) Partner Overview Cockpit"
    },
    logistik_pro: {
      title: "Dashboard Logistik Pro IKK",
      subtitle: "Live Firestore Realtime Sync - Summary Report, Daftar Armada & Laporan Ritase"
    },
    order: {
      title: "Order Management System",
      subtitle: "Search, filter, and track active container cargo orders"
    },
    availability: {
      title: "Resources & Fleet Availability",
      subtitle: "Track live vehicle statuses, container tier availability, and active drivers"
    },
    shipment: {
      title: "Dashboard - Shipment Tracking",
      subtitle: "Active pre-trip loading and on-trip container GPS transits"
    },
    user_approval: {
      title: "Aktivasi User Aktif & Approval Portal",
      subtitle: "Super Admin Governance - Persetujuan Registrasi & Kelola Hak Akses Login"
    }
  }[activeTab];

  return (
    <div className="min-h-screen bg-gray-50/70 dark:bg-slate-950 text-gray-800 dark:text-slate-100 flex relative overflow-x-hidden transition-colors duration-200">
      {/* Slide-out Navigation Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => handleNavigate(tab)}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onGoToLanding={handleSignOut}
        currentUser={currentUser}
      />

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 w-full ${isSidebarOpen ? "md:pl-72" : "pl-0"}`}>
        {/* Shared top header */}
        <Header
          title={headerDetails.title}
          subtitle={headerDetails.subtitle}
          onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
          showBackButton={activeTab !== "logistik_pro" && activeTab !== "overview"}
          onBackClick={() => setActiveTab("overview")}
          currentUser={currentUser}
        />

        {/* Scrollable page body */}
        <main className="p-4 md:p-6 flex-1 overflow-y-auto max-w-none w-full mx-auto space-y-6">
          {activeTab === "logistik_pro" && (
            <TikProLiveDashboard />
          )}

          {activeTab === "overview" && (
            <Overview onNavigate={handleNavigate} currentUser={currentUser} />
          )}

          {activeTab === "order" && (
            <OrderPage
              initialTypeFilter={initialOrderFilter}
              onClearInitialFilter={() => setInitialOrderFilter(undefined)}
              currentUser={currentUser}
            />
          )}

          {activeTab === "availability" && (
            <AvailabilityPage />
          )}

          {activeTab === "shipment" && (
            <ShipmentPage />
          )}

          {activeTab === "user_approval" && (
            (currentUser?.role === "Super Admin" || currentUser?.email?.toLowerCase() === "digital.solution@pancaran-logistic.id") ? (
              <UserApprovalPage />
            ) : (
              <Overview onNavigate={handleNavigate} />
            )
          )}
        </main>
      </div>
    </div>
  );
}
