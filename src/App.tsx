import React, { useState } from "react";
import Sidebar, { TabType } from "./components/Sidebar";
import Header from "./components/Header";
import Overview from "./pages/Overview";
import OrderPage from "./pages/Order";
import AvailabilityPage from "./pages/Availability";
import ShipmentPage from "./pages/Shipment";
import TikProDashboardMirror from "./components/TikProDashboardMirror";
import { useTikProMirror } from "./hooks/useTikProMirror";

export default function App() {
  // Shared TikPro Live Mirroring Hook
  const { data: tikproData, loading: tikproLoading, error: tikproError, refresh: refreshTikPro } = useTikProMirror();

  // Navigation State
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

  // Get dynamic titles and subtitles for each view
  const headerDetails = {
    overview: {
      title: "IKPP Monitoring Dashboard",
      subtitle: "PT Indah Kiat Pulp & Paper Tbk (IKPP) Partner Overview Cockpit"
    },
    logistik_pro: {
      title: "Dashboard Logistik Pro IKK",
      subtitle: "Live Data Mirroring TikPro IKPP - Live Armada & Status Tracker"
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
      title: "Shipment & GPS Tracking",
      subtitle: "Active pre-trip loading and on-trip container GPS transits"
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
      />

      {/* Main Content Area (Now full width with fluid expansion) */}
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 w-full ${isSidebarOpen ? "md:pl-72" : "pl-0"}`}>
        {/* Shared top header with explicit back button if not on Overview */}
        <Header
          title={headerDetails.title}
          subtitle={headerDetails.subtitle}
          onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
          showBackButton={activeTab !== "overview"}
          onBackClick={() => setActiveTab("overview")}
        />

        {/* Scrollable page body */}
        <main className="p-6 md:p-8 flex-1 overflow-y-auto max-w-none w-full mx-auto">
          {activeTab === "overview" && (
            <Overview onNavigate={handleNavigate} />
          )}

          {activeTab === "logistik_pro" && (
            <TikProDashboardMirror
              data={tikproData}
              loading={tikproLoading}
              error={tikproError}
              onRefresh={refreshTikPro}
            />
          )}

          {activeTab === "order" && (
            <OrderPage
              initialTypeFilter={initialOrderFilter}
              onClearInitialFilter={() => setInitialOrderFilter(undefined)}
            />
          )}

          {activeTab === "availability" && (
            <AvailabilityPage />
          )}

          {activeTab === "shipment" && (
            <ShipmentPage />
          )}
        </main>
      </div>
    </div>
  );
}
