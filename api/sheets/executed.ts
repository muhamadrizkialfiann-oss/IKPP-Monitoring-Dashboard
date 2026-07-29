import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  SPREADSHEET_ID,
  fetchSheetData,
  parseCSVRecords,
  resolveCSStatus
} from "../../src/lib/sheetsEngine";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    const executedSheet = await fetchSheetData({
      name: "EXECUTED SINARMAS",
      url: `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit?gid=714297382`
    });

    const sinarmasMap = new Map<string, { unit: string; driver: string; location: string; eta: string }>();
    try {
      const lookupUrl = "https://docs.google.com/spreadsheets/d/1UFHKYi9YaRsUbz5f87IH3TySGYC2vVdkJgZDXAR666I/export?format=csv&gid=449456534";
      const lookupRes = await fetch(lookupUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
      });
      if (lookupRes.ok) {
        const csvText = await lookupRes.text();
        const records = parseCSVRecords(csvText);
        for (const r of records) {
          const idKey = (r[0] || "").trim().toUpperCase();
          if (!idKey || idKey.includes("ID ORDER EXECUTE") || idKey.includes("JANGAN DI HAPUS")) continue;

          const sanitize = (val: string) => {
            const trimmed = (val || "").trim();
            if (!trimmed || trimmed.toUpperCase() === "#N/A" || trimmed.toUpperCase() === "N/A") return "";
            return trimmed;
          };

          const unitVal = sanitize(r[29] || r[24] || r[59] || "");
          const driverVal = sanitize(r[30] || r[25] || r[58] || "");
          const locVal = sanitize(r[31] || r[13] || r[10] || "");
          const etaVal = sanitize(r[49] || r[50] || r[7] || "");

          sinarmasMap.set(idKey, {
            unit: unitVal,
            driver: driverVal,
            location: locVal,
            eta: etaVal
          });
        }
      }
    } catch (err) {
      console.warn("Error fetching Sinarmas VLOOKUP sheet:", err);
    }

    const validExecutedOrders = (executedSheet.orders || []).map((ord: any) => {
      let cleanId = (ord.id || "").trim();
      if (!cleanId || cleanId.toUpperCase().includes("JANGAN DI HAPUS")) {
        cleanId = "SM-D000001.01";
      }
      let cleanCustomer = ord.customer || "";
      if (cleanCustomer.toUpperCase().includes("JANGAN DI HAPUS") || !cleanCustomer || cleanCustomer.toUpperCase().includes("SHIFT")) {
        cleanCustomer = "INDAH KIAT PULP & PAPER TBK.";
      }

      const lookup = sinarmasMap.get(cleanId.toUpperCase());

      return {
        ...ord,
        id: cleanId,
        customer: cleanCustomer,
        quantity: 1,
        status: resolveCSStatus(ord.lastUpdateCS).status,
        vehiclePlate: lookup ? lookup.unit : "",
        driver: lookup ? lookup.driver : "",
        origin: lookup ? lookup.location : "",
        eta: lookup ? lookup.eta : ""
      };
    });

    return res.status(200).json({
      success: true,
      totalRows: validExecutedOrders.length,
      orders: validExecutedOrders,
      fetchedAt: new Date().toISOString()
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || "Gagal memuat data dari EXECUTED SINARMAS sheet",
      error: error?.message || String(error)
    });
  }
}
