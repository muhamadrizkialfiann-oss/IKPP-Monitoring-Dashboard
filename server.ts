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
    values.forEach((val, idx) => {
      rowObj[`__col_${idx}`] = val;
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

// Helper for CS status mapping matching exact lookup table rules
function resolveCSStatus(lastUpdateCS?: string): { status: "open" | "in_progress" | "done" | "cancel" } {
  const cs = (lastUpdateCS || "").trim().toUpperCase();

  if (
    !cs ||
    cs === "CANCEL CS" ||
    cs === "CANCEL OPR" ||
    cs === "CANCEL" ||
    cs.includes("CANCEL") ||
    cs.includes("BATAL") ||
    cs.includes("REJECT")
  ) {
    return { status: "cancel" };
  }

  if (
    cs === "ON JOB" ||
    cs.includes("ON JOB") ||
    cs.includes("JOB") ||
    cs.includes("IN TRANSIT") ||
    cs.includes("TRANSIT") ||
    cs.includes("ON TRIP") ||
    cs.includes("TRIP")
  ) {
    return { status: "in_progress" };
  }

  if (
    cs === "OPR PLANNING" ||
    cs === "WAITING BON MUAT" ||
    cs === "WAITING CONFIRM" ||
    cs.includes("PLANNING") ||
    cs.includes("BON MUAT") ||
    cs.includes("WAITING") ||
    cs.includes("CONFIRM") ||
    cs.includes("OPEN") ||
    cs.includes("QUEUE") ||
    cs.includes("UNALLOCATED")
  ) {
    return { status: "open" };
  }

  if (
    cs === "SHIPMENT FINISH" ||
    cs.includes("FINISH") ||
    cs.includes("DONE") ||
    cs.includes("COMPLETED") ||
    cs.includes("COMPLETE")
  ) {
    return { status: "done" };
  }

  return { status: "cancel" };
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
  const getVal = (exactOrMappedField?: string, colIndexFallback?: number[], ...possibleKeys: string[]) => {
    if (exactOrMappedField && exactOrMappedField.trim()) {
      const fieldTarget = exactOrMappedField.trim().toLowerCase();
      const directMatch = keys.find((k) => !k.startsWith("__col_") && k.toLowerCase().trim() === fieldTarget);
      if (directMatch && row[directMatch] !== undefined && row[directMatch].trim() !== "") {
        return row[directMatch].trim();
      }
      const partialMatch = keys.find((k) => !k.startsWith("__col_") && k.toLowerCase().includes(fieldTarget));
      if (partialMatch && row[partialMatch] !== undefined && row[partialMatch].trim() !== "") {
        return row[partialMatch].trim();
      }
    }

    for (const pk of possibleKeys) {
      const target = pk.toLowerCase().trim();
      const exactMatch = keys.find((k) => !k.startsWith("__col_") && k.toLowerCase().trim() === target);
      if (exactMatch && row[exactMatch] !== undefined && row[exactMatch].trim() !== "") {
        return row[exactMatch].trim();
      }
    }

    for (const pk of possibleKeys) {
      const target = pk.toLowerCase().trim();
      if (target.length < 3) continue; // Avoid single letter/digit accidental substring match
      const subMatch = keys.find((k) => !k.startsWith("__col_") && k.toLowerCase().includes(target));
      if (subMatch && row[subMatch] !== undefined && row[subMatch].trim() !== "") {
        return row[subMatch].trim();
      }
    }

    if (colIndexFallback && colIndexFallback.length > 0) {
      for (const idx of colIndexFallback) {
        const rawColVal = row[`__col_${idx}`];
        if (rawColVal !== undefined && rawColVal.trim() !== "") {
          return rawColVal.trim();
        }
      }
    }

    return "";
  };

  const idExecute = getVal("id order execute", [1], "id_order_execute", "id execute");
  const idPooling = getVal("id pooling order", [2], "id_pooling_order", "id pooling");
  const id =
    idExecute ||
    idPooling ||
    getVal(
      mapping?.idField,
      [0],
      "id order",
      "order_id",
      "id"
    ) || `ORD-GS-${String(index + 1).padStart(3, "0")}`;
  const poolingId = idPooling || (id.includes(".") ? id.split(".")[0] : id);

  const rawType = getVal(
    mapping?.typeField,
    [16, 17, 15],
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
      [7, 6, 8],
      "customer",
      "pelanggan",
      "client",
      "pt",
      "nama pelanggan"
    ) || "PT Indah Kiat Pulp & Paper";

  const rawPickUp = getVal(
    "pick up location",
    [18],
    "address loading point",
    "lokasi asal"
  );
  const rawDrop = getVal(
    "drop of location",
    [21],
    "address unloading point",
    "lokasi tujuan"
  );
  const rawCsvOrigin = getVal("origin", [18, 19], "asal");
  const rawCsvDest = getVal("destination", [21, 23], "tujuan");

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
      [14, 15],
      "unit type",
      "tipe unit",
      "unit",
      "trailer",
      "armada"
    ) || "Trailer 4x2 40ft";

  let containerTier: "20ft" | "40ft" | "45ft" = "40ft";
  if (unitType.includes("20") || getVal("tier", [], "container").includes("20"))
    containerTier = "20ft";
  else if (unitType.includes("45") || getVal("tier", [], "container").includes("45"))
    containerTier = "45ft";

  const lastUpdateCS =
    getVal(
      mapping?.lastUpdateCSField,
      [58, 57, 59, 30, 29, 31, 28],
      "bg last update cs",
      "last update cs",
      "last_update_cs",
      "update cs",
      "cs update",
      "status cdo",
      "status_cdo",
      "status cs",
      "last update",
      "status"
    ) || "WAITING CONFIRM";

  let { status } = resolveCSStatus(lastUpdateCS);

  const eta =
    getVal(mapping?.etaField, [], "eta", "estimasi", "tanggal", "date", "jadwal") ||
    "25 Jul 2026";
  const bookingDate =
    getVal("booking date", [], "tgl booking", "tgl order", "date") || "22 Jul 2026";

  const rawQty = getVal(
    mapping?.quantityField,
    [15, 14, 16],
    "quantity",
    "qty",
    "jumlah",
    "total quantity"
  );
  const parsedQty = parseInt(rawQty, 10);
  const quantity = !isNaN(parsedQty) && parsedQty > 0 ? parsedQty : 1;

  const driver = getVal(
    mapping?.driverField,
    [51, 12, 11, 13],
    "driver name",
    "driver_name",
    "driver",
    "supir",
    "pengemudi"
  );
  const vehiclePlate = getVal(
    mapping?.vehiclePlateField,
    [52, 13, 14, 12],
    "nopol",
    "plat",
    "vehicle",
    "unit id"
  );

  let notes = getVal("notes", [32, 31], "catatan", "keterangan");

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
    poolingId,
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
      const keysToStore = new Set<string>();

      if (ord.id) {
        const k1 = ord.id.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
        if (k1) keysToStore.add(k1);

        if (ord.id.includes(".")) {
          const base = ord.id.split(".")[0];
          if (base) {
            const kBase = base.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
            if (kBase) keysToStore.add(kBase);
          }
        }
      }

      if (ord.poolingId) {
        const k2 = ord.poolingId.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
        if (k2) keysToStore.add(k2);
      }

      for (const key of keysToStore) {
        const existing = map.get(key);
        if (!existing) {
          map.set(key, ord);
        } else {
          const curCS = (ord.lastUpdateCS || "").trim();
          const exCS = (existing.lastUpdateCS || "").trim();

          let preferredCS = existing.lastUpdateCS;
          if ((!exCS || exCS === "WAITING CONFIRM") && curCS && curCS !== "WAITING CONFIRM") {
            preferredCS = curCS;
          } else if (curCS && curCS !== "WAITING CONFIRM") {
            const { status: curStatus } = resolveCSStatus(curCS);
            if (curStatus === "in_progress" || curStatus === "done") {
              preferredCS = curCS;
            }
          }

          map.set(key, {
            ...existing,
            lastUpdateCS: preferredCS,
            driver: ord.driver || existing.driver,
            vehiclePlate: ord.vehiclePlate || existing.vehiclePlate,
            notes: ord.notes || existing.notes
          });
        }
      }
    }
  } catch (err) {
    console.warn("Executed Sinarmas lookup fetch warning:", err);
  }
  return map;
}

// Function to enrich orders with EXECUTED lookup CS status and deduplicate by Order ID
function enrichAndDeduplicateOrders(rawOrders: any[], executedMap: Map<string, any>): any[] {
  const cleanOrders = rawOrders.filter((ord) => {
    const customer = (ord.customer || "").toUpperCase();
    const notes = (ord.notes || "").toUpperCase();
    const id = (ord.id || "").toUpperCase();
    if (customer.includes("JANGAN DI HAPUS") || notes.includes("JANGAN DI HAPUS") || id.includes("JANGAN DI HAPUS")) {
      return false;
    }
    return true;
  });

  const poolingOrders = cleanOrders.filter((ord) => {
    const sheetName = (ord.sourceSheetName || "").toUpperCase();
    return !sheetName.includes("EXECUTE");
  });

  if (poolingOrders.length > 0) {
    const mergedMap = new Map<string, any>();

    for (const ord of poolingOrders) {
      const normKey = (ord.id || "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
      if (!normKey) continue;

      const execInfo = executedMap.get(normKey);
      const updated = { ...ord };

      if (execInfo) {
        const execCS = (execInfo.lastUpdateCS || "").trim();
        if (execCS && execCS !== "WAITING CONFIRM") {
          updated.lastUpdateCS = execCS;
        } else if (execCS && updated.lastUpdateCS === "WAITING CONFIRM") {
          updated.lastUpdateCS = execCS;
        }
        if (execInfo.driver) updated.driver = execInfo.driver;
        if (execInfo.vehiclePlate) updated.vehiclePlate = execInfo.vehiclePlate;
      }

      updated.status = resolveCSStatus(updated.lastUpdateCS).status;
      mergedMap.set(normKey, updated);
    }

    return Array.from(mergedMap.values());
  }

  return cleanOrders.map((ord) => ({
    ...ord,
    status: resolveCSStatus(ord.lastUpdateCS).status
  }));
}

  // API endpoint to fetch connected Google Spreadsheet orders (Supports single or multi-sheet sync)
  app.get("/api/sheets/orders", async (req, res) => {
    try {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");

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

  // API endpoint to fetch EXECUTED SINARMAS sheet items with VLOOKUP fields from Sinarmas sheet
  app.get("/api/sheets/executed", async (req, res) => {
    try {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");

      const executedSheet = await fetchSheetData({
        name: "EXECUTED SINARMAS",
        url: `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit?gid=714297382`
      });

      // VLOOKUP dictionary from Sinarmas spreadsheet (https://docs.google.com/spreadsheets/d/1UFHKYi9YaRsUbz5f87IH3TySGYC2vVdkJgZDXAR666I/edit?gid=449456534)
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

            const unitVal = (r[29] || r[24] || r[59] || "").trim();
            const driverVal = (r[30] || r[25] || r[58] || "").trim();
            const locVal = (r[31] || r[13] || r[10] || "").trim();
            const etaVal = (r[49] || r[50] || r[7] || "").trim();

            sinarmasMap.set(idKey, {
              unit: unitVal ? unitVal : "#N/A",
              driver: driverVal ? driverVal : "#N/A",
              location: locVal ? locVal : "#N/A",
              eta: etaVal ? etaVal : "#N/A"
            });
          }
        }
      } catch (err) {
        console.warn("Error fetching Sinarmas VLOOKUP sheet:", err);
      }

      const validExecutedOrders = (executedSheet.orders || [])
        .map((ord: any) => {
          let cleanId = (ord.id || "").trim();
          if (!cleanId || cleanId.toUpperCase().includes("JANGAN DI HAPUS")) {
            cleanId = "SM-D000001.01";
          }
          let cleanCustomer = ord.customer || "";
          if (cleanCustomer.toUpperCase().includes("JANGAN DI HAPUS") || !cleanCustomer) {
            cleanCustomer = "INDAH KIAT PULP & PAPER TBK.";
          }

          const lookup = sinarmasMap.get(cleanId.toUpperCase());

          return {
            ...ord,
            id: cleanId,
            customer: cleanCustomer,
            quantity: 1,
            status: resolveCSStatus(ord.lastUpdateCS).status,
            // VLOOKUP result fields (UNIT / PLAT NO, DRIVER, LOKASI TERKINI, ETA):
            vehiclePlate: lookup ? lookup.unit : "#N/A",
            driver: lookup ? lookup.driver : "#N/A",
            origin: lookup ? lookup.location : "#N/A",
            eta: lookup ? lookup.eta : "#N/A"
          };
        });

      return res.json({
        success: true,
        totalExecuted: validExecutedOrders.length,
        orders: validExecutedOrders,
        fetchedAt: new Date().toISOString()
      });
    } catch (error: any) {
      console.error("Error fetching EXECUTED SINARMAS sheet:", error);
      return res.status(500).json({
        success: false,
        message: error?.message || "Gagal memuat data EXECUTED SINARMAS",
        error: String(error)
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
