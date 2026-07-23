import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, Filter, AlertCircle, ShoppingCart, RefreshCw, X, ArrowRight, Eye, Calendar, Plus, CheckCircle2, Truck, UserCheck, ShieldCheck, FileSpreadsheet, ExternalLink, Database } from "lucide-react";
import StatCard from "../components/StatCard";
import DataTable, { Column } from "../components/DataTable";
import StatusBadge from "../components/StatusBadge";
import { dummyOrders } from "../lib/dummy-data";
import { Order, OrderType, OrderStatus } from "../types";

interface OrderProps {
  initialTypeFilter?: string;
  onClearInitialFilter?: () => void;
}

export default function OrderPage({ initialTypeFilter, onClearInitialFilter }: OrderProps) {
  // Live orders state initialized to empty array (0 initial orders)
  const [orders, setOrders] = useState<Order[]>([]);

  // Google Sheets integration state
  const [isSyncingSheets, setIsSyncingSheets] = useState(false);
  const [showSheetBanner, setShowSheetBanner] = useState(false);
  const [sheetSyncMeta, setSheetSyncMeta] = useState<{
    connected: boolean;
    totalRows: number;
    fetchedAt: string | null;
    error: string | null;
  }>({
    connected: false,
    totalRows: 0,
    fetchedAt: null,
    error: null
  });
  const [sourceFilter, setSourceFilter] = useState<"all" | "sheets" | "local">("all");

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [orderIdFilter, setOrderIdFilter] = useState("");
  const [customerFilter, setCustomerFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  // Success Notification Banner
  const [notification, setNotification] = useState<string | null>(null);

  // Selected Order Modal State
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Fetch Google Sheets orders from backend proxy API
  const syncGoogleSheets = async (showNotification = true) => {
    setIsSyncingSheets(true);
    try {
      const res = await fetch("/api/sheets/orders");
      const json = await res.json();

      if (json.success && Array.isArray(json.orders)) {
        const sheetOrders: Order[] = json.orders;
        
        setOrders((prev) => {
          const userCreated = prev.filter((o) => (o as any).isUserCreated);
          return [...userCreated, ...sheetOrders];
        });

        setSheetSyncMeta({
          connected: true,
          totalRows: sheetOrders.length,
          fetchedAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          error: null
        });

        if (showNotification) {
          setNotification(`Berhasil menyinkronkan ${sheetOrders.length} data order dari Google Spreadsheet!`);
          setTimeout(() => setNotification(null), 4000);
        }
      } else {
        setSheetSyncMeta((prev) => ({
          ...prev,
          error: json.message || "Gagal memuat Google Sheets"
        }));
      }
    } catch (err: any) {
      console.error("Sheets sync error:", err);
      setSheetSyncMeta((prev) => ({
        ...prev,
        error: "Gagal terhubung ke API server Google Sheets"
      }));
    } finally {
      setIsSyncingSheets(false);
    }
  };

  // Auto-sync Google Sheets on mount and poll continuously in real-time
  useEffect(() => {
    syncGoogleSheets(false);

    const interval = setInterval(() => {
      syncGoogleSheets(false);
    }, 10000); // Live real-time sync every 10 seconds

    return () => clearInterval(interval);
  }, []);

  // Set initial filter from Overview deep-link
  useEffect(() => {
    if (initialTypeFilter) {
      setTypeFilter(initialTypeFilter.toLowerCase());
    }
  }, [initialTypeFilter]);

  // Unique Customer options list derived from live orders
  const customerOptions = useMemo(() => {
    const customersSet = new Set<string>();
    orders.forEach((o) => {
      if (o.customer) customersSet.add(o.customer);
    });
    return Array.from(customersSet).sort();
  }, [orders]);

  // Reset Filters handler
  const handleResetFilters = () => {
    setSearchQuery("");
    setOrderIdFilter("");
    setCustomerFilter("all");
    setTypeFilter("all");
    setStatusFilter("all");
    if (onClearInitialFilter) onClearInitialFilter();
  };

  const hasActiveFilters = Boolean(
    searchQuery || orderIdFilter || customerFilter !== "all" || typeFilter !== "all" || statusFilter !== "all"
  );

  // Dynamic KPI Stats calculated from live orders
  const stats = useMemo(() => {
    const total = orders.length;
    const open = orders.filter((o) => o.status === "open").length;
    const inProgress = orders.filter((o) => o.status === "in_progress").length;
    const done = orders.filter((o) => o.status === "done").length;
    return {
      total,
      open,
      inProgress,
      done,
      openPct: total > 0 ? Math.round((open / total) * 100) : 0,
      inProgressPct: total > 0 ? Math.round((inProgress / total) * 100) : 0,
      donePct: total > 0 ? Math.round((done / total) * 100) : 0
    };
  }, [orders]);

  // Dynamic Service Type Breakdown calculated from live orders
  const typeBreakdowns = useMemo(() => {
    const types: OrderType[] = ["ekspor", "impor", "repo"];
    const labels: Record<OrderType, string> = {
      ekspor: "EKSPOR SERVICE",
      impor: "IMPOR SERVICE",
      repo: "REPO SERVICE"
    };
    const colors: Record<OrderType, { tag: string; totalText: string }> = {
      ekspor: { tag: "text-sky-700 bg-sky-50", totalText: "text-sky-800" },
      impor: { tag: "text-blue-700 bg-blue-50", totalText: "text-blue-800" },
      repo: { tag: "text-emerald-700 bg-emerald-50", totalText: "text-emerald-800" }
    };

    return types.map((t) => {
      const typeOrders = orders.filter((o) => o.type === t);
      const total = typeOrders.length;
      const open = typeOrders.filter((o) => o.status === "open").length;
      const inProgress = typeOrders.filter((o) => o.status === "in_progress").length;
      const done = typeOrders.filter((o) => o.status === "done").length;

      return {
        type: t,
        label: labels[t],
        total,
        open,
        inProgress,
        done,
        openPct: total > 0 ? (open / total) * 100 : 0,
        inProgressPct: total > 0 ? (inProgress / total) * 100 : 0,
        donePct: total > 0 ? (done / total) * 100 : 0,
        styles: colors[t]
      };
    });
  }, [orders]);

  // Client-side filtering logic
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesSource =
        sourceFilter === "all" ||
        (sourceFilter === "sheets" && order.source === "Google Sheet") ||
        (sourceFilter === "local" && order.source !== "Google Sheet");

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        order.id.toLowerCase().includes(q) ||
        order.customer.toLowerCase().includes(q) ||
        order.origin.toLowerCase().includes(q) ||
        order.destination.toLowerCase().includes(q) ||
        order.unitType.toLowerCase().includes(q) ||
        (order.source && order.source.toLowerCase().includes(q));

      const idQ = orderIdFilter.toLowerCase().trim();
      const matchesOrderId = !idQ || order.id.toLowerCase().includes(idQ);

      const matchesCustomer =
        customerFilter === "all" ||
        order.customer.toLowerCase() === customerFilter.toLowerCase();

      const matchesType = typeFilter === "all" || order.type === typeFilter;
      const matchesStatus = statusFilter === "all" || order.status === statusFilter;

      return matchesSource && matchesSearch && matchesOrderId && matchesCustomer && matchesType && matchesStatus;
    });
  }, [orders, searchQuery, orderIdFilter, customerFilter, typeFilter, statusFilter, sourceFilter]);

  // Handle Quick Advance Order Status
  const handleAdvanceStatus = (orderId: string, nextStatus: OrderStatus) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o))
    );
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder({ ...selectedOrder, status: nextStatus });
    }
    setNotification(`Status order ${orderId} berhasil diupdate ke ${nextStatus.toUpperCase().replace("_", " ")}!`);
    setTimeout(() => setNotification(null), 4000);
  };

  // Column Definitions for DataTable
  const columns: Column<Order>[] = [
    {
      key: "id",
      header: "Order ID",
      sortable: true,
      render: (item) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-mono font-black text-xs sm:text-sm text-[#0B2C6B]">{item.id}</span>
          {item.source === "Google Sheet" ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 w-fit">
              <FileSpreadsheet className="w-2.5 h-2.5 text-emerald-600" /> Google Sheet
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/80 w-fit">
              <Database className="w-2.5 h-2.5 text-slate-400" /> System
            </span>
          )}
        </div>
      )
    },
    {
      key: "type",
      header: "Tipe",
      sortable: true,
      render: (item) => <StatusBadge status={item.type} />
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (item) => <StatusBadge status={item.status} />
    },
    {
      key: "customer",
      header: "Customer",
      sortable: true,
      render: (item) => <span className="font-semibold text-xs sm:text-sm text-gray-800">{item.customer}</span>
    },
    {
      key: "origin",
      header: "Origin",
      sortable: true
    },
    {
      key: "destination",
      header: "Destination",
      sortable: true
    },
    {
      key: "unitType",
      header: "Unit Type",
      sortable: true,
      render: (item) => <span className="text-xs sm:text-sm bg-gray-100 text-gray-700 px-2.5 py-1 rounded font-semibold border border-gray-200/60">{item.unitType}</span>
    },
    {
      key: "quantity",
      header: "Quantity",
      sortable: true,
      render: (item) => (
        <span className="text-xs sm:text-sm font-black text-blue-700 bg-blue-50 px-2.5 py-1 rounded border border-blue-200/80 inline-block text-center min-w-[36px]">
          {item.quantity || 1}
        </span>
      )
    },
    {
      key: "eta",
      header: "ETA/Due Date",
      sortable: true,
      render: (item) => (
        <span className="text-xs sm:text-sm font-semibold text-gray-700 flex items-center gap-1.5">
          <Calendar className="w-4 h-4 text-gray-400" /> {item.eta}
        </span>
      )
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Toast Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-emerald-600 text-white p-3.5 rounded-xl shadow-lg flex items-center justify-between font-bold text-xs sm:text-sm"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-200" />
              <span>{notification}</span>
            </div>
            <button onClick={() => setNotification(null)} className="text-white/80 hover:text-white cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Bar */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-[#0B2C6B]" />
            Order Management Console
          </h2>
          <p className="text-xs text-gray-500 font-semibold mt-1">
            Real-time container logistics orders, allocation queue, and status tracking
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowSheetBanner(!showSheetBanner)}
            className="flex items-center gap-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100/80 px-3.5 py-2 rounded-xl border border-emerald-200 transition-colors cursor-pointer shrink-0 shadow-xs"
            title="Google Sheet Live Realtime Status"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Google Sheet Realtime Live Connected</span>
          </button>
          <div className="flex items-center gap-2 text-xs font-bold text-gray-500 bg-gray-50 px-3.5 py-2 rounded-xl border border-gray-200 shrink-0">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Klik Baris untuk Status Control & Detail Order</span>
          </div>
        </div>
      </div>

      {/* Google Sheets Integration Card */}
      {showSheetBanner && (
        <div className="relative bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white p-5 rounded-2xl shadow-md border border-emerald-700/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <button
            onClick={() => setShowSheetBanner(false)}
            className="absolute right-3 top-3 text-emerald-300 hover:text-white p-1 rounded-lg hover:bg-emerald-800/60 transition-colors cursor-pointer"
            title="Sembunyikan Banner"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-start gap-3.5 pr-6 md:pr-0">
            <div className="bg-emerald-500/20 p-2.5 rounded-xl border border-emerald-400/30 shrink-0 mt-0.5">
              <FileSpreadsheet className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
                  Terhubung dengan Google Spreadsheet
                </h3>
                {sheetSyncMeta.connected ? (
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider bg-emerald-400/20 text-emerald-200 px-2.5 py-0.5 rounded-full border border-emerald-400/40">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Live Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider bg-amber-400/20 text-amber-200 px-2.5 py-0.5 rounded-full border border-amber-400/40">
                    Syncing
                  </span>
                )}
              </div>
              <p className="text-xs text-emerald-100/90 font-medium mt-1">
                Data terhubung langsung dengan Google Sheets link:{" "}
                <a
                  href="https://docs.google.com/spreadsheets/d/1pavvP7EtzMvHiIhCP5X_aoTVP5nLkV03Vw_IV0iQkxU/edit?gid=1444994189#gid=1444994189"
                  target="_blank"
                  rel="noreferrer"
                  className="underline hover:text-white font-mono inline-flex items-center gap-1 font-semibold"
                >
                  1pavvP7EtzMvHiIhCP... <ExternalLink className="w-3 h-3" />
                </a>
              </p>
              {sheetSyncMeta.fetchedAt && (
                <p className="text-[11px] text-emerald-200/80 font-medium mt-1">
                  Total <strong>{sheetSyncMeta.totalRows}</strong> order disinkronkan dari Google Sheets. Terakhir diperbarui jam {sheetSyncMeta.fetchedAt}.
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto shrink-0">
            {/* Source Filter Switcher */}
            <div className="bg-emerald-950/60 p-1 rounded-xl border border-emerald-700/50 flex items-center gap-1 text-xs font-bold">
              <button
                onClick={() => setSourceFilter("all")}
                className={`px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  sourceFilter === "all" ? "bg-white text-emerald-950 font-extrabold" : "text-emerald-200 hover:text-white"
                }`}
              >
                Semua ({orders.length})
              </button>
              <button
                onClick={() => setSourceFilter("sheets")}
                className={`px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                  sourceFilter === "sheets" ? "bg-white text-emerald-950 font-extrabold" : "text-emerald-200 hover:text-white"
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" /> Sheet ({orders.filter((o) => o.source === "Google Sheet").length})
              </button>
              <button
                onClick={() => setSourceFilter("local")}
                className={`px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                  sourceFilter === "local" ? "bg-white text-emerald-950 font-extrabold" : "text-emerald-200 hover:text-white"
                }`}
              >
                <Database className="w-3.5 h-3.5" /> System ({orders.filter((o) => o.source !== "Google Sheet").length})
              </button>
            </div>

            <button
              onClick={() => syncGoogleSheets(true)}
              disabled={isSyncingSheets}
              className="bg-white hover:bg-emerald-50 text-emerald-900 font-extrabold text-xs px-3.5 py-2 rounded-xl transition-all shadow hover:shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-75"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingSheets ? "animate-spin text-emerald-600" : ""}`} />
              {isSyncingSheets ? "Syncing..." : "Sync Google Sheets"}
            </button>
          </div>
        </div>
      )}

      {/* 4 Interactive Kolom KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div onClick={() => setStatusFilter("all")} className="cursor-pointer transition-transform hover:scale-[1.015]">
          <StatCard
            title="Total Order"
            value={String(stats.total)}
            icon={ShoppingCart}
            statusType="neutral"
            description="Total active orders this month"
          />
        </div>
        <div onClick={() => setStatusFilter("open")} className="cursor-pointer transition-transform hover:scale-[1.015]">
          <StatCard
            title="Open Queue"
            value={String(stats.open)}
            statusType="warning"
            description={`Awaiting vehicle placement (${stats.openPct}%)`}
          />
        </div>
        <div onClick={() => setStatusFilter("in_progress")} className="cursor-pointer transition-transform hover:scale-[1.015]">
          <StatCard
            title="In Progress"
            value={String(stats.inProgress)}
            statusType="info"
            description={`Containers in transit (${stats.inProgressPct}%)`}
          />
        </div>
        <div onClick={() => setStatusFilter("done")} className="cursor-pointer transition-transform hover:scale-[1.015]">
          <StatCard
            title="Completed (Done)"
            value={String(stats.done)}
            statusType="success"
            description={`Safely arrived & processed (${stats.donePct}%)`}
          />
        </div>
      </div>

      {/* Breakdown Tipe Order (Clickable Cards with Live Segmented Bars) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {typeBreakdowns.map((b) => (
          <div
            key={b.type}
            onClick={() => setTypeFilter(b.type)}
            className={`bg-white rounded-2xl border transition-all cursor-pointer p-5 shadow-sm hover:shadow-md ${
              typeFilter === b.type ? "ring-2 ring-[#0B2C6B] border-[#0B2C6B]" : "border-gray-200"
            }`}
          >
            <div className="flex justify-between items-center mb-3">
              <span className={`text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-md ${b.styles.tag}`}>
                {b.label}
              </span>
              <span className={`text-sm font-extrabold ${b.styles.totalText}`}>{b.total} total</span>
            </div>
            <div className="space-y-2 mt-4">
              <div className="flex justify-between text-xs font-semibold text-gray-500">
                <span>Open: {b.open}</span>
                <span>In Progress: {b.inProgress}</span>
                <span>Done: {b.done}</span>
              </div>
              {/* Custom Multi-Segment Segmented Progress Bar */}
              <div className="w-full h-3.5 bg-gray-100 rounded-full flex overflow-hidden border border-gray-200/80 shadow-inner">
                <motion.div initial={{ width: 0 }} animate={{ width: `${b.openPct}%` }} transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }} className="bg-sky-500 h-full" title={`Open: ${b.open}`} />
                <motion.div initial={{ width: 0 }} animate={{ width: `${b.inProgressPct}%` }} transition={{ duration: 1, delay: 0.1, ease: [0.16, 1, 0.3, 1] }} className="bg-blue-500 h-full" title={`In Progress: ${b.inProgress}`} />
                <motion.div initial={{ width: 0 }} animate={{ width: `${b.donePct}%` }} transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }} className="bg-emerald-500 h-full" title={`Done: ${b.done}`} />
              </div>
              <div className="flex justify-between text-[10px] text-gray-400 font-bold pt-1 uppercase tracking-wider">
                <span>{b.open} Open</span>
                <span>{b.inProgress} Transit</span>
                <span>{b.done} Done</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Global Search Bar */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search keyword (ID, Customer, Origin, Dest...)"
              className="w-full bg-gray-50 border border-gray-200 text-xs sm:text-sm rounded-xl pl-9 pr-8 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0B2C6B] text-gray-800 placeholder-gray-400 font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Key Field Specific Filters */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Filter by Order ID */}
            <div className="relative min-w-[140px] flex-1 sm:flex-initial">
              <input
                type="text"
                value={orderIdFilter}
                onChange={(e) => setOrderIdFilter(e.target.value)}
                placeholder="Order ID..."
                className="w-full bg-gray-50 border border-gray-200 text-xs font-bold rounded-xl px-3 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0B2C6B] text-gray-800 placeholder-gray-400 font-mono"
              />
              {orderIdFilter && (
                <button
                  onClick={() => setOrderIdFilter("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Customer Dropdown */}
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 flex-1 sm:flex-initial">
              <Filter className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <select
                value={customerFilter}
                onChange={(e) => setCustomerFilter(e.target.value)}
                className="text-xs font-bold text-gray-700 bg-transparent border-none focus:outline-none cursor-pointer w-full max-w-[160px] truncate"
              >
                <option value="all">Customer: All</option>
                {customerOptions.map((cust) => (
                  <option key={cust} value={cust}>
                    {cust}
                  </option>
                ))}
              </select>
            </div>

            {/* Dropdown Tipe */}
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 flex-1 sm:flex-initial">
              <Filter className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="text-xs font-bold text-gray-700 bg-transparent border-none focus:outline-none cursor-pointer"
              >
                <option value="all">Tipe: All</option>
                <option value="ekspor">Ekspor Only</option>
                <option value="impor">Impor Only</option>
                <option value="repo">Repo Only</option>
              </select>
            </div>

            {/* Dropdown Status */}
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 flex-1 sm:flex-initial">
              <Filter className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs font-bold text-gray-700 bg-transparent border-none focus:outline-none cursor-pointer"
              >
                <option value="all">Status: All</option>
                <option value="open">Open (Queue)</option>
                <option value="in_progress">In Progress (Transit)</option>
                <option value="done">Done (Completed)</option>
              </select>
            </div>

            {/* Clear Filter button */}
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-50/80 hover:bg-sky-100 transition-colors cursor-pointer shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* Active Filter Badges / Chips */}
        {hasActiveFilters && (
          <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">Active Filters:</span>
              {searchQuery && (
                <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-800 font-semibold px-2.5 py-1 rounded-lg border border-slate-200">
                  Search: "{searchQuery}"
                  <X className="w-3 h-3 hover:text-red-500 cursor-pointer" onClick={() => setSearchQuery("")} />
                </span>
              )}
              {orderIdFilter && (
                <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-800 font-mono font-bold px-2.5 py-1 rounded-lg border border-blue-200">
                  ID: {orderIdFilter}
                  <X className="w-3 h-3 hover:text-red-500 cursor-pointer" onClick={() => setOrderIdFilter("")} />
                </span>
              )}
              {customerFilter !== "all" && (
                <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-800 font-bold px-2.5 py-1 rounded-lg border border-indigo-200">
                  Customer: {customerFilter}
                  <X className="w-3 h-3 hover:text-red-500 cursor-pointer" onClick={() => setCustomerFilter("all")} />
                </span>
              )}
              {typeFilter !== "all" && (
                <span className="inline-flex items-center gap-1 bg-sky-50 text-sky-800 font-bold px-2.5 py-1 rounded-lg border border-sky-200 uppercase">
                  Tipe: {typeFilter}
                  <X className="w-3 h-3 hover:text-red-500 cursor-pointer" onClick={() => setTypeFilter("all")} />
                </span>
              )}
              {statusFilter !== "all" && (
                <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 font-bold px-2.5 py-1 rounded-lg border border-emerald-200 uppercase">
                  Status: {statusFilter.replace("_", " ")}
                  <X className="w-3 h-3 hover:text-red-500 cursor-pointer" onClick={() => setStatusFilter("all")} />
                </span>
              )}
            </div>

            <span className="text-xs font-bold text-gray-500">
              Showing <strong className="text-gray-900 font-extrabold">{filteredOrders.length}</strong> of {orders.length} orders
            </span>
          </div>
        )}
      </div>

      {/* Main Data Table */}
      <div className="relative">
        <DataTable
          columns={columns}
          data={filteredOrders}
          onRowClick={(order) => setSelectedOrder(order)}
          itemsPerPage={10}
        />
      </div>

      {/* Order Expand Details Modal (Responsive Slide-over) */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedOrder(null)}
              className="absolute inset-0 bg-gray-900"
            />

            {/* Slide over sheet */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="bg-white w-full max-w-lg h-full relative z-10 shadow-2xl flex flex-col justify-between"
            >
              {/* Sheet Header */}
              <div className="bg-[#0B2C6B] text-white p-6 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-widest text-cyan-300">
                    Order Details & Operations
                  </span>
                  <h3 className="text-xl font-extrabold tracking-tight mt-1 font-mono">
                    {selectedOrder.id}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-2 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Sheet Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* Visual Badges Row */}
                <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Service Type</span>
                    <StatusBadge status={selectedOrder.type} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Operational Status</span>
                    <StatusBadge status={selectedOrder.status} />
                  </div>
                </div>

                {/* Status Advancement Quick Control */}
                <div className="bg-blue-50/60 border border-blue-200/80 p-4 rounded-xl space-y-2">
                  <span className="text-xs font-black text-[#0B2C6B] block">Update Status Order Live:</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAdvanceStatus(selectedOrder.id, "open")}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold border cursor-pointer ${
                        selectedOrder.status === "open" ? "bg-amber-500 text-white border-amber-600" : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      Open Queue
                    </button>
                    <button
                      onClick={() => handleAdvanceStatus(selectedOrder.id, "in_progress")}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold border cursor-pointer ${
                        selectedOrder.status === "in_progress" ? "bg-blue-600 text-white border-blue-700" : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      In Progress
                    </button>
                    <button
                      onClick={() => handleAdvanceStatus(selectedOrder.id, "done")}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold border cursor-pointer ${
                        selectedOrder.status === "done" ? "bg-emerald-600 text-white border-emerald-700" : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      Done
                    </button>
                  </div>
                </div>

                {/* Routing info card */}
                <div className="space-y-4">
                  <h4 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest border-b pb-1.5">
                    Routing Information
                  </h4>
                  <div className="flex items-center gap-4 bg-blue-50/50 p-4 rounded-xl border border-blue-100/50">
                    <div className="flex-1">
                      <span className="text-[10px] text-gray-400 font-bold uppercase block">Origin Loading Point</span>
                      <span className="text-sm font-bold text-[#0B2C6B] block mt-1">{selectedOrder.origin}</span>
                    </div>
                    <ArrowRight className="w-5 h-5 text-blue-400 shrink-0" />
                    <div className="flex-1">
                      <span className="text-[10px] text-gray-400 font-bold uppercase block">Destination Arrive</span>
                      <span className="text-sm font-bold text-gray-800 block mt-1">{selectedOrder.destination}</span>
                    </div>
                  </div>
                </div>

                {/* Logistics Specifications */}
                <div className="space-y-3">
                  <h4 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest border-b pb-1.5">
                    Client & Equipment
                  </h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-gray-50/80 p-3 rounded-lg border border-gray-100">
                      <span className="text-[10px] text-gray-400 font-bold uppercase block">Assigned Customer</span>
                      <span className="text-xs font-black text-gray-700 block mt-1 truncate">{selectedOrder.customer}</span>
                    </div>
                    <div className="bg-gray-50/80 p-3 rounded-lg border border-gray-100">
                      <span className="text-[10px] text-gray-400 font-bold uppercase block">Required Container</span>
                      <span className="text-xs font-black text-gray-700 block mt-1">{selectedOrder.unitType}</span>
                    </div>
                    <div className="bg-blue-50/80 p-3 rounded-lg border border-blue-100">
                      <span className="text-[10px] text-blue-600 font-bold uppercase block">Quantity</span>
                      <span className="text-xs font-black text-blue-800 block mt-1">{selectedOrder.quantity || 1} Container</span>
                    </div>
                  </div>
                </div>

                {/* Schedules & SLA */}
                <div className="space-y-3">
                  <h4 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest border-b pb-1.5">
                    Schedule & SLA
                  </h4>
                  <div className="bg-sky-50/50 border border-sky-100 p-4 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-xs font-extrabold text-sky-800 block">SLA Due Date / ETA</span>
                      <span className="text-sm font-black text-sky-900 mt-1 block">{selectedOrder.eta}</span>
                    </div>
                    <AlertCircle className="w-6 h-6 text-sky-500" />
                  </div>
                </div>

              </div>

              {/* Sheet Actions */}
              <div className="p-6 border-t border-gray-100 bg-gray-50 flex gap-3">
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="flex-1 text-center py-2.5 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-extrabold transition-colors cursor-pointer"
                >
                  Tutup Details
                </button>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="flex-1 text-center py-2.5 rounded-lg bg-[#0B2C6B] hover:bg-blue-800 text-white text-xs font-extrabold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow"
                >
                  <Eye className="w-4 h-4" /> Track Active
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

