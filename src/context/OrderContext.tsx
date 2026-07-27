import React, { createContext, useContext, useState, useEffect, useRef, useMemo } from "react";
import { Order, OrderStatus, SheetSource } from "../types";
import { DEFAULT_SHEET_SOURCES } from "../components/SheetManagerModal";
import { fetchLiveOrdersClient } from "../lib/fetchOrdersClient";

export interface OrderContextType {
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  sheetSources: SheetSource[];
  isSyncingSheets: boolean;
  sheetSyncMeta: {
    connected: boolean;
    totalRows: number;
    fetchedAt: string | null;
    error: string | null;
  };
  syncGoogleSheets: (showNotification?: boolean, sourcesToSync?: SheetSource[]) => Promise<void>;
  handleUpdateSheetSources: (newSources: SheetSource[]) => void;
  handleAdvanceStatus: (orderId: string, nextStatus: OrderStatus) => void;
  notification: string | null;
  setNotification: React.Dispatch<React.SetStateAction<string | null>>;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export const OrderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [orders, setOrders] = useState<Order[]>([]);

  // Multi-Spreadsheet Sources State
  const [sheetSources, setSheetSources] = useState<SheetSource[]>(() => {
    try {
      const saved = localStorage.getItem("logistics_sheet_sources_v3");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error("Failed to load sheet sources from localStorage:", e);
    }
    return DEFAULT_SHEET_SOURCES;
  });

  const [isSyncingSheets, setIsSyncingSheets] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

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

  // Persist sheet sources changes to localStorage and trigger sync
  const handleUpdateSheetSources = (newSources: SheetSource[]) => {
    setSheetSources(newSources);
    try {
      localStorage.setItem("logistics_sheet_sources_v3", JSON.stringify(newSources));
    } catch (e) {
      console.error("Failed to save sheet sources:", e);
    }
    syncGoogleSheets(false, newSources);
  };

  // Google Sheets synchronization handler
  const syncGoogleSheets = async (showNotification = true, sourcesToSync = sheetSources) => {
    setIsSyncingSheets(true);
    let sheetOrders: Order[] = [];

    try {
      const activeSources = sourcesToSync.filter((s) => s.enabled && s.url);

      const res = await fetch("/api/sheets/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ sheets: activeSources })
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.orders)) {
          sheetOrders = json.orders;

          if (Array.isArray(json.sheetResults)) {
            setSheetSources((prevSources) => {
              const updated = prevSources.map((source) => {
                const resMeta = json.sheetResults.find((r: any) => r.id === source.id || r.name === source.name);
                if (resMeta) {
                  return {
                    ...source,
                    rowCount: resMeta.rowCount,
                    status: (resMeta.status === "success" ? "success" : "error") as "success" | "error",
                    errorMessage: resMeta.errorMessage,
                    lastSyncedAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                  };
                }
                return source;
              });
              try {
                localStorage.setItem("logistics_sheet_sources_v3", JSON.stringify(updated));
              } catch (e) {}
              return updated;
            });
          }
        }
      }
    } catch (e) {
      // Backend proxy API offline / static host fallback
    }

    if (sheetOrders.length === 0) {
      sheetOrders = await fetchLiveOrdersClient();
    }

    if (sheetOrders.length > 0) {
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
        setNotification(`Berhasil menyinkronkan ${sheetOrders.length} Order dari Google Sheets!`);
        setTimeout(() => setNotification(null), 5000);
      }
    } else {
      setSheetSyncMeta({
        connected: false,
        totalRows: 0,
        fetchedAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        error: "Gagal menghubungkan Google Sheets"
      });
    }

    setIsSyncingSheets(false);
  };

  const sheetSourcesRef = useRef(sheetSources);
  sheetSourcesRef.current = sheetSources;

  // Auto-sync Google Sheets on mount and poll continuously in real-time every 10 seconds
  useEffect(() => {
    syncGoogleSheets(false, sheetSourcesRef.current);

    const interval = setInterval(() => {
      syncGoogleSheets(false, sheetSourcesRef.current);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // Handler for quick status advance
  const handleAdvanceStatus = (orderId: string, nextStatus: OrderStatus) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o))
    );
    setNotification(`Status order ${orderId} berhasil diupdate ke ${nextStatus.toUpperCase().replace("_", " ")}!`);
    setTimeout(() => setNotification(null), 4000);
  };

  const value = useMemo(() => ({
    orders,
    setOrders,
    sheetSources,
    isSyncingSheets,
    sheetSyncMeta,
    syncGoogleSheets,
    handleUpdateSheetSources,
    handleAdvanceStatus,
    notification,
    setNotification
  }), [orders, sheetSources, isSyncingSheets, sheetSyncMeta, notification]);

  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
};

export const useOrderContext = () => {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error("useOrderContext must be used within an OrderProvider");
  }
  return context;
};
