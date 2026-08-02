import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Search, FileSpreadsheet, Calendar, User, MapPin, Truck, Hash, Tag, Info, Download } from "lucide-react";
import { Order, Shipment } from "../types";
import { formatJobOrderCode } from "../lib/statusMapper";
import StatusBadge from "./StatusBadge";

function PoolingBadge({ status }: { status?: string }) {
  const val = (status || "NEED ACTION").toUpperCase().trim();
  if (val.includes("CONFIRM")) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
        CONFIRM
      </span>
    );
  }
  if (val.includes("CANCEL")) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
        CANCEL
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
      NEED ACTION
    </span>
  );
}

interface DetailListModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  data: (Order | Shipment)[];
  dataType?: "order" | "shipment";
}

export default function DetailListModal({
  isOpen,
  onClose,
  title,
  subtitle,
  data,
  dataType = "order",
}: DetailListModalProps) {
  const [search, setSearch] = useState("");

  const filteredData = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase().trim();
    return data.filter((item: any) => {
      const id = String(item.id || "").toLowerCase();
      const job = String(item.noJobOrder || "").toLowerCase();
      const customer = String(item.customer || "").toLowerCase();
      const origin = String(item.origin || "").toLowerCase();
      const dest = String(item.destination || "").toLowerCase();
      const driver = String(item.driver || "").toLowerCase();
      const unit = String(item.unitType || item.unit || "").toLowerCase();
      const cs = String(item.lastUpdateCS || "").toLowerCase();
      const pooling = String(item.statusPooling || "").toLowerCase();
      const cr = String(item.commercialRoute || "").toLowerCase();

      return (
        id.includes(q) ||
        job.includes(q) ||
        customer.includes(q) ||
        origin.includes(q) ||
        dest.includes(q) ||
        driver.includes(q) ||
        unit.includes(q) ||
        cs.includes(q) ||
        pooling.includes(q) ||
        cr.includes(q)
      );
    });
  }, [data, search]);

  const handleExportCSV = () => {
    if (!filteredData.length) return;
    const headers =
      dataType === "order"
        ? ["ID Shipment", "No Job Order", "Tipe", "Status Pooling", "Last Update CS", "Booking Date"]
        : ["Shipment ID", "Order Ref", "Status Trip", "Last Update CS", "Booking Date"];

    const rows = filteredData.map((item: any) => {
      if (dataType === "order") {
        return [
          item.id || "",
          item.noJobOrder || "",
          item.type || "",
          item.statusPooling || "",
          item.lastUpdateCS || "",
          item.bookingDate || "",
        ];
      } else {
        return [
          item.id || "",
          item.orderRef || "",
          item.tripStatus || "",
          item.lastUpdateCS || "",
          item.bookingDate || "",
        ];
      }
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Detail_${title.replace(/[^a-zA-Z0-9]/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 font-bold">
                  <Hash className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    {title}
                    <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-sky-600 text-white">
                      {filteredData.length} Item
                    </span>
                  </h3>
                  {subtitle && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                      {subtitle}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari Job Order, Customer, CS Update, Status, Rute..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Table content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {filteredData.length === 0 ? (
              <div className="py-12 text-center text-slate-400 font-semibold text-sm">
                Tidak ada data yang cocok dengan kriteria.
              </div>
            ) : dataType === "order" ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="px-3 py-2.5 rounded-l-xl">ID Shipment</th>
                      <th className="px-3 py-2.5">No Job Order</th>
                      <th className="px-3 py-2.5">Tipe</th>
                      <th className="px-3 py-2.5">Status Pooling</th>
                      <th className="px-3 py-2.5 rounded-r-xl">Tgl Booking</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredData.map((item: any, idx) => (
                      <tr key={item.id || idx} className="hover:bg-sky-50/50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-3 py-2.5 font-mono font-bold text-sky-900 dark:text-sky-300 whitespace-nowrap">
                          {item.id || ""}
                        </td>
                        <td className="px-3 py-2.5 font-mono font-extrabold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                          {item.noJobOrder || ""}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <StatusBadge status={item.type || "ekspor"} />
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <PoolingBadge status={item.statusPooling} />
                        </td>
                        <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">
                          {item.bookingDate || ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="px-3 py-2.5 rounded-l-xl">Shipment ID</th>
                      <th className="px-3 py-2.5">No Job Order</th>
                      <th className="px-3 py-2.5">Status Trip</th>
                      <th className="px-3 py-2.5 rounded-r-xl">Tgl Booking</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredData.map((item: any, idx) => (
                      <tr key={item.id || idx} className="hover:bg-sky-50/50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-3 py-2.5 font-mono font-bold text-sky-900 dark:text-sky-300 whitespace-nowrap">
                          {item.id}
                        </td>
                        <td className="px-3 py-2.5 font-mono font-extrabold text-blue-900 dark:text-sky-300">
                          {formatJobOrderCode(item.orderRef || item.noJobOrder) || ""}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <StatusBadge status={item.tripStatus || "pre_trip"} />
                        </td>
                        <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">
                          {item.bookingDate || ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-semibold">
              Menampilkan {filteredData.length} dari {data.length} total baris
            </span>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
