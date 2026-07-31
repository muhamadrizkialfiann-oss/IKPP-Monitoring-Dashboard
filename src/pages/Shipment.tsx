import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ShieldCheck, CircleDot, Truck, Clock, Search, Filter, RefreshCw, Navigation, MapPin, Compass, Package, X, CheckCircle2, UserCheck, Shield, ChevronRight, Calendar, AlertCircle, XCircle } from "lucide-react";
import StatCard from "../components/StatCard";
import DataTable, { Column } from "../components/DataTable";
import StatusBadge from "../components/StatusBadge";
import TripStepper from "../components/TripStepper";
import GpsMap from "../components/GpsMap";
import DateRangeFilter, { DateFilterState, filterByDate, parseBookingDate, formatDateIndo } from "../components/DateRangeFilter";
import { dummyShipments } from "../lib/dummy-data";
import { Shipment, TripStatus } from "../types";
import { fetchExecutedShipmentsClient } from "../lib/fetchOrdersClient";
import { mapCSStatus, formatJobOrderCode } from "../lib/statusMapper";
import DetailListModal from "../components/DetailListModal";

export default function ShipmentPage() {
  // Live Shipments state initialized to 0
  const [shipments, setShipments] = useState<Shipment[]>([]);

  // Modal State for viewing detail list of clicked KPI
  const [detailModal, setDetailModal] = useState<{
    isOpen: boolean;
    title: string;
    subtitle?: string;
    data: Shipment[];
  }>({
    isOpen: false,
    title: "",
    data: []
  });

  // Auto-fetch Google Sheets data on mount and poll continuously in real-time
  useEffect(() => {
    let isMounted = true;
    const fetchShipments = async () => {
      try {
        const executed = await fetchExecutedShipmentsClient();
        if (isMounted) {
          if (Array.isArray(executed) && executed.length > 0) {
            const list: Shipment[] = executed.map((o: any, idx: number) => {
              const { shipmentStatus } = mapCSStatus(o.lastUpdateCS);
              const tripStatus: TripStatus = shipmentStatus;
              return {
                id: o.id || `SHP-${String(idx + 1).padStart(4, "0")}`,
                orderRef: o.noJobOrder || o.poolingId || o.id || "SM-D000001",
                type: o.type || "ekspor",
                tripStatus,
                unit: o.vehiclePlate && o.vehiclePlate !== "#N/A" && o.vehiclePlate !== "N/A" ? o.vehiclePlate : "",
                driver: o.driver && o.driver !== "#N/A" && o.driver !== "N/A" ? o.driver : "",
                currentLocation: (o.statusRealtime || o.origin) && (o.statusRealtime || o.origin) !== "#N/A" && (o.statusRealtime || o.origin) !== "N/A" ? (o.statusRealtime || o.origin) : "",
                eta: o.eta && o.eta !== "#N/A" && o.eta !== "N/A" ? o.eta : "",
                bookingDate: o.bookingDate && o.bookingDate !== "#N/A" && o.bookingDate !== "N/A" ? o.bookingDate : "",
                customer: o.customer || "INDAH KIAT PULP & PAPER TBK.",
                quantity: 1,
                lastUpdateCS: o.lastUpdateCS,
                orderStatus: o.status
              };
            });
            setShipments(list);
          } else {
            setShipments([]);
          }
        }
      } catch (err) {
        if (isMounted) setShipments([]);
      }
    };

    fetchShipments();
    const interval = setInterval(fetchShipments, 10000); // Live real-time sync every 10s
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [orderIdFilter, setOrderIdFilter] = useState("");
  const [customerFilter, setCustomerFilter] = useState<string>("all");
  const [tripStatusFilter, setTripStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<DateFilterState>({
    startDate: "",
    endDate: "",
    preset: "auto"
  });

  // Selected Shipment for Detail / Status Advance Drawer
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);

  // Notification Toast
  const [notification, setNotification] = useState<string | null>(null);

  // Unique Customer list derived dynamically from shipments
  const customerOptions = useMemo(() => {
    const set = new Set<string>();
    shipments.forEach((s) => {
      if (s.customer) set.add(s.customer);
    });
    return Array.from(set).sort();
  }, [shipments]);

  // Available months list derived dynamically for Month filter
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    shipments.forEach((s) => {
      const dt = parseBookingDate(s.bookingDate);
      if (dt) {
        const monthKey = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
        set.add(monthKey);
      }
    });
    return Array.from(set).sort();
  }, [shipments]);

  const handleResetFilters = () => {
    setSearchQuery("");
    setOrderIdFilter("");
    setCustomerFilter("all");
    setTripStatusFilter("all");
    setTypeFilter("all");
    setDateFilter({ startDate: "", endDate: "", preset: "auto" });
  };

  const hasActiveFilters = Boolean(
    searchQuery || orderIdFilter || customerFilter !== "all" || tripStatusFilter !== "all" || typeFilter !== "all" || dateFilter.startDate || dateFilter.endDate
  );

  // Shipments filtered by date range for the top dashboard KPIs, trip stepper, and matrix
  const dateFilteredShipments = useMemo(() => {
    return shipments.filter((shp) => filterByDate(shp.bookingDate, dateFilter));
  }, [shipments, dateFilter]);

  // Dynamic KPI Counts (filtered by dateFilter)
  const stats = useMemo(() => {
    const total = dateFilteredShipments.length;
    const cancel = dateFilteredShipments.filter(
      (s) =>
        s.tripStatus === "cancel" ||
        (s.orderStatus || "").toLowerCase().includes("cancel") ||
        (s.lastUpdateCS || "").toLowerCase().includes("cancel")
    ).length;

    const rawPreTrip = dateFilteredShipments.filter((s) => s.tripStatus === "pre_trip").length;
    // Pre-Trip excludes cancelled trips (e.g., 292 - 24 = 268)
    const preTrip = Math.max(0, rawPreTrip - cancel);
    const onTrip = dateFilteredShipments.filter((s) => s.tripStatus === "on_trip").length;
    const endTrip = dateFilteredShipments.filter((s) => s.tripStatus === "end_trip").length;
    
    // WAITING BON MUAT from lastUpdateCS (strictly matching BON MUAT)
    const waitingBonMuat = dateFilteredShipments.filter((s) => (s.lastUpdateCS || "").toUpperCase().includes("BON MUAT")).length;
    // PENDING SHIPMENT based on WAITING BON MUAT / HOLD
    const pendingShipment = dateFilteredShipments.filter((s) => {
      const cs = (s.lastUpdateCS || "").toUpperCase();
      return cs.includes("BON MUAT") || cs.includes("HOLD") || s.orderStatus === "hold";
    }).length;

    const activeTotal = preTrip + onTrip + endTrip;

    return {
      total,
      activeTotal,
      cancel,
      preTrip,
      onTrip,
      endTrip,
      waitingBonMuat,
      pendingShipment,
      preTripPct: activeTotal > 0 ? Math.round((preTrip / activeTotal) * 100) : 0,
      onTripPct: activeTotal > 0 ? Math.round((onTrip / activeTotal) * 100) : 0,
      endTripPct: activeTotal > 0 ? Math.round((endTrip / activeTotal) * 100) : 0
    };
  }, [dateFilteredShipments]);

  // Matrix Breakdown calculated dynamically from shipments (filtered by dateFilter)
  const breakdownMatrix = useMemo(() => {
    const types = [
      { key: "ekspor", label: "Ekspor" },
      { key: "impor", label: "Impor" },
      { key: "repo", label: "Repo" }
    ];

    return types.map((t) => {
      const typeShipments = dateFilteredShipments.filter((s) => s.type === t.key);
      const preTrip = typeShipments.filter((s) => s.tripStatus === "pre_trip").length;
      const onTrip = typeShipments.filter((s) => s.tripStatus === "on_trip").length;
      const endTrip = typeShipments.filter((s) => s.tripStatus === "end_trip").length;
      const total = typeShipments.length;
      return {
        key: t.key,
        type: t.label,
        preTrip,
        onTrip,
        endTrip,
        total
      };
    });
  }, [dateFilteredShipments]);

  // Filtering logic
  const filteredShipments = useMemo(() => {
    return dateFilteredShipments.filter((shp) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        shp.id.toLowerCase().includes(q) ||
        shp.orderRef.toLowerCase().includes(q) ||
        (shp.customer && shp.customer.toLowerCase().includes(q)) ||
        shp.driver.toLowerCase().includes(q) ||
        shp.unit.toLowerCase().includes(q) ||
        shp.currentLocation.toLowerCase().includes(q);

      const idQ = orderIdFilter.toLowerCase().trim();
      const matchesOrderId = !idQ || shp.orderRef.toLowerCase().includes(idQ) || shp.id.toLowerCase().includes(idQ);

      const matchesCustomer =
        customerFilter === "all" ||
        (shp.customer && shp.customer.toLowerCase() === customerFilter.toLowerCase());

      const matchesTripStatus =
        tripStatusFilter === "all" ||
        shp.tripStatus === tripStatusFilter ||
        (tripStatusFilter === "cancel" &&
          (shp.tripStatus === "cancel" ||
            (shp.orderStatus || "").toLowerCase().includes("cancel") ||
            (shp.lastUpdateCS || "").toLowerCase().includes("cancel")));
      const matchesType = typeFilter === "all" || shp.type === typeFilter;

      return matchesSearch && matchesOrderId && matchesCustomer && matchesTripStatus && matchesType;
    });
  }, [dateFilteredShipments, searchQuery, orderIdFilter, customerFilter, tripStatusFilter, typeFilter]);

  // Handler: Advance or set Trip Status Live
  const handleUpdateTripStatus = (shipmentId: string, nextStatus: TripStatus) => {
    const etaText = nextStatus === "end_trip" ? "Completed" : nextStatus === "on_trip" ? "In Transit (~3 Jam)" : "Standby Loading";

    setShipments((prev) =>
      prev.map((s) =>
        s.id === shipmentId
          ? {
              ...s,
              tripStatus: nextStatus,
              eta: etaText
            }
          : s
      )
    );

    if (selectedShipment && selectedShipment.id === shipmentId) {
      setSelectedShipment({
        ...selectedShipment,
        tripStatus: nextStatus,
        eta: etaText
      });
    }

    setNotification(`Status trip ${shipmentId} diubah ke ${nextStatus.toUpperCase().replace("_", " ")}!`);
    setTimeout(() => setNotification(null), 4000);
  };

  // Columns for Shipment table
  const columns: Column<Shipment>[] = [
    {
      key: "id",
      header: "Shipment ID",
      sortable: true,
      render: (item) => <span className="font-mono font-bold text-xs sm:text-sm text-blue-900">{item.id}</span>
    },
    {
      key: "orderRef",
      header: "NO JOB ORDER",
      sortable: true,
      render: (item) => (
        <span className="font-mono text-xs sm:text-sm font-extrabold text-[#0B2C6B] dark:text-sky-400 bg-sky-50 dark:bg-sky-950/80 px-2.5 py-1 rounded border border-sky-200 dark:border-sky-800">
          {formatJobOrderCode(item.orderRef)}
        </span>
      )
    },
    {
      key: "customer",
      header: "Customer",
      sortable: true,
      render: (item) => <span className="font-semibold text-xs sm:text-sm text-gray-800">{item.customer || "PT IKPP"}</span>
    },
    {
      key: "type",
      header: "Tipe",
      sortable: true,
      render: (item) => <StatusBadge status={item.type} />
    },
    {
      key: "tripStatus",
      header: "Status Trip",
      sortable: true,
      render: (item) => <StatusBadge status={item.tripStatus} />
    },
    {
      key: "unit",
      header: "Unit / Plat No",
      sortable: true,
      render: (item) => (
        item.unit && item.unit !== "#N/A" && item.unit !== "N/A" ? (
          <span className="text-xs sm:text-sm font-bold px-2.5 py-1 rounded border bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-200 border-gray-200 dark:border-slate-700">
            {item.unit}
          </span>
        ) : null
      )
    },
    {
      key: "driver",
      header: "Driver",
      sortable: true,
      render: (item) => (
        item.driver && item.driver !== "#N/A" && item.driver !== "N/A" ? (
          <span className="font-semibold text-xs sm:text-sm text-gray-800 dark:text-slate-200">
            {item.driver}
          </span>
        ) : null
      )
    },
    {
      key: "currentLocation",
      header: "Lokasi Terkini",
      sortable: true,
      render: (item) => (
        item.currentLocation && item.currentLocation !== "#N/A" && item.currentLocation !== "N/A" ? (
          <span className="text-xs sm:text-sm flex items-center gap-1.5 font-medium text-gray-700 dark:text-slate-300">
            <MapPin className="w-4 h-4 text-sky-500 shrink-0" />
            {item.currentLocation}
          </span>
        ) : null
      )
    },
    {
      key: "bookingDate",
      header: "Booking Date",
      sortable: true,
      render: (item) => (
        item.bookingDate && item.bookingDate !== "#N/A" && item.bookingDate !== "N/A" ? (
          <span className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-slate-300 flex items-center gap-1.5 whitespace-nowrap">
            <Calendar className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            {item.bookingDate}
          </span>
        ) : <span className="text-xs text-gray-400">-</span>
      )
    },
    {
      key: "eta",
      header: "ETA",
      sortable: true,
      render: (item) => (
        item.eta && item.eta !== "#N/A" && item.eta !== "N/A" ? (
          <span className={`text-xs sm:text-sm font-bold ${item.eta === "Completed" ? "text-emerald-600" : "text-gray-600 dark:text-slate-400"}`}>
            {item.eta}
          </span>
        ) : null
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

      {/* Title Header Card */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3.5 transition-colors duration-200">
        <div className="p-2.5 bg-blue-50 dark:bg-sky-950/60 text-[#0B2C6B] dark:text-sky-400 rounded-xl border border-blue-100 dark:border-sky-800 shrink-0">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-base sm:text-lg font-extrabold text-gray-900 dark:text-slate-100">
            Dashboard - Shipment Tracking &amp; Pipeline
          </h2>
          <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">
            Active pre-trip &amp; transit GPS status checkpoints
          </p>
        </div>
      </div>

      {/* Top Date Range Filter Control Bar */}
      <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between gap-3 transition-colors duration-200">
        <div className="flex items-center gap-2">
          {(dateFilter.startDate || dateFilter.endDate) && (
            <span className="text-[10px] font-black text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80 px-2.5 py-1 rounded-lg border border-amber-300 dark:border-amber-700">
              {formatDateIndo(dateFilter.startDate)} s/d {formatDateIndo(dateFilter.endDate)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <DateRangeFilter value={dateFilter} onChange={setDateFilter} align="right" />
          {(dateFilter.startDate || dateFilter.endDate || (dateFilter.preset && dateFilter.preset !== "auto")) && (
            <button
              onClick={() => setDateFilter({ startDate: "", endDate: "", preset: "auto" })}
              className="text-[11px] font-extrabold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 hover:bg-red-100 dark:hover:bg-red-900/80 px-3 py-2.5 rounded-xl border border-red-200 dark:border-red-800 transition-all cursor-pointer flex items-center gap-1 shrink-0"
              title="Reset Filter Tanggal"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* 6 Kolom KPI Stats (Clickable to view detail modal popup & filter) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <div
          onClick={() => {
            setTripStatusFilter("all");
            setDetailModal({
              isOpen: true,
              title: "Detail Data: Total Shipment",
              subtitle: "Seluruh data eksekusi shipment dalam periode terpilih",
              data: dateFilteredShipments,
            });
          }}
          className="cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          <StatCard
            title="Total Shipment"
            value={String(stats.total)}
            icon={Package}
            statusType="neutral"
            description="Total Executed Trips"
          />
        </div>
        <div
          onClick={() => {
            setTripStatusFilter("cancel");
            const cancelList = dateFilteredShipments.filter(
              (s) =>
                s.tripStatus === "cancel" ||
                (s.orderStatus || "").toLowerCase().includes("cancel") ||
                (s.lastUpdateCS || "").toLowerCase().includes("cancel")
            );
            setDetailModal({
              isOpen: true,
              title: "Detail Data: Total Cancel Customer",
              subtitle: "Trip shipment dengan status order cancel customer",
              data: cancelList,
            });
          }}
          className="cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          <StatCard
            title="Total Cancel Customer"
            value={String(stats.cancel)}
            icon={XCircle}
            statusType="danger"
            description="Status Order Cancel"
          />
        </div>
        <div
          onClick={() => {
            const pendingList = dateFilteredShipments.filter((s) => {
              const cs = (s.lastUpdateCS || "").toUpperCase();
              return cs.includes("BON MUAT") || cs.includes("HOLD") || s.orderStatus === "hold";
            });
            setDetailModal({
              isOpen: true,
              title: "Detail Data: Pending Shipment",
              subtitle: "Shipment dalam antrian Bon Muat atau status Hold CS",
              data: pendingList,
            });
          }}
          className="cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          <StatCard
            title="Pending Shipment"
            value={String(stats.pendingShipment)}
            icon={AlertCircle}
            statusType="danger"
            description="Waiting Bon Muat"
          />
        </div>
        <div
          onClick={() => {
            setTripStatusFilter("pre_trip");
            const preTripList = dateFilteredShipments.filter((s) => {
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
            });
          }}
          className="cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          <StatCard
            title="Pre-Trip"
            value={String(stats.preTrip)}
            statusType="warning"
            description={`Prep & loading queues (${stats.preTripPct}%)`}
          />
        </div>
        <div
          onClick={() => {
            setTripStatusFilter("on_trip");
            const onTripList = dateFilteredShipments.filter((s) => s.tripStatus === "on_trip");
            setDetailModal({
              isOpen: true,
              title: "Detail Data: On Trip",
              subtitle: "Armada sedang dalam perjalanan ke lokasi tujuan (In Transit)",
              data: onTripList,
            });
          }}
          className="cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          <StatCard
            title="On Trip"
            value={String(stats.onTrip)}
            statusType="info"
            description={`Active in transit (${stats.onTripPct}%)`}
          />
        </div>
        <div
          onClick={() => {
            setTripStatusFilter("end_trip");
            const endTripList = dateFilteredShipments.filter((s) => s.tripStatus === "end_trip");
            setDetailModal({
              isOpen: true,
              title: "Detail Data: End Trip",
              subtitle: "Pengiriman barang telah selesai dan armada tiba dengan aman",
              data: endTripList,
            });
          }}
          className="cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          <StatCard
            title="End Trip"
            value={String(stats.endTrip)}
            statusType="success"
            description={`Safely arrived (${stats.endTripPct}%)`}
          />
        </div>
      </div>

      {/* Visual Stepper Progress Tracker (3 step: Pre Trip -> On Trip -> End Trip) */}
      <TripStepper
        preTripCount={stats.preTrip}
        onTripCount={stats.onTrip}
        endTripCount={stats.endTrip}
      />

      {/* Live GPS Fleet Transit Radar Map */}
      <GpsMap />

      {/* Split layout: Breakdown Matrix Table & Live Delivery SLA stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Matrix Breakdown (Left 2 cols) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 shadow-sm lg:col-span-2 transition-colors duration-200">
          <h3 className="text-base font-extrabold text-gray-900 dark:text-slate-100 pb-3 border-b border-gray-100 dark:border-slate-800 flex items-center gap-2">
            <Compass className="w-5 h-5 text-[#0B2C6B] dark:text-sky-400" />
            Breakdown Tipe Order x Status Trip
          </h3>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left border-collapse text-sm sm:text-base font-bold">
              <thead>
                <tr className="border-b border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-300 font-extrabold uppercase tracking-wider text-xs sm:text-sm">
                  <th className="pb-3 text-left">Tipe Order</th>
                  <th className="pb-3 text-center">Pre-Trip</th>
                  <th className="pb-3 text-center">On Trip</th>
                  <th className="pb-3 text-center">End Trip</th>
                  <th className="pb-3 text-center bg-gray-50 dark:bg-slate-800 text-gray-800 dark:text-slate-200 rounded-t-lg">Total Shipment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800 text-gray-800 dark:text-slate-200 font-semibold">
                {breakdownMatrix.map((row, idx) => (
                  <tr
                    key={idx}
                    onClick={() => setTypeFilter(row.key)}
                    className={`hover:bg-blue-50/50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer ${
                      typeFilter === row.key ? "bg-blue-50/80 dark:bg-slate-800 font-black" : ""
                    }`}
                  >
                    <td className="py-4 font-extrabold text-gray-950 dark:text-slate-100 flex items-center gap-2 text-sm sm:text-base">
                      <span className={`w-3 h-3 rounded-full ${
                        row.type === "Ekspor" ? "bg-sky-500" : row.type === "Impor" ? "bg-blue-500" : "bg-emerald-500"
                      }`}></span>
                      {row.type}
                    </td>
                    <td className="py-4 text-center text-sky-800 dark:text-sky-400 font-extrabold font-mono text-sm sm:text-base">{row.preTrip}</td>
                    <td className="py-4 text-center text-blue-800 dark:text-blue-400 font-extrabold font-mono text-sm sm:text-base">{row.onTrip}</td>
                    <td className="py-4 text-center text-emerald-800 dark:text-emerald-400 font-extrabold font-mono text-sm sm:text-base">{row.endTrip}</td>
                    <td className="py-4 text-center font-black text-gray-950 dark:text-slate-100 bg-gray-50/75 dark:bg-slate-800/80 rounded-b-lg font-mono text-sm sm:text-base">{row.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live SLA Service Stats (Right 1 col) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 shadow-sm flex flex-col justify-between transition-colors duration-200">
          <div>
            <h3 className="text-base font-extrabold text-gray-900 dark:text-slate-100 pb-3 border-b border-gray-100 dark:border-slate-800 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              Delivery SLA Standards
            </h3>

            <div className="mt-5 space-y-4">
              <div className="bg-emerald-50/50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/60 p-4 rounded-xl text-center">
                <span className="text-[10px] text-emerald-800 dark:text-emerald-300 font-bold uppercase tracking-wider block">On-Time Delivery Rate</span>
                <span className="text-4xl font-black block text-emerald-700 dark:text-emerald-400 mt-1">94.8%</span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 block mt-1">SLA target exceeded (+3.8%)</span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="bg-gray-50/80 dark:bg-slate-800/80 p-3 rounded-lg border border-gray-100 dark:border-slate-700">
                  <span className="text-[9px] text-gray-400 dark:text-slate-400 font-bold block uppercase tracking-wider">Avg Loading SLA</span>
                  <span className="text-base font-bold text-gray-800 dark:text-slate-100 mt-0.5 block">1.8 hrs</span>
                </div>
                <div className="bg-gray-50/80 dark:bg-slate-800/80 p-3 rounded-lg border border-gray-100 dark:border-slate-700">
                  <span className="text-[9px] text-gray-400 dark:text-slate-400 font-bold block uppercase tracking-wider">Avg Transit SLA</span>
                  <span className="text-base font-bold text-gray-800 dark:text-slate-100 mt-0.5 block">14.2 hrs</span>
                </div>
              </div>
            </div>
          </div>

          <p className="text-[10px] text-gray-400 dark:text-slate-500 font-bold uppercase tracking-wider mt-5">
            Updated Real-time Live
          </p>
        </div>

      </div>

      {/* Shipment Data Table Section */}
      <div className="space-y-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm space-y-4 transition-colors duration-200">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-3 border-b border-gray-100 dark:border-slate-800">
            <div>
              <h3 className="text-base font-extrabold text-gray-900 dark:text-slate-100">Shipment Monitoring Log (Klik Row untuk Action/Advance Trip)</h3>
              <p className="text-xs text-gray-400 dark:text-slate-400 font-semibold mt-0.5">Real-time GPS transit checkpoints & trip status switcher</p>
            </div>

            <div className="text-xs font-bold text-gray-500 dark:text-slate-400">
              Showing <strong className="text-blue-900 dark:text-sky-400 font-extrabold">{filteredShipments.length}</strong> of {shipments.length} shipments
            </div>
          </div>

          {/* Table Filters */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            {/* Global Search Input */}
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-3.5 h-3.5 text-gray-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Shp ID, Driver, Plat No, Location..."
                className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs font-medium rounded-xl pl-8 pr-7 py-2.5 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B2C6B] dark:focus:ring-sky-500 text-gray-800 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Field Specific Filters */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Order ID Filter */}
              <div className="relative min-w-[130px] flex-1 sm:flex-initial">
                <input
                  type="text"
                  value={orderIdFilter}
                  onChange={(e) => setOrderIdFilter(e.target.value)}
                  placeholder="Order Ref ID..."
                  className="w-full bg-gray-50 border border-gray-200 text-xs font-bold rounded-xl px-3 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0B2C6B] text-gray-800 font-mono placeholder-gray-400"
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

              {/* Customer Dropdown Selector */}
              <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-2 flex-1 sm:flex-initial">
                <Filter className="w-3 h-3 text-gray-400 shrink-0" />
                <select
                  value={customerFilter}
                  onChange={(e) => setCustomerFilter(e.target.value)}
                  className="text-xs font-bold text-gray-700 bg-transparent border-none focus:outline-none cursor-pointer max-w-[150px] truncate"
                >
                  <option value="all">Customer: All</option>
                  {customerOptions.map((cust) => (
                    <option key={cust} value={cust}>
                      {cust}
                    </option>
                  ))}
                </select>
              </div>

              {/* Trip Status Selector */}
              <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-2 flex-1 sm:flex-initial">
                <Filter className="w-3 h-3 text-gray-400 shrink-0" />
                <select
                  value={tripStatusFilter}
                  onChange={(e) => setTripStatusFilter(e.target.value)}
                  className="text-xs font-bold text-gray-700 bg-transparent border-none focus:outline-none cursor-pointer"
                >
                  <option value="all">Trip Status: All</option>
                  <option value="pre_trip">Pre-Trip</option>
                  <option value="on_trip">On Trip</option>
                  <option value="end_trip">End Trip</option>
                  <option value="cancel">Cancel / Anomali</option>
                </select>
              </div>

              {/* Order Type Selector */}
              <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-2 flex-1 sm:flex-initial">
                <Filter className="w-3 h-3 text-gray-400 shrink-0" />
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="text-xs font-bold text-gray-700 bg-transparent border-none focus:outline-none cursor-pointer"
                >
                  <option value="all">Order Tipe: All</option>
                  <option value="ekspor">Ekspor Only</option>
                  <option value="impor">Impor Only</option>
                  <option value="repo">Repo Only</option>
                </select>
              </div>

              {/* Date Range & Month Filter Component */}
              <DateRangeFilter
                value={dateFilter}
                onChange={setDateFilter}
                availableMonths={availableMonths}
              />

              {hasActiveFilters && (
                <button
                  onClick={handleResetFilters}
                  className="text-xs font-bold text-sky-600 hover:text-sky-700 bg-sky-50 px-3 py-2 rounded-xl flex items-center gap-1 cursor-pointer hover:bg-sky-100 transition-colors shrink-0"
                >
                  <RefreshCw className="w-3 h-3" /> Reset Filters
                </button>
              )}
            </div>
          </div>

          {/* Active Filter Chips */}
          {hasActiveFilters && (
            <div className="pt-2 border-t border-gray-100 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">Active Filters:</span>
              {searchQuery && (
                <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-800 font-semibold px-2.5 py-0.5 rounded-lg border border-slate-200">
                  Search: "{searchQuery}"
                  <X className="w-3 h-3 hover:text-red-500 cursor-pointer" onClick={() => setSearchQuery("")} />
                </span>
              )}
              {orderIdFilter && (
                <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-800 font-mono font-bold px-2.5 py-0.5 rounded-lg border border-blue-200">
                  Order ID: {orderIdFilter}
                  <X className="w-3 h-3 hover:text-red-500 cursor-pointer" onClick={() => setOrderIdFilter("")} />
                </span>
              )}
              {customerFilter !== "all" && (
                <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-800 font-bold px-2.5 py-0.5 rounded-lg border border-indigo-200">
                  Customer: {customerFilter}
                  <X className="w-3 h-3 hover:text-red-500 cursor-pointer" onClick={() => setCustomerFilter("all")} />
                </span>
              )}
              {typeFilter !== "all" && (
                <span className="inline-flex items-center gap-1 bg-sky-50 text-sky-800 font-bold px-2.5 py-0.5 rounded-lg border border-sky-200 uppercase">
                  Tipe: {typeFilter}
                  <X className="w-3 h-3 hover:text-red-500 cursor-pointer" onClick={() => setTypeFilter("all")} />
                </span>
              )}
              {tripStatusFilter !== "all" && (
                <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 font-bold px-2.5 py-0.5 rounded-lg border border-amber-200 uppercase">
                  Trip Status: {tripStatusFilter.replace("_", " ")}
                  <X className="w-3 h-3 hover:text-red-500 cursor-pointer" onClick={() => setTripStatusFilter("all")} />
                </span>
              )}
              {(dateFilter.startDate || dateFilter.endDate) && (
                <span className="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 font-bold px-2.5 py-0.5 rounded-lg border border-amber-200 dark:border-amber-800">
                  Tgl Booking: {dateFilter.startDate ? formatDateIndo(dateFilter.startDate) : "Awal"} s/d {dateFilter.endDate ? formatDateIndo(dateFilter.endDate) : "Akhir"}
                  <X className="w-3 h-3 hover:text-red-500 cursor-pointer" onClick={() => setDateFilter({ startDate: "", endDate: "", preset: "auto" })} />
                </span>
              )}
            </div>
          )}
        </div>

        {/* Shipment Data Table */}
        <DataTable
          columns={columns}
          data={filteredShipments}
          onRowClick={(shp) => setSelectedShipment(shp)}
          itemsPerPage={10}
        />
      </div>

      {/* Shipment Status Advance Drawer */}
      <AnimatePresence>
        {selectedShipment && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedShipment(null)}
              className="absolute inset-0 bg-gray-900"
            />

            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="bg-white w-full max-w-lg h-full relative z-10 shadow-2xl flex flex-col justify-between"
            >
              {/* Header */}
              <div className="bg-[#0B2C6B] text-white p-6 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-widest text-cyan-300">
                    Live GPS Transit Tracking
                  </span>
                  <h3 className="text-2xl font-black font-mono tracking-tight mt-1">
                    {selectedShipment.id}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedShipment(null)}
                  className="p-2 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* Meta Ref & Status */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider block">Order Reference</span>
                    <span className="text-sm font-black font-mono text-gray-900 mt-0.5 block">{selectedShipment.orderRef}</span>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StatusBadge status={selectedShipment.tripStatus} />
                    <StatusBadge status={selectedShipment.type} />
                  </div>
                </div>

                {/* Quick Trip Status Switcher */}
                <div className="bg-blue-50/60 border border-blue-200 p-5 rounded-2xl space-y-3">
                  <span className="text-xs font-black text-[#0B2C6B] block">Advance Trip Stage Live:</span>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => handleUpdateTripStatus(selectedShipment.id, "pre_trip")}
                      className={`py-2 px-3 rounded-xl text-xs font-black border cursor-pointer transition-all ${
                        selectedShipment.tripStatus === "pre_trip" ? "bg-amber-500 text-white border-amber-600 shadow" : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      Pre-Trip
                    </button>
                    <button
                      onClick={() => handleUpdateTripStatus(selectedShipment.id, "on_trip")}
                      className={`py-2 px-3 rounded-xl text-xs font-black border cursor-pointer transition-all ${
                        selectedShipment.tripStatus === "on_trip" ? "bg-blue-600 text-white border-blue-700 shadow" : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      On Trip
                    </button>
                    <button
                      onClick={() => handleUpdateTripStatus(selectedShipment.id, "end_trip")}
                      className={`py-2 px-3 rounded-xl text-xs font-black border cursor-pointer transition-all ${
                        selectedShipment.tripStatus === "end_trip" ? "bg-emerald-600 text-white border-emerald-700 shadow" : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      End Trip
                    </button>
                  </div>
                </div>

                {/* Vehicle & Driver Info */}
                <div className="space-y-3">
                  <h4 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest border-b pb-1.5">
                    Vehicle & Assignment Details
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <span className="text-[10px] text-gray-400 font-bold block uppercase">Plat Nomor Unit</span>
                      <span className="text-sm font-black font-mono text-gray-900 block mt-0.5">{selectedShipment.unit}</span>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <span className="text-[10px] text-gray-400 font-bold block uppercase">Assigned Driver</span>
                      <span className="text-sm font-black text-gray-900 block mt-0.5">{selectedShipment.driver}</span>
                    </div>
                  </div>
                </div>

                {/* Container & Seal Details */}
                <div className="space-y-3">
                  <h4 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest border-b pb-1.5">
                    Container & Cargo Manifest
                  </h4>
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-500 font-bold">Container No:</span>
                      <span className="font-mono font-black text-gray-900 bg-white border px-2 py-0.5 rounded">
                        TGHU 789123-4 (40ft High Cube)
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-500 font-bold">Seal Number:</span>
                      <span className="font-mono font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                        SEAL-2026-9921
                      </span>
                    </div>
                  </div>
                </div>

                {/* Booking Date, GPS Location & ETA */}
                <div className="space-y-3">
                  <h4 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest border-b pb-1.5">
                    Schedule, Location & ETA
                  </h4>
                  <div className="bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 p-3.5 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-amber-800 dark:text-amber-400 font-extrabold uppercase tracking-wider block flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> Tanggal Booking (Booking Date)
                      </span>
                      <span className="text-sm font-black font-mono text-amber-950 dark:text-amber-200 block mt-0.5">
                        {selectedShipment.bookingDate || "N/A"}
                      </span>
                    </div>
                    <span className="text-xs font-bold bg-amber-200/60 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 px-2.5 py-1 rounded-md">
                      Booking
                    </span>
                  </div>

                  <div className="bg-gray-50 dark:bg-slate-800/80 p-4 rounded-xl border border-gray-100 dark:border-slate-700 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-800 dark:text-slate-200">
                      <MapPin className="w-4 h-4 text-sky-500 shrink-0" />
                      <span>{selectedShipment.currentLocation}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-slate-400 pt-1">
                      <Clock className="w-4 h-4 text-gray-400 shrink-0" />
                      <span>Estimated Arrival (ETA): <strong className="text-gray-900 dark:text-slate-100 font-bold">{selectedShipment.eta}</strong></span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Actions Footer */}
              <div className="p-6 border-t border-gray-100 bg-gray-50">
                <button
                  onClick={() => setSelectedShipment(null)}
                  className="w-full text-center py-2.5 rounded-xl bg-[#0B2C6B] hover:bg-blue-900 text-white text-xs font-black cursor-pointer shadow"
                >
                  Selesai Review Trip
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Detail List Modal for KPI Clicks */}
      <DetailListModal
        isOpen={detailModal.isOpen}
        onClose={() => setDetailModal((prev) => ({ ...prev, isOpen: false }))}
        title={detailModal.title}
        subtitle={detailModal.subtitle}
        data={detailModal.data}
        dataType="shipment"
      />
    </motion.div>
  );
}

