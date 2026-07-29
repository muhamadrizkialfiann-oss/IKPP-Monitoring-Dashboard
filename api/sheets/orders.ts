import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  SPREADSHEET_ID,
  GID_POOLING,
  fetchSheetData,
  getExecutedLookupMap,
  enrichAndDeduplicateOrders
} from "../../src/lib/sheetsEngine";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    const customUrl = (req.query.url as string) || "";
    const customName = (req.query.name as string) || "POOLING SINARMAS";

    const sourceUrl = customUrl || `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit?gid=${GID_POOLING}`;
    const sheetResult = await fetchSheetData({ url: sourceUrl, name: customName });

    const executedMap = await getExecutedLookupMap();
    const enrichedOrders = enrichAndDeduplicateOrders(sheetResult.orders, executedMap);

    return res.status(200).json({
      success: true,
      spreadsheetId: sheetResult.spreadsheetId,
      gid: sheetResult.gid,
      totalRows: enrichedOrders.length,
      orders: enrichedOrders,
      fetchedAt: new Date().toISOString()
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || "Gagal memuat data dari Google Spreadsheet",
      error: error?.message || String(error)
    });
  }
}
