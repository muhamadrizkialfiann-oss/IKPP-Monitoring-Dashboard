import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

const SPREADSHEET_ID = "1pavvP7EtzMvHiIhCP5X_aoTVP5nLkV03Vw_IV0iQkxU";
const GID = "1444994189";

// Helper to parse CSV line handling quoted values
function parseCSVLine(text: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      result.push(cur.trim());
      cur = "";
    } else {
      cur += c;
    }
  }
  result.push(cur.trim());
  return result;
}

function parseCSV(csvText: string) {
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];

  const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase().trim().replace(/^"|"$/g, ''));
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]).map((v) => v.replace(/^"|"$/g, ''));
    if (values.length === 0 || values.every((v) => !v)) continue;

    const rowObj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      rowObj[h] = values[idx] || "";
    });
    rows.push(rowObj);
  }

  return rows;
}

// Map raw spreadsheet row object to standard Order interface
function mapSpreadsheetRowToOrder(row: Record<string, string>, index: number) {
  // Find key variations
  const keys = Object.keys(row);
  const getVal = (...possibleKeys: string[]) => {
    for (const pk of possibleKeys) {
      const match = keys.find((k) => k.toLowerCase().includes(pk.toLowerCase()));
      if (match && row[match]) return row[match].trim();
    }
    return "";
  };

  const id = getVal("order id", "no order", "order_id", "id", "order") || `ORD-GS-${String(index + 1).padStart(3, '0')}`;
  const rawType = getVal("freight type", "freight_type", "tipe", "type", "order type", "jenis").toLowerCase();
  
  let type: "ekspor" | "impor" | "repo" = "ekspor";
  if (rawType.includes("impor") || rawType.includes("import")) type = "impor";
  else if (rawType.includes("repo") || rawType.includes("relokasi")) type = "repo";
  else if (rawType.includes("ekspor") || rawType.includes("export")) type = "ekspor";

  const customer = getVal("customer", "pelanggan", "client", "pt") || "PT Indah Kiat Pulp & Paper";
  const origin = getVal("origin", "asal", "muat", "from", "lokasi asal") || "IKK Perawang";
  const destination = getVal("destination", "tujuan", "bongkar", "to", "lokasi tujuan") || "Tj. Priok Port";
  const unitType = getVal("unit type", "tipe unit", "unit", "trailer", "armada") || "Trailer 4x2 40ft";

  let containerTier: "20ft" | "40ft" | "45ft" = "40ft";
  if (unitType.includes("20") || getVal("tier", "container").includes("20")) containerTier = "20ft";
  else if (unitType.includes("45") || getVal("tier", "container").includes("45")) containerTier = "45ft";

  const rawStatus = getVal("status", "state", "keterangan").toLowerCase();
  let status: "open" | "in_progress" | "done" = "in_progress";
  if (rawStatus.includes("done") || rawStatus.includes("complete") || rawStatus.includes("selesai")) status = "done";
  else if (rawStatus.includes("open") || rawStatus.includes("antrian") || rawStatus.includes("pending") || rawStatus.includes("queue")) status = "open";
  else if (rawStatus.includes("progress") || rawStatus.includes("transit") || rawStatus.includes("jalan") || rawStatus.includes("proses")) status = "in_progress";

  const eta = getVal("eta", "estimasi", "tanggal", "date", "jadwal") || "25 Jul 2026";
  const bookingDate = getVal("booking date", "tgl booking", "tgl order", "date") || "22 Jul 2026";

  const rawQty = getVal("quantity", "qty", "jumlah", "total quantity");
  const parsedQty = parseInt(rawQty, 10);
  const quantity = !isNaN(parsedQty) && parsedQty > 0 ? parsedQty : 1;

  return {
    id,
    type,
    customer,
    origin,
    destination,
    containerTier,
    unitType,
    status,
    eta,
    bookingDate,
    quantity,
    driver: getVal("driver", "supir", "pengemudi"),
    vehiclePlate: getVal("nopol", "plat", "vehicle", "unit id"),
    notes: getVal("notes", "catatan", "keterangan"),
    source: "Google Sheet"
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API endpoint to fetch connected Google Spreadsheet orders
  app.get("/api/sheets/orders", async (req, res) => {
    try {
      const csvUrls = [
        `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${GID}`,
        `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&gid=${GID}`,
        `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv`
      ];

      let csvContent = "";
      let fetchError = null;

      for (const url of csvUrls) {
        try {
          const response = await fetch(url, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
            }
          });
          if (response.ok) {
            const text = await response.text();
            if (text && text.length > 10 && !text.includes("<!DOCTYPE html>")) {
              csvContent = text;
              break;
            }
          }
        } catch (err) {
          fetchError = err;
        }
      }

      if (!csvContent) {
        return res.status(502).json({
          success: false,
          message: "Could not fetch Spreadsheet CSV directly. Please ensure spreadsheet access or publish permissions.",
          error: String(fetchError || "Empty content")
        });
      }

      const parsedRows = parseCSV(csvContent);
      const orders = parsedRows.map((row, idx) => mapSpreadsheetRowToOrder(row, idx));

      return res.json({
        success: true,
        spreadsheetId: SPREADSHEET_ID,
        gid: GID,
        totalRows: orders.length,
        rawHeaders: parsedRows.length > 0 ? Object.keys(parsedRows[0]) : [],
        orders,
        fetchedAt: new Date().toISOString()
      });
    } catch (error: any) {
      console.error("Error fetching Google Sheet:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error fetching Google Sheet data",
        error: error?.message || String(error)
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
