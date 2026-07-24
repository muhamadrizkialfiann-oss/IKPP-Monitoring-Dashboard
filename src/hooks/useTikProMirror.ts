import { useState, useEffect, useCallback } from "react";
import { TikProMirrorData } from "../types";

export function useTikProMirror() {
  const [data, setData] = useState<TikProMirrorData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMirrorData = useCallback(async (force = false) => {
    setLoading(true);
    try {
      const res = await fetch("/api/tikpro/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "pdt@ikk.com",
          password: "pdt@ikk.com",
          vendorFilter: "Pancaran Darat",
          forceRefresh: force
        })
      });
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
        setError(null);
      } else {
        setError(json.message || "Gagal memuat data TikPro");
      }
    } catch (err: any) {
      setError(err?.message || "Kesalahan koneksi jaringan");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMirrorData();
    const interval = setInterval(() => fetchMirrorData(false), 15000);
    return () => clearInterval(interval);
  }, [fetchMirrorData]);

  return {
    data,
    loading,
    error,
    refresh: () => fetchMirrorData(true)
  };
}
