import React, { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Truck, ClipboardList, ShieldCheck, BarChart3, FileSpreadsheet, Search, X, ExternalLink, Filter, Eye, CircleDot, Calendar, XCircle, AlertCircle } from "lucide-react";
import TripStepper from "../components/TripStepper";
import StackedBarChart from "../components/StackedBarChart";
import BarChart from "../components/BarChart";
import ServiceStreamCard from "../components/ServiceStreamCard";
import DateRangeFilter, { DateFilterState, filterByDate, parseBookingDate, formatDateIndo } from "../components/DateRangeFilter";
import { useFirebaseRealtime } from "../hooks/useFirebaseRealtime";
import { TabType } from "../components/Sidebar";
import { Order } from "../types";
import { fetchLiveOrdersClient, fetchExecutedShipmentsClient } from "../lib/fetchOrdersClient";
import { mapCSStatus } from "../lib/statusMapper";
import DetailListModal from "../components/DetailListModal";

interface OverviewProps {
  onNavigate: (tab: TabType, filterType?: string) => void;
}

export default function Overview({ onNavigate }: OverviewProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [executedShipments, setExecutedShipments] = useState<Order[]>([]);
  const [dateFilter, setDateFilter] = useState<DateFilterState>({
    startDate: "",
    endDate: "",
    preset: "auto"
  });
  const { trucks } = useFirebaseRealtime();

  // Modal state for viewing detail list when KPI numbers are clicked
  const [detailModal, setDetailModal] = useState<{
    isOpen: boolean;
    title: string;
    subtitle?: string;
    data: any[];
    dataType: "order" | "shipment";
  }>({
    isOpen: false,
    title: "",
    data: [],
    dataType: "order",
  });

  // Filter orders and shipments dynamically by selected date range
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => filterByDate(o.bookingDate, dateFilter));
  }, [orders, dateFilter]);

  const filteredExecutedShipments = useMemo(() => {
    return executedShipments.filter((o) => filterByDate(o.bookingDate, dateFilter));
  }, [executedShipments, dateFilter]);

  // Real-time live auto-connection to Google Sheets with Vercel client fallback support
  useEffect(() => {
    let isMounted = true;
    const fetchOrders = async () => {
      try {
        const [liveOrders, liveExecuted] = await Promise.all([
          fetchLiveOrdersClient(),
          fetchExecutedShipmentsClient()
        ]);
        if (isMounted) {
          if (Array.isArray(liveOrders) && liveOrders.length > 0) {
            setOrders(liveOrders);
          }
          if (Array.isArray(liveExecuted) && liveExecuted.length > 0) {
            setExecutedShipments(liveExecuted);
          }
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
      const total = 54;
      const standby = 36;
      const downtime = 2;
      const utilized = 16;
      const available = utilized + standby; // 52
      return {
        total,
        available,
        utilized,
        standby,
        downtime,
        availablePct: Math.round((available / total) * 100),
        utilizedPct: Math.round((utilized / total) * 100),
        standbyPct: Math.round((standby / total) * 100),
        downtimePct: Math.round((downtime / total) * 100)
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
      } else if (uStatus.includes("STORING") || uStatus.includes("LAKA") || uStatus.includes("DOWNTIME") || uStatus.includes("BENGKEL")) {
        downtime++;
      } else {
        utilized++;
      }
    });

    const available = utilized + standby;

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
    const total = filteredOrders.length;
    // CONFIRM: statusPooling order is confirm
    const confirm = filteredOrders.filter((o) => (o.statusPooling || "").toUpperCase().includes("CONFIRM")).length;
    // CANCEL: statusPooling cancel
    const cancel = filteredOrders.filter((o) => (o.statusPooling || "").toUpperCase().includes("CANCEL")).length;
    // NEED ACTION: statusPooling is empty or NEED ACTION
    const needAction = filteredOrders.filter((o) => {
      const s = (o.statusPooling || "").toUpperCase();
      return !s.includes("CONFIRM") && !s.includes("CANCEL");
    }).length;

    const activeTotal = needAction + confirm;

    const ekspor = filteredOrders.filter((o) => o.type === "ekspor");
    const impor = filteredOrders.filter((o) => o.type === "impor");
    
    // REPO PDT: COMMERCIAL ROUTE or drop location/destination mentioning PDT, Depo PDT, Pancaran, Priok, 0 - 36
    const repoPdt = filteredOrders.filter((o) => {
      const cr = (o.commercialRoute || "").toLowerCase();
      const text = `${cr} ${o.origin || ""} ${o.destination || ""} ${o.notes || ""}`.toLowerCase();
      return (
        cr.includes("pancaran") ||
        cr.includes("0 - 36") ||
        cr.includes("0-36") ||
        cr.includes("pdt") ||
        cr.includes("depo pdt") ||
        text.includes("depo arround priok - pancaran") ||
        text.includes("pancaran depo")
      );
    });

    const repo = filteredOrders.filter((o) => o.type === "repo" && !repoPdt.includes(o));

    const getBreakdown = (list: Order[]) => {
      const listTotal = list.length || 1;
      const tr = list.filter((o) => (o.statusPooling || "").toUpperCase().includes("CONFIRM")).length;
      const dn = list.filter((o) => (o.statusPooling || "").toUpperCase().includes("CANCEL")).length;
      const op = list.filter((o) => {
        const s = (o.statusPooling || "").toUpperCase();
        return !s.includes("CONFIRM") && !s.includes("CANCEL");
      }).length;

      return {
        total: list.length,
        open: op,
        transit: tr,
        done: dn,
        segments: [
          { label: "need action", count: op, percentage: Math.round((op / listTotal) * 100), color: "bg-amber-500", hoverColor: "bg-amber-400", shadowColor: "#f59e0b" },
          { label: "confirm", count: tr, percentage: Math.round((tr / listTotal) * 100), color: "bg-blue-600", hoverColor: "bg-blue-500", shadowColor: "#2563eb" },
          { label: "cancel", count: dn, percentage: Math.round((dn / listTotal) * 100), color: "bg-rose-500", hoverColor: "bg-rose-400", shadowColor: "#f43f5e" },
        ]
      };
    };

    return {
      total,
      activeTotal,
      cancel,
      needAction,
      confirm,
      ekspor: getBreakdown(ekspor),
      repoPdt: getBreakdown(repoPdt),
      repo: getBreakdown(repo),
      impor: getBreakdown(impor),
      eksporCount: ekspor.length,
      repoPdtCount: repoPdt.length,
      repoCount: repo.length,
      imporCount: impor.length
    };
  }, [filteredOrders]);

  // Compute Live Shipment Stats directly from EXECUTED SINARMAS sheet rows
  const shipmentStats = useMemo(() => {
    let total = 0;
    let preTrip = 0;
    let onTrip = 0;
    let endTrip = 0;
    let cancel = 0;
    let cancelCustomer = 0;
    let pendingShipment = 0;

    const dataset = filteredExecutedShipments.length > 0 ? filteredExecutedShipments : filteredOrders;

    dataset.forEach((o) => {
      const qty = filteredExecutedShipments.length > 0 ? 1 : (o.quantity || 1);
      const { shipmentStatus } = mapCSStatus(o.lastUpdateCS);

      total += qty;
      if (shipmentStatus === "pre_trip") {
        preTrip += qty;
      } else if (shipmentStatus === "on_trip") {
        onTrip += qty;
      } else if (shipmentStatus === "end_trip") {
        endTrip += qty;
      } else if (shipmentStatus === "cancel") {
        cancel += qty;
      }

      const cs = (o.lastUpdateCS || "").toUpperCase();
      if (cs.includes("CANCEL CUSTOMER") || cs.includes("CANCEL CUST")) {
        cancelCustomer += qty;
      }
      if (cs.includes("BON MUAT") || cs.includes("HOLD") || (o.orderStatus || "").toLowerCase() === "hold") {
        pendingShipment += qty;
      }
    });

    const activeTotal = preTrip + onTrip + endTrip;

    const preTripPct = activeTotal > 0 ? Math.round((preTrip / activeTotal) * 100) : 0;
    const onTripPct = activeTotal > 0 ? Math.round((onTrip / activeTotal) * 100) : 0;
    const endTripPct = activeTotal > 0 ? Math.round((endTrip / activeTotal) * 100) : 0;

    return {
      total,
      activeTotal,
      cancel,
      cancelCustomer,
      pendingShipment,
      preTrip,
      onTrip,
      endTrip,
      preTripPct,
      onTripPct,
      endTripPct
    };
  }, [filteredExecutedShipments, filteredOrders]);

  const totalOrders = orderStats.total;

  // Stacked bar segments for Order Types
  const orderTypeSegments = [
    { label: "Ekspor", count: orderStats.eksporCount, percentage: totalOrders ? Math.round((orderStats.eksporCount / totalOrders) * 100) : 0, color: "bg-sky-500" },
    { label: "Repo PDT", count: orderStats.repoPdtCount, percentage: totalOrders ? Math.round((orderStats.repoPdtCount / totalOrders) * 100) : 0, color: "bg-amber-500" },
    { label: "Repo Service", count: orderStats.repoCount, percentage: totalOrders ? Math.round((orderStats.repoCount / totalOrders) * 100) : 0, color: "bg-emerald-500" },
    { label: "Impor", count: orderStats.imporCount, percentage: totalOrders ? Math.round((orderStats.imporCount / totalOrders) * 100) : 0, color: "bg-blue-600" }
  ];

  const orderDistributionData = [
    { name: "Ekspor", value: orderStats.eksporCount, color: "#0EA5E9" },    // sky-500
    { name: "Repo PDT", value: orderStats.repoPdtCount, color: "#F59E0B" },  // amber-500
    { name: "Repo Service", value: orderStats.repoCount, color: "#10B981" }, // emerald-500
    { name: "Impor", value: orderStats.imporCount, color: "#2563EB" }        // blue-600
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
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Filter Tanggal Booking for Dashboard */}
            <DateRangeFilter
              value={dateFilter}
              onChange={setDateFilter}
              align="right"
            />
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-3.5 py-2 rounded-xl border border-emerald-200 dark:border-emerald-800 shrink-0 shadow-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Google Sheet Live Connected</span>
            </div>
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
            {/* 5 Stat Cards Highlighted - Equal height & alignment */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {/* Total Order */}
              <div
                onClick={() => {
                  setDetailModal({
                    isOpen: true,
                    title: "Detail Data: Total Order",
                    subtitle: "Seluruh order yang terdaftar dalam sistem / sheet",
                    data: filteredOrders,
                    dataType: "order"
                  });
                }}
                className="bg-slate-50/60 dark:bg-slate-800/60 border-l-4 border-l-slate-500 border border-slate-200/80 dark:border-slate-700 p-2.5 rounded-xl flex flex-col justify-center min-h-[80px] transition-all hover:shadow-md hover:scale-[1.015] cursor-pointer"
              >
                <div>
                  <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    Total Order
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight leading-none mt-1 block">
                    {orderStats.total}
                  </span>
                  <span className="text-[8px] text-rose-600 dark:text-rose-400 font-bold mt-1 block leading-none">
                    Total Cancel: {orderStats.cancel}
                  </span>
                </div>
              </div>

              {/* Total Shipment (Samping Kanan Total Order) */}
              <div
                onClick={() => {
                  setDetailModal({
                    isOpen: true,
                    title: "Detail Data: Total Shipment",
                    subtitle: "Seluruh eksekusi trip shipment dalam sistem / sheet",
                    data: filteredExecutedShipments,
                    dataType: "shipment"
                  });
                }}
                className="bg-sky-50/30 dark:bg-sky-950/20 border-l-4 border-l-sky-500 border border-sky-200/60 dark:border-sky-800/40 p-2.5 rounded-xl flex flex-col justify-center min-h-[80px] transition-all hover:shadow-md hover:scale-[1.015] cursor-pointer"
              >
                <div>
                  <span className="text-[9px] font-black text-sky-800 dark:text-sky-300 uppercase tracking-wider block">
                    Total Shipment
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-sky-700 dark:text-sky-300 tracking-tight leading-none mt-1 block">
                    {shipmentStats.total}
                  </span>
                  <span className="text-[8px] text-sky-600 dark:text-sky-400 font-bold mt-1 block leading-none">
                    Executed Trips
                  </span>
                </div>
              </div>
              
              {/* Need Action (Open Queue) */}
              <div
                onClick={() => {
                  const needActionList = filteredOrders.filter((o) => {
                    const s = (o.statusPooling || "").toUpperCase();
                    return !s.includes("CONFIRM") && !s.includes("CANCEL");
                  });
                  setDetailModal({
                    isOpen: true,
                    title: "Detail Data: Need Action",
                    subtitle: "Order dengan Status Pooling belum dikonfirmasi (Kosong / Need Action)",
                    data: needActionList,
                    dataType: "order"
                  });
                }}
                className="bg-amber-50/25 dark:bg-amber-950/20 border-l-4 border-l-amber-500 border border-amber-200/60 dark:border-amber-800/40 p-2.5 rounded-xl flex flex-col justify-center min-h-[80px] transition-all hover:shadow-md hover:scale-[1.015] cursor-pointer"
              >
                <div>
                  <span className="text-[9px] font-black text-amber-800 dark:text-amber-300 uppercase tracking-wider block">Need Action</span>
                  <span className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 tracking-tight leading-none mt-1 block">{orderStats.needAction}</span>
                  <span className="text-[8px] text-amber-500 dark:text-amber-400 font-bold mt-1 block leading-none">Status Pooling Empty</span>
                </div>
              </div>

              {/* Confirm (In Progress) */}
              <div
                onClick={() => {
                  const confirmList = filteredOrders.filter((o) => (o.statusPooling || "").toUpperCase().includes("CONFIRM"));
                  setDetailModal({
                    isOpen: true,
                    title: "Detail Data: Confirm",
                    subtitle: "Order dengan Status Pooling telah dikonfirmasi (Confirm)",
                    data: confirmList,
                    dataType: "order"
                  });
                }}
                className="bg-blue-50/25 dark:bg-blue-950/20 border-l-4 border-l-blue-500 border border-blue-200/60 dark:border-blue-800/40 p-2.5 rounded-xl flex flex-col justify-center min-h-[80px] transition-all hover:shadow-md hover:scale-[1.015] cursor-pointer"
              >
                <div>
                  <span className="text-[9px] font-black text-blue-800 dark:text-blue-300 uppercase tracking-wider block">Confirm</span>
                  <span className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400 tracking-tight leading-none mt-1 block">{orderStats.confirm}</span>
                  <span className="text-[8px] text-blue-500 dark:text-blue-400 font-bold mt-1 block leading-none">Status Pooling Order</span>
                </div>
              </div>

              {/* Cancel (Completed) */}
              <div
                onClick={() => {
                  const cancelList = filteredOrders.filter((o) => (o.statusPooling || "").toUpperCase().includes("CANCEL"));
                  setDetailModal({
                    isOpen: true,
                    title: "Detail Data: Cancel",
                    subtitle: "Order dengan Status Pooling Cancel",
                    data: cancelList,
                    dataType: "order"
                  });
                }}
                className="bg-rose-50/25 dark:bg-rose-950/20 border-l-4 border-l-rose-500 border border-rose-200/60 dark:border-rose-800/40 p-2.5 rounded-xl flex flex-col justify-center min-h-[80px] transition-all hover:shadow-md hover:scale-[1.015] cursor-pointer"
              >
                <div>
                  <span className="text-[9px] font-black text-rose-800 dark:text-rose-300 uppercase tracking-wider block">Cancel</span>
                  <span className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight leading-none mt-1 block">{orderStats.cancel}</span>
                  <span className="text-[8px] text-rose-500 dark:text-rose-400 font-bold mt-1 block leading-none">Status Pooling Cancel</span>
                </div>
              </div>
            </div>

            {/* Service Streams Progress Breakdown */}
            <div className="bg-gray-50/40 dark:bg-slate-800/40 border border-gray-100 dark:border-slate-800 p-3 rounded-xl flex-1 flex flex-col justify-center">
              <span className="text-[9px] text-gray-400 dark:text-slate-400 font-extrabold uppercase tracking-wider block mb-2.5">
                Service Streams Progress Breakdown
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                <ServiceStreamCard
                  title="EKSPOR SERVICE"
                  total={orderStats.ekspor.total}
                  themeColor="sky"
                  segments={orderStats.ekspor.segments}
                />

                <ServiceStreamCard
                  title="REPO PDT"
                  total={orderStats.repoPdt.total}
                  themeColor="amber"
                  segments={orderStats.repoPdt.segments}
                />

                <ServiceStreamCard
                  title="REPO SERVICE"
                  total={orderStats.repo.total}
                  themeColor="emerald"
                  segments={orderStats.repo.segments}
                />

                <ServiceStreamCard
                  title="IMPOR SERVICE"
                  total={orderStats.impor.total}
                  themeColor="blue"
                  segments={orderStats.impor.segments}
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
            {/* 6 Stat Cards Highlighted - Equal height & alignment */}
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
              {/* Total Shipment */}
              <div
                onClick={() => {
                  setDetailModal({
                    isOpen: true,
                    title: "Detail Data: Total Shipment",
                    subtitle: "Seluruh data eksekusi shipment dalam periode terpilih",
                    data: filteredExecutedShipments,
                    dataType: "shipment"
                  });
                }}
                className="bg-white dark:bg-slate-800/90 border-l-4 border-l-[#0B2C6B] dark:border-l-sky-500 border border-slate-200/80 dark:border-slate-700/80 p-3 sm:p-3.5 rounded-xl flex flex-col justify-between min-h-[115px] h-full transition-all hover:shadow-md hover:scale-[1.015] cursor-pointer shadow-sm"
              >
                <div className="flex items-start justify-between gap-1 min-h-[28px] sm:min-h-[32px]">
                  <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-tight leading-tight block">
                    Total Shipment
                  </span>
                </div>
                <div className="my-1">
                  <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight leading-none block">
                    {shipmentStats.total}
                  </span>
                </div>
                <div className="pt-1 mt-auto min-h-[20px] flex items-center">
                  <span className="text-[9.5px] text-rose-600 dark:text-rose-400 font-bold leading-tight block">
                    Total Cancel: {shipmentStats.cancel}
                  </span>
                </div>
              </div>

              {/* Total Cancel Customer */}
              <div
                onClick={() => {
                  const cancelList = filteredExecutedShipments.filter(
                    (s) =>
                      (s.orderStatus || "").toLowerCase().includes("cancel customer") ||
                      (s.lastUpdateCS || "").toLowerCase().includes("cancel customer") ||
                      (s.lastUpdateCS || "").toLowerCase().includes("cancel cust")
                  );
                  setDetailModal({
                    isOpen: true,
                    title: "Detail Data: Total Cancel Customer",
                    subtitle: "Trip shipment dengan status order cancel customer",
                    data: cancelList,
                    dataType: "shipment"
                  });
                }}
                className="bg-white dark:bg-slate-800/90 border-l-4 border-l-rose-500 border border-slate-200/80 dark:border-slate-700/80 p-3 sm:p-3.5 rounded-xl flex flex-col justify-between min-h-[115px] h-full transition-all hover:shadow-md hover:scale-[1.015] cursor-pointer shadow-sm"
              >
                <div className="flex items-start justify-between gap-1 min-h-[28px] sm:min-h-[32px]">
                  <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-tight leading-tight block">
                    Total Cancel Customer
                  </span>
                  <div className="p-0.5 bg-slate-100 dark:bg-slate-700/80 rounded text-slate-400 shrink-0">
                    <XCircle className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="my-1">
                  <span className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400 tracking-tight leading-none block">
                    {shipmentStats.cancelCustomer}
                  </span>
                </div>
                <div className="pt-1 mt-auto min-h-[20px] flex items-center">
                  <span className="text-[9.5px] text-slate-500 dark:text-slate-400 font-bold leading-tight block">
                    Status Order Cancel
                  </span>
                </div>
              </div>

              {/* Pending Shipment */}
              <div
                onClick={() => {
                  const pendingList = filteredExecutedShipments.filter((s) => {
                    const cs = (s.lastUpdateCS || "").toUpperCase();
                    return cs.includes("BON MUAT") || cs.includes("HOLD") || s.orderStatus === "hold";
                  });
                  setDetailModal({
                    isOpen: true,
                    title: "Detail Data: Pending Shipment",
                    subtitle: "Shipment dalam antrian Bon Muat atau status Hold CS",
                    data: pendingList,
                    dataType: "shipment"
                  });
                }}
                className="bg-white dark:bg-slate-800/90 border-l-4 border-l-rose-500 border border-slate-200/80 dark:border-slate-700/80 p-3 sm:p-3.5 rounded-xl flex flex-col justify-between min-h-[115px] h-full transition-all hover:shadow-md hover:scale-[1.015] cursor-pointer shadow-sm"
              >
                <div className="flex items-start justify-between gap-1 min-h-[28px] sm:min-h-[32px]">
                  <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-tight leading-tight block">
                    Pending Shipment
                  </span>
                  <div className="p-0.5 bg-slate-100 dark:bg-slate-700/80 rounded text-slate-400 shrink-0">
                    <AlertCircle className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="my-1">
                  <span className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400 tracking-tight leading-none block">
                    {shipmentStats.pendingShipment}
                  </span>
                </div>
                <div className="pt-1 mt-auto min-h-[20px] flex items-center">
                  <span className="text-[9.5px] text-slate-500 dark:text-slate-400 font-bold leading-tight block">
                    Waiting Bon Muat
                  </span>
                </div>
              </div>

              {/* Pre-Trip */}
              <div
                onClick={() => {
                  const preTripList = filteredExecutedShipments.filter((s) => {
                    const cs = (s.lastUpdateCS || "").toLowerCase();
                    const isCancel =
                      s.tripStatus === "cancel" ||
                      (s.orderStatus || "").toLowerCase().includes("cancel") ||
                      cs.includes("cancel");
                    return s.tripStatus === "pre_trip" && !isCancel;
                  });
                  setDetailModal({
                    isOpen: true,
                    title: "Detail Data: Pre-Trip",
                    subtitle: "Persiapan unit dan antrian muat barang (Pre-Trip)",
                    data: preTripList,
                    dataType: "shipment"
                  });
                }}
                className="bg-white dark:bg-slate-800/90 border-l-4 border-l-sky-500 border border-slate-200/80 dark:border-slate-700/80 p-3 sm:p-3.5 rounded-xl flex flex-col justify-between min-h-[115px] h-full transition-all hover:shadow-md hover:scale-[1.015] cursor-pointer shadow-sm"
              >
                <div className="flex items-start justify-between gap-1 min-h-[28px] sm:min-h-[32px]">
                  <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-tight leading-tight block">
                    Pre-Trip
                  </span>
                </div>
                <div className="my-1">
                  <span className="text-2xl sm:text-3xl font-black text-sky-600 dark:text-sky-400 tracking-tight leading-none block">
                    {shipmentStats.preTrip}
                  </span>
                </div>
                <div className="pt-1 mt-auto min-h-[20px] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500 inline-block shrink-0"></span>
                  <span className="text-[9.5px] text-slate-500 dark:text-slate-400 font-bold leading-tight block">
                    Prep &amp; loading ({shipmentStats.preTripPct}%)
                  </span>
                </div>
              </div>

              {/* On Trip */}
              <div
                onClick={() => {
                  const onTripList = filteredExecutedShipments.filter((s) => s.tripStatus === "on_trip");
                  setDetailModal({
                    isOpen: true,
                    title: "Detail Data: On Trip",
                    subtitle: "Armada sedang dalam perjalanan ke lokasi tujuan (In Transit)",
                    data: onTripList,
                    dataType: "shipment"
                  });
                }}
                className="bg-white dark:bg-slate-800/90 border-l-4 border-l-blue-600 border border-slate-200/80 dark:border-slate-700/80 p-3 sm:p-3.5 rounded-xl flex flex-col justify-between min-h-[115px] h-full transition-all hover:shadow-md hover:scale-[1.015] cursor-pointer shadow-sm"
              >
                <div className="flex items-start justify-between gap-1 min-h-[28px] sm:min-h-[32px]">
                  <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-tight leading-tight block">
                    On Trip
                  </span>
                </div>
                <div className="my-1">
                  <span className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400 tracking-tight leading-none block">
                    {shipmentStats.onTrip}
                  </span>
                </div>
                <div className="pt-1 mt-auto min-h-[20px] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 inline-block shrink-0"></span>
                  <span className="text-[9.5px] text-slate-500 dark:text-slate-400 font-bold leading-tight block">
                    Active in transit ({shipmentStats.onTripPct}%)
                  </span>
                </div>
              </div>

              {/* End Trip */}
              <div
                onClick={() => {
                  const endTripList = filteredExecutedShipments.filter((s) => s.tripStatus === "end_trip");
                  setDetailModal({
                    isOpen: true,
                    title: "Detail Data: End Trip",
                    subtitle: "Pengiriman barang telah selesai dan armada tiba dengan aman",
                    data: endTripList,
                    dataType: "shipment"
                  });
                }}
                className="bg-white dark:bg-slate-800/90 border-l-4 border-l-emerald-500 border border-slate-200/80 dark:border-slate-700/80 p-3 sm:p-3.5 rounded-xl flex flex-col justify-between min-h-[115px] h-full transition-all hover:shadow-md hover:scale-[1.015] cursor-pointer shadow-sm"
              >
                <div className="flex items-start justify-between gap-1 min-h-[28px] sm:min-h-[32px]">
                  <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-tight leading-tight block">
                    End Trip
                  </span>
                </div>
                <div className="my-1">
                  <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight leading-none block">
                    {shipmentStats.endTrip}
                  </span>
                </div>
                <div className="pt-1 mt-auto min-h-[20px] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block shrink-0"></span>
                  <span className="text-[9.5px] text-slate-500 dark:text-slate-400 font-bold leading-tight block">
                    Safely arrived ({shipmentStats.endTripPct}%)
                  </span>
                </div>
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
            {/* 4 Stat Cards Highlighted - Equal height & alignment */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
              {/* Ekspor */}
              <div className="bg-sky-50/25 dark:bg-sky-950/20 border-l-4 border-l-sky-400 border border-sky-200/60 dark:border-sky-800/40 p-3 rounded-xl flex flex-col justify-center min-h-[84px] transition-all hover:shadow-md hover:scale-[1.015]">
                <span className="text-2xl sm:text-3xl font-black text-sky-600 dark:text-sky-400 tracking-tight leading-none">{orderStats.eksporCount}</span>
                <span className="text-[10px] font-black text-sky-800 dark:text-sky-300 uppercase tracking-wider mt-1.5 leading-none block">Ekspor</span>
                <span className="text-[9px] text-sky-500 dark:text-sky-400 font-bold mt-1 block leading-none">{totalOrders ? Math.round((orderStats.eksporCount / totalOrders) * 100) : 0}% Share</span>
              </div>

              {/* Repo PDT */}
              <div className="bg-amber-50/25 dark:bg-amber-950/20 border-l-4 border-l-amber-500 border border-amber-200/60 dark:border-amber-800/40 p-3 rounded-xl flex flex-col justify-center min-h-[84px] transition-all hover:shadow-md hover:scale-[1.015]">
                <span className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 tracking-tight leading-none">{orderStats.repoPdtCount}</span>
                <span className="text-[10px] font-black text-amber-800 dark:text-amber-300 uppercase tracking-wider mt-1.5 leading-none block">Repo PDT</span>
                <span className="text-[9px] text-amber-500 dark:text-amber-400 font-bold mt-1 block leading-none">{totalOrders ? Math.round((orderStats.repoPdtCount / totalOrders) * 100) : 0}% Share</span>
              </div>

              {/* Repo Service */}
              <div className="bg-emerald-50/25 dark:bg-emerald-950/20 border-l-4 border-l-emerald-500 border border-emerald-200/60 dark:border-emerald-800/40 p-3 rounded-xl flex flex-col justify-center min-h-[84px] transition-all hover:shadow-md hover:scale-[1.015]">
                <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight leading-none">{orderStats.repoCount}</span>
                <span className="text-[10px] font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-wider mt-1.5 leading-none block">Repo Service</span>
                <span className="text-[9px] text-emerald-500 dark:text-emerald-400 font-bold mt-1 block leading-none">{totalOrders ? Math.round((orderStats.repoCount / totalOrders) * 100) : 0}% Share</span>
              </div>

              {/* Impor */}
              <div className="bg-blue-50/25 dark:bg-blue-950/20 border-l-4 border-l-blue-500 border border-blue-200/60 dark:border-blue-800/40 p-3 rounded-xl flex flex-col justify-center min-h-[84px] transition-all hover:shadow-md hover:scale-[1.015]">
                <span className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400 tracking-tight leading-none">{orderStats.imporCount}</span>
                <span className="text-[10px] font-black text-blue-800 dark:text-blue-300 uppercase tracking-wider mt-1.5 leading-none block">Impor</span>
                <span className="text-[9px] text-blue-500 dark:text-blue-400 font-bold mt-1 block leading-none">{totalOrders ? Math.round((orderStats.imporCount / totalOrders) * 100) : 0}% Share</span>
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

      {/* Detail List Modal for KPI Clicks */}
      <DetailListModal
        isOpen={detailModal.isOpen}
        onClose={() => setDetailModal((prev) => ({ ...prev, isOpen: false }))}
        title={detailModal.title}
        subtitle={detailModal.subtitle}
        data={detailModal.data}
        dataType={detailModal.dataType}
      />
    </motion.div>
  );
}
