import React, { useMemo, useState, useEffect } from "react";
import { motion } from "motion/react";
import { Truck, ClipboardList, ShieldCheck, BarChart3, FileSpreadsheet } from "lucide-react";
import TripStepper from "../components/TripStepper";
import StackedBarChart from "../components/StackedBarChart";
import BarChart from "../components/BarChart";
import ServiceStreamCard from "../components/ServiceStreamCard";
import { useFirebaseRealtime } from "../hooks/useFirebaseRealtime";
import { TabType } from "../components/Sidebar";
import { Order } from "../types";
import { fetchLiveOrdersClient } from "../lib/fetchOrdersClient";

interface OverviewProps {
  onNavigate: (tab: TabType, filterType?: string) => void;
}

export default function Overview({ onNavigate }: OverviewProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const { trucks } = useFirebaseRealtime();

  // Real-time live auto-connection to Google Sheets with Vercel client fallback support
  useEffect(() => {
    let isMounted = true;
    const fetchOrders = async () => {
      try {
        const liveOrders = await fetchLiveOrdersClient();
        if (isMounted && Array.isArray(liveOrders) && liveOrders.length > 0) {
          setOrders(liveOrders);
        }
      } catch (err) {
        // Silent catch during background syncs
      }
    };

    fetchOrders();
    const interval = setInterval(fetchOrders, 10000); // Live real-time sync every 10s
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Fleet stats derived directly from Firestore live data (mirroring Availability page)
  const fleetStats = useMemo(() => {
    if (!trucks || trucks.length === 0) {
      return {
        total: 46,
        available: 36,
        utilized: 8,
        standby: 36,
        downtime: 2,
        availablePct: 78,
        utilizedPct: 17,
        standbyPct: 78,
        downtimePct: 4
      };
    }

    const total = trucks.length;
    let standby = 0;
    let downtime = 0;
    let utilized = 0;

    trucks.forEach((t) => {
      const uStatus = (t.status || "").toUpperCase();
      if (uStatus === "TERSEDIA" || uStatus.includes("STANDBY") || uStatus.includes("READY")) {
        standby++;
      } else {
        utilized++;
        if (uStatus.includes("STORING") || uStatus.includes("LAKA") || uStatus.includes("DOWNTIME") || uStatus.includes("BENGKEL")) {
          downtime++;
        }
      }
    });

    const available = standby;

    return {
      total,
      available,
      utilized,
      standby,
      downtime,
      availablePct: total > 0 ? Math.round((available / total) * 100) : 0,
      utilizedPct: total > 0 ? Math.round((utilized / total) * 100) : 0,
      standbyPct: total > 0 ? Math.round((standby / total) * 100) : 0,
      downtimePct: total > 0 ? Math.round((downtime / total) * 100) : 0
    };
  }, [trucks]);

  // Compute live Order Metrics from spreadsheet
  const orderStats = useMemo(() => {
    const total = orders.length;
    const open = orders.filter((o) => o.status === "open").length;
    const inProgress = orders.filter((o) => o.status === "in_progress").length;
    const done = orders.filter((o) => o.status === "done").length;
    const cancel = orders.filter((o) => o.status === "cancel").length;
    const activeTotal = open + inProgress + done;

    const ekspor = orders.filter((o) => o.type === "ekspor");
    const impor = orders.filter((o) => o.type === "impor");
    const repo = orders.filter((o) => o.type === "repo");

    const getBreakdown = (list: Order[]) => {
      const listTotal = list.length || 1;
      const op = list.filter((o) => o.status === "open").length;
      const tr = list.filter((o) => o.status === "in_progress").length;
      const dn = list.filter((o) => o.status === "done").length;
      return {
        total: list.length,
        open: op,
        transit: tr,
        done: dn,
        segments: [
          { label: "open", count: op, percentage: Math.round((op / listTotal) * 100), color: "bg-sky-500", hoverColor: "bg-sky-400", shadowColor: "#0ea5e9" },
          { label: "transit", count: tr, percentage: Math.round((tr / listTotal) * 100), color: "bg-blue-600", hoverColor: "bg-blue-500", shadowColor: "#2563eb" },
          { label: "done", count: dn, percentage: Math.round((dn / listTotal) * 100), color: "bg-emerald-500", hoverColor: "bg-emerald-400", shadowColor: "#10b981" },
        ]
      };
    };

    return {
      total,
      activeTotal,
      cancel,
      open,
      inProgress,
      done,
      ekspor: getBreakdown(ekspor),
      impor: getBreakdown(impor),
      repo: getBreakdown(repo),
      eksporCount: ekspor.length,
      imporCount: impor.length,
      repoCount: repo.length
    };
  }, [orders]);

  // Compute Live Shipment Stats derived from the QUANTITY column of each order row
  const shipmentStats = useMemo(() => {
    const total = orders.reduce((sum, o) => sum + (o.quantity || 1), 0);
    const preTrip = orders
      .filter((o) => o.status === "open")
      .reduce((sum, o) => sum + (o.quantity || 1), 0);
    const onTrip = orders
      .filter((o) => o.status === "in_progress")
      .reduce((sum, o) => sum + (o.quantity || 1), 0);
    const endTrip = orders
      .filter((o) => o.status === "done")
      .reduce((sum, o) => sum + (o.quantity || 1), 0);
    const cancel = orders
      .filter((o) => o.status === "cancel")
      .reduce((sum, o) => sum + (o.quantity || 1), 0);
    const activeTotal = preTrip + onTrip + endTrip;

    const preTripPct = activeTotal > 0 ? Math.round((preTrip / activeTotal) * 100) : 0;
    const onTripPct = activeTotal > 0 ? Math.round((onTrip / activeTotal) * 100) : 0;
    const endTripPct = activeTotal > 0 ? Math.round((endTrip / activeTotal) * 100) : 0;

    return {
      total,
      activeTotal,
      cancel,
      preTrip,
      onTrip,
      endTrip,
      preTripPct,
      onTripPct,
      endTripPct
    };
  }, [orders]);

  const totalOrders = orderStats.total;

  // Stacked bar segments for Order Types
  const orderTypeSegments = [
    { label: "Ekspor", count: orderStats.eksporCount, percentage: totalOrders ? Math.round((orderStats.eksporCount / totalOrders) * 100) : 0, color: "bg-sky-500" },
    { label: "Impor", count: orderStats.imporCount, percentage: totalOrders ? Math.round((orderStats.imporCount / totalOrders) * 100) : 0, color: "bg-blue-600" },
    { label: "Repo", count: orderStats.repoCount, percentage: totalOrders ? Math.round((orderStats.repoCount / totalOrders) * 100) : 0, color: "bg-emerald-500" }
  ];

  const orderDistributionData = [
    { name: "Ekspor", value: orderStats.eksporCount, color: "#0EA5E9" },   // sky-500
    { name: "Impor", value: orderStats.imporCount, color: "#2563EB" },    // blue-600
    { name: "Repo", value: orderStats.repoCount, color: "#10B981" }      // emerald-500
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3 }}
      className="space-y-5 pb-8"
    >
      {/* Top Welcome & KPI row - Styled in clean white with deep contrast gray text */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 bg-white dark:bg-slate-900 p-5 rounded-2xl text-gray-900 dark:text-slate-100 shadow-sm relative overflow-hidden border border-gray-200 dark:border-slate-800 transition-colors duration-200">
        <div className="z-10 flex flex-wrap items-center justify-between w-full gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2 text-gray-900 dark:text-slate-100">
              Welcome to Pancaran One Dashboard
            </h2>
            <p className="text-gray-500 dark:text-slate-400 text-[11px] sm:text-xs font-semibold mt-1">
              Real-time monitoring of fleet allocation, container orders, and client shipments for PT Indah Kiat Pulp & Paper Tbk (IKPP).
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-3.5 py-2 rounded-xl border border-emerald-200 dark:border-emerald-800 shrink-0 shadow-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Google Sheet Live Connected</span>
          </div>
        </div>

        {/* Background decorative vector details */}
        <div className="absolute -right-16 -top-16 w-48 h-48 bg-gray-50 dark:bg-slate-800/40 rounded-full blur-2xl"></div>
        <div className="absolute -left-10 -bottom-10 w-36 h-36 bg-gray-50 dark:bg-slate-800/40 rounded-full blur-xl"></div>
      </div>

      {/* Grid of 4 Widget Boxes (Bento Dashboard Grid) - now perfectly equal & aligned */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
        
        {/* BOX 1: FLEET AVAILABILITY SUMMARY */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-5 shadow-sm flex flex-col justify-between space-y-5 transition-colors duration-200 h-full">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-50 dark:bg-slate-800 rounded-lg text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-slate-700 shadow-xs">
                <Truck className="w-4.5 h-4.5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-gray-900 dark:text-slate-100 leading-tight">Fleet Availability Summary</h4>
                <p className="text-[10px] text-gray-400 dark:text-slate-400 font-semibold">Active fleet dispatch readiness status</p>
              </div>
            </div>
            <button
              onClick={() => onNavigate("availability")}
              className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-slate-800 hover:bg-emerald-100/75 dark:hover:bg-slate-700 border border-emerald-100 dark:border-slate-700 px-3 py-1.5 rounded-lg transition-all shadow-xs cursor-pointer"
            >
              Manage Fleet →
            </button>
          </div>

          <div className="flex-1 flex flex-col justify-between space-y-4">
            {/* 5 Stat Cards Highlighted - Equal height & alignment */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
              {/* Total Fleet */}
              <div className="bg-slate-50/60 dark:bg-slate-800/60 border-l-4 border-l-slate-400 border border-slate-200/80 dark:border-slate-700 p-3 rounded-xl flex flex-col justify-center min-h-[84px] transition-all hover:shadow-md hover:scale-[1.015]">
                <span className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight leading-none">{fleetStats.total}</span>
                <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1.5 leading-none block">Total Fleet</span>
                <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold mt-1 block leading-none">Registered Units</span>
              </div>
              
              {/* Available Fleet */}
              <div className="bg-emerald-50/25 dark:bg-emerald-950/20 border-l-4 border-l-emerald-500 border border-emerald-200/60 dark:border-emerald-800/40 p-3 rounded-xl flex flex-col justify-center min-h-[84px] transition-all hover:shadow-md hover:scale-[1.015]">
                <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight leading-none">{fleetStats.available}</span>
                <span className="text-[10px] font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-wider mt-1.5 leading-none block">Available</span>
                <span className="text-[9px] text-emerald-500 dark:text-emerald-400 font-bold mt-1 block leading-none">Util + Stdb ({fleetStats.availablePct}%)</span>
              </div>

              {/* Utilized Fleet */}
              <div className="bg-blue-50/25 dark:bg-blue-950/20 border-l-4 border-l-blue-500 border border-blue-200/60 dark:border-blue-800/40 p-3 rounded-xl flex flex-col justify-center min-h-[84px] transition-all hover:shadow-md hover:scale-[1.015]">
                <span className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400 tracking-tight leading-none">{fleetStats.utilized}</span>
                <span className="text-[10px] font-black text-blue-800 dark:text-blue-300 uppercase tracking-wider mt-1.5 leading-none block">Utilized</span>
                <span className="text-[9px] text-blue-500 dark:text-blue-400 font-bold mt-1 block leading-none">{fleetStats.utilizedPct}% Active</span>
              </div>

              {/* Standby Fleet */}
              <div className="bg-sky-50/25 dark:bg-sky-950/20 border-l-4 border-l-sky-400 border border-sky-200/60 dark:border-sky-800/40 p-3 rounded-xl flex flex-col justify-center min-h-[84px] transition-all hover:shadow-md hover:scale-[1.015]">
                <span className="text-2xl sm:text-3xl font-black text-sky-600 dark:text-sky-400 tracking-tight leading-none">{fleetStats.standby}</span>
                <span className="text-[10px] font-black text-sky-800 dark:text-sky-300 uppercase tracking-wider mt-1.5 leading-none block">Standby</span>
                <span className="text-[9px] text-sky-500 dark:text-sky-400 font-bold mt-1 block leading-none">{fleetStats.standbyPct}% Ready</span>
              </div>

              {/* Downtime Fleet */}
              <div className="bg-rose-50/25 dark:bg-rose-950/20 border-l-4 border-l-rose-500 border border-rose-200/60 dark:border-rose-800/40 p-3 rounded-xl flex flex-col justify-center min-h-[84px] transition-all hover:shadow-md hover:scale-[1.015]">
                <span className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400 tracking-tight leading-none">{fleetStats.downtime}</span>
                <span className="text-[10px] font-black text-rose-800 dark:text-rose-300 uppercase tracking-wider mt-1.5 leading-none block">Downtime</span>
                <span className="text-[9px] text-rose-500 dark:text-rose-400 font-bold mt-1 block leading-none">{fleetStats.downtimePct}% Service</span>
              </div>
            </div>

            {/* Allocation Ratio Diagram directly underneath */}
            <div className="bg-gray-50/40 dark:bg-slate-800/40 border border-gray-100 dark:border-slate-800 p-3 rounded-xl flex-1 flex flex-col justify-center">
              <span className="text-[9px] text-gray-400 dark:text-slate-400 font-extrabold uppercase tracking-wider block mb-2">Fleet Allocation Ratio Diagram</span>
              <div className="min-h-0 flex items-center justify-center">
                <BarChart
                  data={[
                    { name: "Utilized", value: fleetStats.utilized, color: "#3B82F6" },
                    { name: "Standby", value: fleetStats.standby, color: "#0EA5E9" },
                    { name: "Downtime", value: fleetStats.downtime, color: "#F43F5E" }
                  ]}
                  totalValue={fleetStats.total}
                />
              </div>
            </div>
          </div>
        </div>

        {/* BOX 2: ORDER MANAGEMENT & SERVICE STREAMS */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-5 shadow-sm flex flex-col justify-between space-y-5 transition-colors duration-200 h-full">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-50 dark:bg-slate-800 rounded-lg text-blue-600 dark:text-sky-400 border border-blue-100 dark:border-slate-700 shadow-xs">
                <ClipboardList className="w-4.5 h-4.5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-gray-900 dark:text-slate-100 leading-tight">Order Management & Service Streams</h4>
                <p className="text-[10px] text-gray-400 dark:text-slate-400 font-semibold">Load assignments and active channels</p>
              </div>
            </div>
            <button
              onClick={() => onNavigate("order")}
              className="text-[10px] font-bold text-blue-600 dark:text-sky-400 bg-blue-50 dark:bg-slate-800 hover:bg-blue-100/75 dark:hover:bg-slate-700 border border-blue-100 dark:border-slate-700 px-3 py-1.5 rounded-lg transition-all shadow-xs cursor-pointer"
            >
              Explore Orders →
            </button>
          </div>

          <div className="flex-1 flex flex-col justify-between space-y-4">
            {/* 4 Stat Cards Highlighted - Equal height & alignment */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {/* Total Order */}
              <div
                onClick={() => onNavigate("order")}
                className="bg-slate-50/60 dark:bg-slate-800/60 border-l-4 border-l-slate-500 border border-slate-200/80 dark:border-slate-700 p-3 rounded-xl flex flex-col justify-center min-h-[84px] transition-all hover:shadow-md hover:scale-[1.015] cursor-pointer"
              >
                <div>
                  <span className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight leading-none">
                    {orderStats.total}
                  </span>
                  <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1.5 leading-none block">
                    Total Order
                  </span>
                  <span className="text-[9px] text-rose-600 dark:text-rose-400 font-bold mt-1 block leading-none">
                    Detail Cancel: {orderStats.cancel} Cancel
                  </span>
                </div>
              </div>
              
              {/* Open Queue */}
              <div className="bg-amber-50/25 dark:bg-amber-950/20 border-l-4 border-l-amber-500 border border-amber-200/60 dark:border-amber-800/40 p-3 rounded-xl flex flex-col justify-center min-h-[84px] transition-all hover:shadow-md hover:scale-[1.015]">
                <span className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 tracking-tight leading-none">{orderStats.open}</span>
                <span className="text-[10px] font-black text-amber-800 dark:text-amber-300 uppercase tracking-wider mt-1.5 leading-none block">Open Queue</span>
                <span className="text-[9px] text-amber-500 dark:text-amber-400 font-bold mt-1 block leading-none">Awaiting Dispatch</span>
              </div>

              {/* In Progress */}
              <div className="bg-blue-50/25 dark:bg-blue-950/20 border-l-4 border-l-blue-500 border border-blue-200/60 dark:border-blue-800/40 p-3 rounded-xl flex flex-col justify-center min-h-[84px] transition-all hover:shadow-md hover:scale-[1.015]">
                <span className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400 tracking-tight leading-none">{orderStats.inProgress}</span>
                <span className="text-[10px] font-black text-blue-800 dark:text-blue-300 uppercase tracking-wider mt-1.5 leading-none block">In Transit</span>
                <span className="text-[9px] text-blue-500 dark:text-blue-400 font-bold mt-1 block leading-none">On the Road</span>
              </div>

              {/* Completed */}
              <div className="bg-emerald-50/25 dark:bg-emerald-950/20 border-l-4 border-l-emerald-500 border border-emerald-200/60 dark:border-emerald-800/40 p-3 rounded-xl flex flex-col justify-center min-h-[84px] transition-all hover:shadow-md hover:scale-[1.015]">
                <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight leading-none">{orderStats.done}</span>
                <span className="text-[10px] font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-wider mt-1.5 leading-none block">Completed</span>
                <span className="text-[9px] text-emerald-500 dark:text-emerald-400 font-bold mt-1 block leading-none">Arrived Safely</span>
              </div>
            </div>

            {/* Service Streams Progress Breakdown */}
            <div className="bg-gray-50/40 dark:bg-slate-800/40 border border-gray-100 dark:border-slate-800 p-3 rounded-xl flex-1 flex flex-col justify-center">
              <span className="text-[9px] text-gray-400 dark:text-slate-400 font-extrabold uppercase tracking-wider block mb-2.5">
                Service Streams Progress Breakdown
              </span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <ServiceStreamCard
                  title="EKSPOR SERVICE"
                  total={orderStats.ekspor.total}
                  themeColor="sky"
                  segments={orderStats.ekspor.segments}
                />

                <ServiceStreamCard
                  title="IMPOR SERVICE"
                  total={orderStats.impor.total}
                  themeColor="blue"
                  segments={orderStats.impor.segments}
                />

                <ServiceStreamCard
                  title="REPO SERVICE"
                  total={orderStats.repo.total}
                  themeColor="emerald"
                  segments={orderStats.repo.segments}
                />
              </div>
            </div>
          </div>
        </div>

        {/* BOX 3: SHIPMENT TRACKING & PIPELINE */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-5 shadow-sm flex flex-col justify-between space-y-5 transition-colors duration-200 h-full">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-50 dark:bg-slate-800 rounded-lg text-[#0B2C6B] dark:text-sky-400 border border-blue-100 dark:border-slate-700 shadow-xs">
                <ShieldCheck className="w-4.5 h-4.5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-gray-900 dark:text-slate-100 leading-tight">Shipment Tracking & Pipeline</h4>
                <p className="text-[10px] text-gray-400 dark:text-slate-400 font-semibold">Active pre-trip & transit GPS status checkpoints</p>
              </div>
            </div>
            <button
              onClick={() => onNavigate("shipment")}
              className="text-[10px] font-bold text-[#0B2C6B] dark:text-sky-400 bg-blue-50 dark:bg-slate-800 hover:bg-blue-100/75 dark:hover:bg-slate-700 border border-blue-100 dark:border-slate-700 px-3 py-1.5 rounded-lg transition-all shadow-xs cursor-pointer"
            >
              Track Shipments →
            </button>
          </div>

          <div className="flex-1 flex flex-col justify-between space-y-4">
            {/* 4 Stat Cards Highlighted - Equal height & alignment */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {/* Total Shipment */}
              <div
                onClick={() => onNavigate("shipment")}
                className="bg-slate-50/60 dark:bg-slate-800/60 border-l-4 border-l-slate-500 border border-slate-200/80 dark:border-slate-700 p-3 rounded-xl flex flex-col justify-center min-h-[84px] transition-all hover:shadow-md hover:scale-[1.015] cursor-pointer"
              >
                <div>
                  <span className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight leading-none">
                    {shipmentStats.total}
                  </span>
                  <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1.5 leading-none block">
                    Total Shipment
                  </span>
                  <span className="text-[9px] text-rose-600 dark:text-rose-400 font-bold mt-1 block leading-none">
                    Detail Cancel: {shipmentStats.cancel} Trip
                  </span>
                </div>
              </div>
              
              {/* Pre-Trip */}
              <div className="bg-amber-50/25 dark:bg-amber-950/20 border-l-4 border-l-amber-500 border border-amber-200/60 dark:border-amber-800/40 p-3 rounded-xl flex flex-col justify-center min-h-[84px] transition-all hover:shadow-md hover:scale-[1.015]">
                <span className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 tracking-tight leading-none">{shipmentStats.preTrip}</span>
                <span className="text-[10px] font-black text-amber-800 dark:text-amber-300 uppercase tracking-wider mt-1.5 leading-none block">Pre-Trip</span>
                <span className="text-[9px] text-amber-500 dark:text-amber-400 font-bold mt-1 block leading-none">Preparation ({shipmentStats.preTripPct}%)</span>
              </div>

              {/* On Trip */}
              <div className="bg-blue-50/25 dark:bg-blue-950/20 border-l-4 border-l-blue-500 border border-blue-200/60 dark:border-blue-800/40 p-3 rounded-xl flex flex-col justify-center min-h-[84px] transition-all hover:shadow-md hover:scale-[1.015]">
                <span className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400 tracking-tight leading-none">{shipmentStats.onTrip}</span>
                <span className="text-[10px] font-black text-blue-800 dark:text-blue-300 uppercase tracking-wider mt-1.5 leading-none block">On Trip</span>
                <span className="text-[9px] text-blue-500 dark:text-blue-400 font-bold mt-1 block leading-none">On Road ({shipmentStats.onTripPct}%)</span>
              </div>

              {/* End Trip */}
              <div className="bg-emerald-50/25 dark:bg-emerald-950/20 border-l-4 border-l-emerald-500 border border-emerald-200/60 dark:border-emerald-800/40 p-3 rounded-xl flex flex-col justify-center min-h-[84px] transition-all hover:shadow-md hover:scale-[1.015]">
                <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight leading-none">{shipmentStats.endTrip}</span>
                <span className="text-[10px] font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-wider mt-1.5 leading-none block">End Trip</span>
                <span className="text-[9px] text-emerald-500 dark:text-emerald-400 font-bold mt-1 block leading-none">Unloaded ({shipmentStats.endTripPct}%)</span>
              </div>
            </div>

            {/* Shipment Pipeline Status Stepper underneath */}
            <div className="bg-gray-50/40 dark:bg-slate-800/40 border border-gray-100 dark:border-slate-800 p-3 rounded-xl flex-1 flex flex-col justify-center">
              <div className="flex justify-between items-center mb-2 px-1">
                <span className="text-[9px] text-gray-400 dark:text-slate-400 font-extrabold uppercase tracking-wider">
                  Shipment Pipeline Status Stepper
                </span>
                <span className="text-[10px] font-mono font-bold text-gray-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 px-2 py-0.5 rounded">
                  Total: {shipmentStats.total} Shipments
                </span>
              </div>
              <div className="py-2 bg-white dark:bg-slate-800/80 rounded-lg border border-gray-100/60 dark:border-slate-700 shadow-xs px-2 sm:px-4">
                <TripStepper
                  preTripCount={shipmentStats.preTrip}
                  onTripCount={shipmentStats.onTrip}
                  endTripCount={shipmentStats.endTrip}
                  hideCard={true}
                />
              </div>
            </div>
          </div>
        </div>

        {/* BOX 4: ORDER ALLOCATION RATIO */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-5 shadow-sm flex flex-col justify-between space-y-5 transition-colors duration-200 h-full">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-50 dark:bg-slate-800 rounded-lg text-blue-600 dark:text-sky-400 border border-blue-100 dark:border-slate-700 shadow-xs">
                <BarChart3 className="w-4.5 h-4.5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-gray-900 dark:text-slate-100 leading-tight">Order Allocation Ratio</h4>
                <p className="text-[10px] text-gray-400 dark:text-slate-400 font-semibold">Service stream distribution</p>
              </div>
            </div>
            <div className="text-[10px] font-black text-blue-700 dark:text-sky-300 bg-blue-50 dark:bg-slate-800 border border-blue-100 dark:border-slate-700 px-3 py-1.5 rounded-lg shadow-xs">
              Total: {totalOrders} Orders
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-between space-y-4">
            {/* 3 Stat Cards Highlighted - Equal height & alignment */}
            <div className="grid grid-cols-3 gap-2.5">
              {/* Ekspor */}
              <div className="bg-sky-50/25 dark:bg-sky-950/20 border-l-4 border-l-sky-400 border border-sky-200/60 dark:border-sky-800/40 p-3 rounded-xl flex flex-col justify-center min-h-[84px] transition-all hover:shadow-md hover:scale-[1.015]">
                <span className="text-2xl sm:text-3xl font-black text-sky-600 dark:text-sky-400 tracking-tight leading-none">{orderStats.eksporCount}</span>
                <span className="text-[10px] font-black text-sky-800 dark:text-sky-300 uppercase tracking-wider mt-1.5 leading-none block">Ekspor</span>
                <span className="text-[9px] text-sky-500 dark:text-sky-400 font-bold mt-1 block leading-none">{totalOrders ? Math.round((orderStats.eksporCount / totalOrders) * 100) : 0}% Share</span>
              </div>

              {/* Impor */}
              <div className="bg-blue-50/25 dark:bg-blue-950/20 border-l-4 border-l-blue-500 border border-blue-200/60 dark:border-blue-800/40 p-3 rounded-xl flex flex-col justify-center min-h-[84px] transition-all hover:shadow-md hover:scale-[1.015]">
                <span className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400 tracking-tight leading-none">{orderStats.imporCount}</span>
                <span className="text-[10px] font-black text-blue-800 dark:text-blue-300 uppercase tracking-wider mt-1.5 leading-none block">Impor</span>
                <span className="text-[9px] text-blue-500 dark:text-blue-400 font-bold mt-1 block leading-none">{totalOrders ? Math.round((orderStats.imporCount / totalOrders) * 100) : 0}% Share</span>
              </div>

              {/* Repo */}
              <div className="bg-emerald-50/25 dark:bg-emerald-950/20 border-l-4 border-l-emerald-500 border border-emerald-200/60 dark:border-emerald-800/40 p-3 rounded-xl flex flex-col justify-center min-h-[84px] transition-all hover:shadow-md hover:scale-[1.015]">
                <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight leading-none">{orderStats.repoCount}</span>
                <span className="text-[10px] font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-wider mt-1.5 leading-none block">Repo</span>
                <span className="text-[9px] text-emerald-500 dark:text-emerald-400 font-bold mt-1 block leading-none">{totalOrders ? Math.round((orderStats.repoCount / totalOrders) * 100) : 0}% Share</span>
              </div>
            </div>

            {/* Recharts Diagrams placed underneath */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1">
              {/* Interactive BarChart Diagram */}
              <div className="bg-gray-50/40 dark:bg-slate-800/40 border border-gray-100 dark:border-slate-800 p-3 rounded-xl flex flex-col justify-center">
                <span className="text-[9px] text-gray-400 dark:text-slate-400 font-extrabold uppercase tracking-wider block mb-2">Order Allocation Diagram</span>
                <div className="min-h-0 flex items-center justify-center">
                  <BarChart data={orderDistributionData} totalValue={totalOrders} unit="Orders" />
                </div>
              </div>

              {/* Horizontal Ratio Allocation Stacked bar */}
              <div className="bg-gray-50/40 dark:bg-slate-800/40 border border-gray-100 dark:border-slate-800 p-3 rounded-xl flex flex-col justify-center">
                <span className="text-[9px] text-gray-400 dark:text-slate-400 font-extrabold uppercase tracking-wider block mb-3">Horizontal Ratio Allocation</span>
                <div className="py-2 px-2 bg-white dark:bg-slate-800/80 rounded-lg border border-gray-100/60 dark:border-slate-700 shadow-xs min-h-0 flex flex-col justify-center">
                  <StackedBarChart segments={orderTypeSegments} total={totalOrders} />
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </motion.div>
  );
}
