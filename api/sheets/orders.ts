import {
  SPREADSHEET_ID,
  GID_POOLING,
  fetchSheetData,
  getExecutedLookupMap,
  enrichAndDeduplicateOrders
} from "../../src/lib/sheetsEngine";

export default async function handler(req: any, res: any) {
  try {
    if (res.setHeader) {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    }

    if (req.method === "OPTIONS") {
      return res.status(200).end();
    }

    const customUrl = (req.query?.url as string) || "";
    const customName = (req.query?.name as string) || "POOLING SINARMAS";

    const sourceUrl = customUrl || `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit?gid=${GID_POOLING}`;
    const sheetResult = await fetchSheetData({ url: sourceUrl, name: customName });

    const executedMap = await getExecutedLookupMap();
    const enrichedOrders = enrichAndDeduplicateOrders(sheetResult.orders as any, executedMap);

    return res.status(200).json({
      success: true,
      spreadsheetId: sheetResult.spreadsheetId,
      gid: sheetResult.gid,
      totalRows: enrichedOrders.length,
      orders: enrichedOrders,
      fetchedAt: new Date().toISOString()
    });
  } catch (error: any) {
    console.error("Error in Vercel API orders handler:", error);
    return res.status(500).json({
      success: false,
      message: error?.message || "Gagal memuat data dari Google Spreadsheet",
      error: error?.message || String(error)
    });
  }
}
