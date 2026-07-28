import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { getTikProMirrorData } from "./server/tikpro.js";

const SPREADSHEET_ID = "1pavvP7EtzMvHiIhCP5X_aoTVP5nLkV03Vw_IV0iQkxU";
const GID = "1444994189";

// Helper to parse CSV line handling quoted values
function parseCSVRecords(csvText: string): string[][] {
  const records: string[][] = [];
  let currentRecord: string[] = [];
  let currentCell = "";
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentCell += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRecord.push(currentCell.trim());
      currentCell = "";
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // skip \n
      }
      currentRecord.push(currentCell.trim());
      if (currentRecord.some((c) => c.length > 0)) {
        records.push(currentRecord);
      }
      currentRecord = [];
      currentCell = "";
    } else {
      currentCell += char;
    }
  }

  if (currentCell.length > 0 || currentRecord.length > 0) {
    currentRecord.push(currentCell.trim());
    if (currentRecord.some((c) => c.length > 0)) {
      records.push(currentRecord);
    }
  }

  return records;
}

function parseCSV(csvText: string, customHeaderRowIndex?: number) {
  const records = parseCSVRecords(csvText);
  if (records.length === 0) return { headers: [], rows: [] };

  let dataStartIndex = 1;
  if (typeof customHeaderRowIndex === "number" && customHeaderRowIndex >= 0) {
    dataStartIndex = customHeaderRowIndex + 1;
  } else {
    // Auto-detect header row
    for (let i = 0; i < Math.min(records.length, 10); i++) {
      const row = records[i];
      if (
        row &&
        row.some(
          (cell) =>
            /^sm-d\d+/i.test(cell) ||
            /^ord-\d+/i.test(cell) ||
            (cell.length > 3 && /^\d+$/.test(row[0]) && i > 0)
        )
      ) {
        dataStartIndex = i;
        break;
      }
    }
  }

  const maxCols = Math.max(...records.slice(0, dataStartIndex).map((r) => r.length));
  const combinedHeaders: string[] = [];

  for (let col = 0; col < maxCols; col++) {
    const parts: string[] = [];
    for (let r = 0; r < dataStartIndex; r++) {
      const val = records[r]?.[col];
      if (val && !parts.map((p) => p.toLowerCase()).includes(val.toLowerCase())) {
        parts.push(val.replace(/[\r\n]+/g, " ").trim());
      }
    }
    const headerName = parts.join(" ").trim() || `Kolom ${col + 1}`;
    combinedHeaders.push(headerName);
  }

  const rows: Record<string, string>[] = [];
  for (let i = dataStartIndex; i < records.length; i++) {
    const values = records[i].map((v) => v.replace(/^"|"$/g, "").trim());
    if (values.length === 0 || values.every((v) => !v)) continue;

    const rowObj: Record<string, string> = {};
    combinedHeaders.forEach((h, idx) => {
      const val = values[idx] || "";
      rowObj[h] = val;
    });
    rows.push(rowObj);
  }

  return { headers: combinedHeaders, rows };
}

interface FormulaRule {
  id: string;
  targetField: "status" | "type" | "lastUpdateCS" | "customNote";
  conditionType: "contains" | "equals" | "starts_with" | "is_not_empty" | "always";
  conditionValue: string;
  resultValue: string;
}

interface ColumnMapping {
  headerRowIndex?: number;
  idField?: string;
  typeField?: string;
  statusField?: string;
  customerField?: string;
  originField?: string;
  destinationField?: string;
  unitTypeField?: string;
  quantityField?: string;
  etaField?: string;
  lastUpdateCSField?: string;
  driverField?: string;
  vehiclePlateField?: string;
}

// Map raw spreadsheet row object to standard Order interface
function mapSpreadsheetRowToOrder(
  row: Record<string, string>,
  index: number,
  mapping?: ColumnMapping,
  formulaRules?: FormulaRule[]
) {
  const keys = Object.keys(row);

  // Clean value getter
  const getVal = (exactOrMappedField?: string, ...possibleKeys: string[]) => {
    if (exactOrMappedField && exactOrMappedField.trim()) {
      const fieldTarget = exactOrMappedField.trim().toLowerCase();
      const directMatch = keys.find((k) => k.toLowerCase().trim() === fieldTarget);
      if (directMatch && row[directMatch] !== undefined && row[directMatch].trim() !== "") {
        return row[directMatch].trim();
      }
      const partialMatch = keys.find((k) => k.toLowerCase().includes(fieldTarget));
      if (partialMatch && row[partialMatch] !== undefined && row[partialMatch].trim() !== "") {
        return row[partialMatch].trim();
      }
    }

    for (const pk of possibleKeys) {
      const target = pk.toLowerCase().trim();
      const exactMatch = keys.find((k) => k.toLowerCase().trim() === target);
      if (exactMatch && row[exactMatch] !== undefined && row[exactMatch].trim() !== "") {
        return row[exactMatch].trim();
      }
    }

    for (const pk of possibleKeys) {
      const target = pk.toLowerCase().trim();
      if (target.length < 3) continue; // Avoid single letter/digit accidental substring match
      const subMatch = keys.find((k) => k.toLowerCase().includes(target));
      if (subMatch && row[subMatch] !== undefined && row[subMatch].trim() !== "") {
        return row[subMatch].trim();
      }
    }
    return "";
  };

  const id =
    getVal(
      mapping?.idField,
      "id pooling order",
      "id_pooling_order",
      "id order execute",
      "id order",
      "no order",
      "order_id",
      "id",
      "order"
    ) || `ORD-GS-${String(index + 1).padStart(3, "0")}`;

  const rawType = getVal(
    mapping?.typeField,
    "freight type",
    "freight_type",
    "tipe",
    "type",
    "order type",
    "jenis"
  ).toLowerCase();

  let type: "ekspor" | "impor" | "repo" = "ekspor";
  if (rawType.includes("impor") || rawType.includes("import")) type = "impor";
  else if (rawType.includes("repo") || rawType.includes("relokasi")) type = "repo";
  else if (rawType.includes("ekspor") || rawType.includes("export")) type = "ekspor";

  const customer =
    getVal(
      mapping?.customerField,
      "customer",
      "pelanggan",
      "client",
      "pt",
      "nama pelanggan"
    ) || "PT Indah Kiat Pulp & Paper";

  const rawPickUp = getVal(
    "pick up location",
    "address loading point",
    "lokasi asal"
  );
  const rawDrop = getVal(
    "drop of location",
    "address unloading point",
    "lokasi tujuan"
  );
  const rawCsvOrigin = getVal("origin", "asal");
  const rawCsvDest = getVal("destination", "tujuan");

  // Determine Origin
  let origin = "";
  if (rawCsvOrigin && rawCsvOrigin.trim() && rawCsvOrigin.trim().toUpperCase() !== "ORIGIN") {
    const oUpper = rawCsvOrigin.trim().toUpperCase();
    if (oUpper.includes("KARAWANG") || oUpper.includes("IKK")) origin = "IKK Karawang";
    else if (oUpper.includes("CAKUNG")) origin = "CAKUNG";
    else if (oUpper.includes("PRIOK") || oUpper.includes("TANJUNG")) origin = "TANJUNG PRIOK";
    else origin = rawCsvOrigin.trim();
  }

  if (!origin && rawPickUp) {
    const pUpper = rawPickUp.trim().toUpperCase();
    if (pUpper.includes("INDAH KIAT") || pUpper.includes("KARAWANG") || pUpper.includes("IKK")) {
      origin = "IKK Karawang";
    } else if (pUpper.includes("BSA") || pUpper.includes("GFC") || pUpper.includes("BPL") || pUpper.includes("GL")) {
      origin = "CAKUNG";
    } else if (
      pUpper.includes("NPCT") ||
      pUpper.includes("UTC") ||
      pUpper.includes("KOJA") ||
      pUpper.includes("PRIOK") ||
      pUpper.includes("PELINDO") ||
      pUpper.includes("T300") ||
      pUpper.includes("PDT")
    ) {
      origin = "TANJUNG PRIOK";
    } else {
      origin = rawPickUp.trim();
    }
  }

  if (!origin) {
    origin = "IKK Karawang";
  }

  // Determine Destination
  let destination = "";
  if (rawCsvDest && rawCsvDest.trim() && rawCsvDest.trim().toUpperCase() !== "DESTINATION") {
    destination = rawCsvDest.trim();
  }

  if (!destination && rawDrop) {
    const dUpper = rawDrop.trim().toUpperCase();
    if (dUpper.includes("UTC")) destination = "UTC";
    else if (dUpper.includes("BSA")) destination = "BSA";
    else if (dUpper.includes("NPCT 1") || dUpper.includes("NPCT1")) destination = "NPCT 1";
    else if (dUpper.includes("KOJA")) destination = "KOJA";
    else if (dUpper.includes("PELINDO") || dUpper.includes("TERMINAL 3")) destination = "PELINDO/ TERMINAL 3";
    else if (dUpper.includes("GFC")) destination = "GFC";
    else if (dUpper.includes("GL")) destination = "GL Terminal";
    else if (dUpper.includes("T300") || dUpper.includes("TMAL") || dUpper.includes("MAL")) destination = "T300/TMAL";
    else if (dUpper.includes("PDT")) destination = "DEPO PDT";
    else if (dUpper.includes("BPL")) destination = "BPL";
    else if (dUpper.includes("KARAWANG") || dUpper.includes("INDAH KIAT")) destination = "IKK Karawang";
    else destination = rawDrop.trim();
  }

  if (!destination) {
    destination = "Tj. Priok Port";
  }

  const unitType =
    getVal(
      mapping?.unitTypeField,
      "unit type",
      "tipe unit",
      "unit",
      "trailer",
      "armada"
    ) || "Trailer 4x2 40ft";

  let containerTier: "20ft" | "40ft" | "45ft" = "40ft";
  if (unitType.includes("20") || getVal("tier", "container").includes("20"))
    containerTier = "20ft";
  else if (unitType.includes("45") || getVal("tier", "container").includes("45"))
    containerTier = "45ft";

  const lastUpdateCS =
    getVal(
      mapping?.lastUpdateCSField,
      "last update cs",
      "last_update_cs",
      "bg last update cs",
      "update cs",
      "cs update",
      "status cdo",
      "status_cdo"
    ) || "WAITING CONFIRM";

  const rawStatus = getVal(
    mapping?.statusField,
    "status",
    "state",
    "keterangan"
  ).toLowerCase();

  let status: "open" | "in_progress" | "done" = "in_progress";
  const upperCS = lastUpdateCS.toUpperCase();
  const upperRawStatus = rawStatus.toUpperCase();

  if (
    upperRawStatus.includes("DONE") ||
    upperRawStatus.includes("COMPLETE") ||
    upperRawStatus.includes("SELESAI") ||
    upperCS.includes("FINISH") ||
    upperCS.includes("COMPLETE")
  ) {
    status = "done";
  } else if (
    upperRawStatus.includes("OPEN") ||
    upperRawStatus.includes("ANTRIAN") ||
    upperRawStatus.includes("PENDING") ||
    upperRawStatus.includes("QUEUE") ||
    upperCS.includes("WAITING") ||
    upperCS.includes("CONFIRM") ||
    upperCS.includes("UNALLOCATED") ||
    upperCS.includes("QUEUE") ||
    upperCS.includes("NEW")
  ) {
    status = "open";
  } else if (
    upperRawStatus.includes("PROGRESS") ||
    upperRawStatus.includes("TRANSIT") ||
    upperRawStatus.includes("JALAN") ||
    upperRawStatus.includes("PROSES") ||
    upperCS.includes("JOB") ||
    upperCS.includes("TRIP") ||
    upperCS.includes("TRANSIT")
  ) {
    status = "in_progress";
  }

  const eta =
    getVal(mapping?.etaField, "eta", "estimasi", "tanggal", "date", "jadwal") ||
    "25 Jul 2026";
  const bookingDate =
    getVal("booking date", "tgl booking", "tgl order", "date") || "22 Jul 2026";

  const rawQty = getVal(
    mapping?.quantityField,
    "quantity",
    "qty",
    "jumlah",
    "total quantity"
  );
  const parsedQty = parseInt(rawQty, 10);
  const quantity = !isNaN(parsedQty) && parsedQty > 0 ? parsedQty : 1;

  const driver = getVal(
    mapping?.driverField,
    "driver name",
    "driver_name",
    "driver",
    "supir",
    "pengemudi"
  );
  const vehiclePlate = getVal(
    mapping?.vehiclePlateField,
    "nopol",
    "plat",
    "vehicle",
    "unit id"
  );

  let notes = getVal("notes", "catatan", "keterangan");

  // Execute Looker Studio Formula Rules
  if (Array.isArray(formulaRules) && formulaRules.length > 0) {
    for (const rule of formulaRules) {
      if (!rule.targetField || !rule.resultValue) continue;

      let isMatch = false;
      const checkVal = (
        rule.targetField === "lastUpdateCS"
          ? lastUpdateCS
          : rule.targetField === "status"
          ? status
          : rule.targetField === "type"
          ? type
          : notes
      ).toLowerCase();

      const condVal = (rule.conditionValue || "").toLowerCase();

      if (rule.conditionType === "always") {
        isMatch = true;
      } else if (rule.conditionType === "contains") {
        isMatch = checkVal.includes(condVal);
      } else if (rule.conditionType === "equals") {
        isMatch = checkVal === condVal;
      } else if (rule.conditionType === "starts_with") {
        isMatch = checkVal.startsWith(condVal);
      } else if (rule.conditionType === "is_not_empty") {
        isMatch = checkVal.trim().length > 0;
      }

      if (isMatch) {
        if (rule.targetField === "status") {
          const res = rule.resultValue.toLowerCase();
          if (res.includes("done") || res === "done") status = "done";
          else if (res.includes("open") || res === "open") status = "open";
          else if (res.includes("progress") || res === "in_progress") status = "in_progress";
        } else if (rule.targetField === "type") {
          const res = rule.resultValue.toLowerCase();
          if (res.includes("impor") || res === "impor") type = "impor";
          else if (res.includes("repo") || res === "repo") type = "repo";
          else type = "ekspor";
        } else if (rule.targetField === "lastUpdateCS") {
          // Last update CS override
        } else if (rule.targetField === "customNote") {
          notes = rule.resultValue;
        }
      }
    }
  }

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
    driver,
    vehiclePlate,
    notes,
    lastUpdateCS,
    source: "Google Sheet"
  };
}

// Helper to parse Google Spreadsheet URL or ID and extract spreadsheetId and GID
function parseSpreadsheetInfo(inputUrlOrId: string, defaultGid = "0"): { spreadsheetId: string; gid: string } {
  let spreadsheetId = SPREADSHEET_ID;
  let gid = defaultGid;

  if (!inputUrlOrId) return { spreadsheetId, gid };

  // Match spreadsheet ID from URL
  const docMatch = inputUrlOrId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (docMatch && docMatch[1]) {
    spreadsheetId = docMatch[1];
  } else if (!inputUrlOrId.includes("/") && inputUrlOrId.length > 20) {
    spreadsheetId = inputUrlOrId.trim();
  }

  // Match GID parameter
  const gidParamMatch = inputUrlOrId.match(/[?&]gid=([0-9]+)/) || inputUrlOrId.match(/#gid=([0-9]+)/);
  if (gidParamMatch && gidParamMatch[1]) {
    gid = gidParamMatch[1];
  }

  return { spreadsheetId, gid };
}

// Fetch single sheet data and return orders
async function fetchSheetData(source: {
  url: string;
  name: string;
  id?: string;
  gid?: string;
  headerRowIndex?: number;
  columnMapping?: ColumnMapping;
  formulaRules?: FormulaRule[];
}) {
  const { spreadsheetId, gid } = parseSpreadsheetInfo(
    source.url || source.id || "",
    source.gid || "714297382"
  );

  const csvUrls = [
    `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`,
    `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&gid=${gid}`,
    `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`
  ];

  let csvContent = "";
  let lastErr = null;

  for (const csvUrl of csvUrls) {
    try {
      const response = await fetch(csvUrl, {
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
      lastErr = err;
    }
  }

  if (!csvContent) {
    throw new Error(
      `Gagal mengunduh CSV dari sheet "${
        source.name || "Spreadsheet"
      }". Pastikan spreadsheet bersifat Publik ("Siapa saja yang memiliki link").`
    );
  }

  const { headers, rows } = parseCSV(
    csvContent,
    source.headerRowIndex ?? source.columnMapping?.headerRowIndex
  );
  const orders = rows.map((row, idx) => {
    const order = mapSpreadsheetRowToOrder(
      row,
      idx,
      source.columnMapping,
      source.formulaRules
    );
    return {
      ...order,
      sourceSheetName: source.name || "Google Sheet",
      sourceUrl:
        source.url ||
        `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${gid}`
    };
  });

  return {
    sheetId: source.id || spreadsheetId,
    sheetName: source.name || "Google Sheet",
    spreadsheetId,
    gid,
    headers,
    rowCount: orders.length,
    orders
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Looker Studio Inspector Endpoint: Returns detected headers and sample rows for field mapping
  app.post("/api/sheets/inspect", async (req, res) => {
    try {
      const { url, headerRowIndex } = req.body || {};
      if (!url) {
        return res.status(400).json({ success: false, message: "URL spreadsheet wajib diisi" });
      }

      const { spreadsheetId, gid } = parseSpreadsheetInfo(url);
      const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;

      const response = await fetch(csvUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
        }
      });

      if (!response.ok) {
        return res.status(400).json({
          success: false,
          message: "Gagal mengakses spreadsheet. Pastikan link dapat diakses Publik."
        });
      }

      const csvText = await response.text();
      const { headers, rows } = parseCSV(csvText, headerRowIndex);

      return res.json({
        success: true,
        headers,
        sampleCount: rows.length,
        sampleRows: rows.slice(0, 5)
      });
    } catch (error: any) {
      console.error("Error inspecting sheet:", error);
      return res.status(500).json({
        success: false,
        message: error?.message || "Gagal menginspeksi spreadsheet"
      });
    }
  });

// Helper to fetch Executed Sinarmas as a lookup dictionary by Order ID
async function getExecutedLookupMap(): Promise<Map<string, any>> {
  const map = new Map<string, any>();
  try {
    const executedSheet = await fetchSheetData({
      name: "EXECUTED SINARMAS",
      url: `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit?gid=714297382`
    });

    for (const ord of executedSheet.orders) {
      if (ord.id) {
        const normKey = ord.id.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
        if (normKey) {
          const existing = map.get(normKey);
          if (!existing) {
            map.set(normKey, ord);
          } else {
            // Overwrite if existing is default/waiting and current has a specific CS status
            const curCS = (ord.lastUpdateCS || "").trim();
            const exCS = (existing.lastUpdateCS || "").trim();
            if ((exCS === "" || exCS === "WAITING CONFIRM") && curCS !== "" && curCS !== "WAITING CONFIRM") {
              map.set(normKey, ord);
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn("Executed Sinarmas lookup fetch warning:", err);
  }
  return map;
}

// Function to enrich orders with EXECUTED lookup CS status and deduplicate by Order ID (82 unique orders)
function enrichAndDeduplicateOrders(rawOrders: any[], executedMap: Map<string, any>): any[] {
  const mergedMap = new Map<string, any>();

  for (const ord of rawOrders) {
    const normKey = (ord.id || "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
    if (!normKey) continue;

    const execInfo = executedMap.get(normKey);

    if (mergedMap.has(normKey)) {
      const existing = mergedMap.get(normKey);
      const csSource = ord.sourceSheetName?.toUpperCase().includes("EXECUTE") ? ord : execInfo;

      if (csSource && csSource.lastUpdateCS) {
        existing.lastUpdateCS = csSource.lastUpdateCS;
      }

      if (csSource?.driver) existing.driver = csSource.driver;
      if (csSource?.vehiclePlate) existing.vehiclePlate = csSource.vehiclePlate;

      // Determine order status from lastUpdateCS
      const upperCS = (existing.lastUpdateCS || "").toUpperCase();
      if (upperCS.includes("FINISH") || upperCS.includes("COMPLETE") || upperCS.includes("DONE")) {
        existing.status = "done";
      } else if (
        upperCS.includes("WAITING") ||
        upperCS.includes("CONFIRM") ||
        upperCS.includes("UNALLOCATED") ||
        upperCS.includes("QUEUE") ||
        upperCS.includes("NEW") ||
        upperCS.includes("CANCEL") ||
        upperCS.includes("BATAL") ||
        upperCS.includes("REJECT")
      ) {
        existing.status = "open";
      } else if (upperCS.length > 0) {
        existing.status = "in_progress";
      }

      mergedMap.set(normKey, existing);
    } else {
      const updated = { ...ord };

      if (execInfo && execInfo.lastUpdateCS) {
        updated.lastUpdateCS = execInfo.lastUpdateCS;
        if (execInfo.driver) updated.driver = execInfo.driver;
        if (execInfo.vehiclePlate) updated.vehiclePlate = execInfo.vehiclePlate;
      }

      // Determine order status from lastUpdateCS
      const upperCS = (updated.lastUpdateCS || "").toUpperCase();
      if (upperCS.includes("FINISH") || upperCS.includes("COMPLETE") || upperCS.includes("DONE")) {
        updated.status = "done";
      } else if (
        upperCS.includes("WAITING") ||
        upperCS.includes("CONFIRM") ||
        upperCS.includes("UNALLOCATED") ||
        upperCS.includes("QUEUE") ||
        upperCS.includes("NEW") ||
        upperCS.includes("CANCEL") ||
        upperCS.includes("BATAL") ||
        upperCS.includes("REJECT")
      ) {
        updated.status = "open";
      } else if (upperCS.length > 0) {
        updated.status = "in_progress";
      }

      mergedMap.set(normKey, updated);
    }
  }

  return Array.from(mergedMap.values());
}

  // API endpoint to fetch connected Google Spreadsheet orders (Supports single or multi-sheet sync)
  app.get("/api/sheets/orders", async (req, res) => {
    try {
      const customUrl = (req.query.url as string) || "";
      const customName = (req.query.name as string) || "POOLING SINARMAS";

      const sourceUrl = customUrl || `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit?gid=${GID}`;
      const sheetResult = await fetchSheetData({ url: sourceUrl, name: customName });

      const executedMap = await getExecutedLookupMap();
      const enrichedOrders = enrichAndDeduplicateOrders(sheetResult.orders, executedMap);

      return res.json({
        success: true,
        spreadsheetId: sheetResult.spreadsheetId,
        gid: sheetResult.gid,
        totalRows: enrichedOrders.length,
        orders: enrichedOrders,
        fetchedAt: new Date().toISOString()
      });
    } catch (error: any) {
      console.error("Error fetching Google Sheet:", error);
      return res.status(500).json({
        success: false,
        message: error?.message || "Gagal memuat data dari Google Spreadsheet",
        error: error?.message || String(error)
      });
    }
  });

  // API endpoint to fetch multiple sheets concurrently
  app.post("/api/sheets/orders", async (req, res) => {
    try {
      const { sheets } = req.body || {};

      if (!Array.isArray(sheets) || sheets.length === 0) {
        // Fallback to default single sheet if empty array provided
        const defaultSheet = await fetchSheetData({
          name: "POOLING SINARMAS",
          url: `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit?gid=${GID}`
        });
        const executedMap = await getExecutedLookupMap();
        const enrichedOrders = enrichAndDeduplicateOrders(defaultSheet.orders, executedMap);

        return res.json({
          success: true,
          totalOrders: enrichedOrders.length,
          orders: enrichedOrders,
          sheetResults: [{
            name: "POOLING SINARMAS",
            status: "success",
            rowCount: enrichedOrders.length
          }],
          fetchedAt: new Date().toISOString()
        });
      }

      // Filter enabled sheets only
      const enabledSheets = sheets.filter((s) => s.enabled !== false && s.url && s.url.trim().length > 0);

      if (enabledSheets.length === 0) {
        return res.json({
          success: true,
          totalOrders: 0,
          orders: [],
          sheetResults: [],
          message: "Tidak ada sheet aktif yang dikirim.",
          fetchedAt: new Date().toISOString()
        });
      }

      const results = await Promise.allSettled(
        enabledSheets.map((s) =>
          fetchSheetData({
            id: s.id,
            url: s.url,
            name: s.name || "Google Sheet",
            headerRowIndex: s.headerRowIndex ?? s.columnMapping?.headerRowIndex,
            columnMapping: s.columnMapping,
            formulaRules: s.formulaRules
          })
        )
      );

      const allOrders: any[] = [];
      const sheetResults: any[] = [];

      results.forEach((res, index) => {
        const sheetMeta = enabledSheets[index];
        if (res.status === "fulfilled") {
          allOrders.push(...res.value.orders);
          sheetResults.push({
            id: sheetMeta.id,
            name: res.value.sheetName,
            status: "success",
            rowCount: res.value.rowCount,
            spreadsheetId: res.value.spreadsheetId,
            gid: res.value.gid
          });
        } else {
          sheetResults.push({
            id: sheetMeta.id,
            name: sheetMeta.name,
            status: "error",
            rowCount: 0,
            errorMessage: res.reason?.message || "Gagal mengunduh sheet"
          });
        }
      });

      const executedMap = await getExecutedLookupMap();
      const finalOrders = enrichAndDeduplicateOrders(allOrders, executedMap);

      return res.json({
        success: true,
        totalOrders: finalOrders.length,
        orders: finalOrders,
        sheetResults,
        fetchedAt: new Date().toISOString()
      });
    } catch (error: any) {
      console.error("Error multi-sheet sync:", error);
      return res.status(500).json({
        success: false,
        message: error?.message || "Internal server error fetching multi-sheets",
        error: String(error)
      });
    }
  });

  // API endpoint for TikPro (monitoring-kontrak-export.web.app) Live Data Mirroring
  app.all("/api/tikpro/data", async (req, res) => {
    try {
      const email = (req.body?.email || req.query?.email || "pdt@ikk.com").toString();
      const password = (req.body?.password || req.query?.password || "pdt@ikk.com").toString();
      const vendorFilter = (req.body?.vendorFilter || req.query?.vendorFilter || "Pancaran Darat").toString();
      const forceRefresh = req.body?.forceRefresh === true || req.query?.forceRefresh === "true";

      const data = await getTikProMirrorData(email, password, vendorFilter, forceRefresh);
      return res.json({
        success: true,
        data
      });
    } catch (error: any) {
      console.error("Error fetching TikPro mirror data:", error);
      return res.status(500).json({
        success: false,
        message: error?.message || "Gagal melakukan mirroring data TikPro",
        error: String(error)
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
