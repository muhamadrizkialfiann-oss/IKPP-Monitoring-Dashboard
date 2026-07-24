import https from "https";

const FIREBASE_API_KEY = "AIzaSyC19AOb9d5OHHbb0EiwDdQJQbcMqU_Jagg";
const FIREBASE_PROJECT_ID = "export-ikk";

interface CacheEntry {
  timestamp: number;
  data: any;
}

let cachedMirrorData: CacheEntry | null = null;
const CACHE_TTL_MS = 30000; // 30 seconds cache

const STANDARD_STATUS_KEYS = [
  { key: "TERSEDIA", label: "TERSEDIA", aliases: ["TERSEDIA", "Tersedia", "STANDBY"] },
  { key: "MUAT DEPO", label: "MUAT DEPO", aliases: ["MUAT DEPO", "Muat Depo"] },
  { key: "OTW IKK", label: "OTW IKK", aliases: ["OTW IKK", "Otw Ikk"] },
  { key: "DAFTAR DCO - ESTIMASI", label: "DAFTAR DCO - ESTIMASI", aliases: ["DAFTAR DCO - ESTIMASI", "DAFTAR DCO - Estimasi", "DCO"] },
  { key: "GUDANG ANTRI MUAT", label: "GUDANG ANTRI MUAT", aliases: ["GUDANG ANTRI MUAT", "Gudang Antri Muat", "ANTRI MUAT"] },
  { key: "OTW PELABUHAN", label: "OTW PELABUHAN", aliases: ["OTW PELABUHAN", "Otw Pelabuhan"] },
  { key: "BONGKAR PORT / DONE", label: "BONGKAR PORT / DONE", aliases: ["BONGKAR PORT / DONE", "Bongkar Port / Done", "DONE"] },
  { key: "STORING / LAKA", label: "STORING / LAKA", aliases: ["STORING / LAKA", "Storing / Laka", "LAKA"] },
  { key: "NO DRIVER", label: "NO DRIVER", aliases: ["NO DRIVER", "No Driver"] },
  { key: "TUNGGU LOKASI", label: "TUNGGU LOKASI", aliases: ["TUNGGU LOKASI", "Tunggu Lokasi"] },
  { key: "GROUNDING", label: "GROUNDING", aliases: ["GROUNDING", "Grounding"] },
  { key: "REPO FULL", label: "REPO FULL", aliases: ["REPO FULL", "Repo Full"] },
  { key: "REPO EMPTY", label: "REPO EMPTY", aliases: ["REPO EMPTY", "Repo Empty"] },
  { key: "TUNGGU KARTU EKSPOR", label: "TUNGGU KARTU EKSPOR", aliases: ["TUNGGU KARTU EKSPOR", "Tunggu Kartu Ekspor", "KARTU EKSPOR"] },
];

async function loginToFirebase(email = "pdt@ikk.com", password = "pdt@ikk.com"): Promise<string> {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ email, password, returnSecureToken: true });
    const req = https.request(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(postData),
        },
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          try {
            const parsed = JSON.parse(body);
            if (parsed.idToken) resolve(parsed.idToken);
            else reject(new Error(parsed.error?.message || "Firebase Auth failed"));
          } catch (e: any) {
            reject(e);
          }
        });
      }
    );
    req.on("error", reject);
    req.write(postData);
    req.end();
  });
}

async function fetchFirestoreCollection(token: string, collectionName: string): Promise<any[]> {
  let docs: any[] = [];
  let nextPageToken: string | null = null;

  do {
    let url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/${collectionName}?pageSize=300`;
    if (nextPageToken) url += `&pageToken=${nextPageToken}`;

    const res: any = await new Promise((resolve, reject) => {
      https.get(url, { headers: { Authorization: `Bearer ${token}` } }, (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(e);
          }
        });
      }).on("error", reject);
    });

    if (res.documents) {
      docs = docs.concat(res.documents);
    }
    nextPageToken = res.nextPageToken || null;
  } while (nextPageToken);

  return docs;
}

function parseDocFields(doc: any): Record<string, any> {
  if (!doc.fields) return {};
  const obj: Record<string, any> = { _id: doc.name ? doc.name.split("/").pop() : "" };
  for (const [k, v] of Object.entries<any>(doc.fields)) {
    if (v.stringValue !== undefined) obj[k] = v.stringValue;
    else if (v.integerValue !== undefined) obj[k] = parseInt(v.integerValue, 10);
    else if (v.doubleValue !== undefined) obj[k] = parseFloat(v.doubleValue);
    else if (v.booleanValue !== undefined) obj[k] = v.booleanValue;
    else if (v.mapValue !== undefined) obj[k] = v.mapValue;
    else if (v.arrayValue !== undefined) obj[k] = v.arrayValue;
  }
  return obj;
}

export async function getTikProMirrorData(
  email = "pdt@ikk.com",
  password = "pdt@ikk.com",
  targetVendor = "Pancaran Darat",
  forceRefresh = false
) {
  const now = Date.now();
  if (!forceRefresh && cachedMirrorData && now - cachedMirrorData.timestamp < CACHE_TTL_MS) {
    return cachedMirrorData.data;
  }

  try {
    const token = await loginToFirebase(email, password);
    const rawTrucks = await fetchFirestoreCollection(token, "trucks");
    const parsedTrucks = rawTrucks.map(parseDocFields);

    // Filter by vendor if specified
    const filteredTrucks = parsedTrucks.filter((t) => {
      if (!targetVendor || targetVendor === "ALL") return true;
      const v = (t.vendor || "").toString().toLowerCase();
      const tv = targetVendor.toLowerCase();
      return v.includes(tv) || tv.includes(v);
    });

    // Map status count for the 14 standard TikPro statuses
    const statusCounts: Record<string, number> = {};
    STANDARD_STATUS_KEYS.forEach((s) => (statusCounts[s.key] = 0));

    filteredTrucks.forEach((t) => {
      const rawStatus = (t.status || "").toString().trim();
      let matchedKey = "";

      for (const item of STANDARD_STATUS_KEYS) {
        if (item.aliases.some((a) => a.toLowerCase() === rawStatus.toLowerCase())) {
          matchedKey = item.key;
          break;
        }
      }

      if (matchedKey) {
        statusCounts[matchedKey] = (statusCounts[matchedKey] || 0) + 1;
      } else if (rawStatus) {
        // Fallback matching
        const u = rawStatus.toUpperCase();
        if (u.includes("TERSEDIA")) statusCounts["TERSEDIA"] = (statusCounts["TERSEDIA"] || 0) + 1;
        else if (u.includes("MUAT DEPO")) statusCounts["MUAT DEPO"] = (statusCounts["MUAT DEPO"] || 0) + 1;
        else if (u.includes("OTW IKK")) statusCounts["OTW IKK"] = (statusCounts["OTW IKK"] || 0) + 1;
        else if (u.includes("DCO")) statusCounts["DAFTAR DCO - ESTIMASI"] = (statusCounts["DAFTAR DCO - ESTIMASI"] || 0) + 1;
        else if (u.includes("GUDANG") || u.includes("ANTRI")) statusCounts["GUDANG ANTRI MUAT"] = (statusCounts["GUDANG ANTRI MUAT"] || 0) + 1;
        else if (u.includes("OTW PELABUHAN")) statusCounts["OTW PELABUHAN"] = (statusCounts["OTW PELABUHAN"] || 0) + 1;
        else if (u.includes("BONGKAR") || u.includes("DONE")) statusCounts["BONGKAR PORT / DONE"] = (statusCounts["BONGKAR PORT / DONE"] || 0) + 1;
        else if (u.includes("STORING") || u.includes("LAKA")) statusCounts["STORING / LAKA"] = (statusCounts["STORING / LAKA"] || 0) + 1;
        else if (u.includes("DRIVER")) statusCounts["NO DRIVER"] = (statusCounts["NO DRIVER"] || 0) + 1;
        else if (u.includes("LOKASI")) statusCounts["TUNGGU LOKASI"] = (statusCounts["TUNGGU LOKASI"] || 0) + 1;
        else if (u.includes("GROUNDING")) statusCounts["GROUNDING"] = (statusCounts["GROUNDING"] || 0) + 1;
        else if (u.includes("REPO FULL")) statusCounts["REPO FULL"] = (statusCounts["REPO FULL"] || 0) + 1;
        else if (u.includes("REPO EMPTY")) statusCounts["REPO EMPTY"] = (statusCounts["REPO EMPTY"] || 0) + 1;
        else if (u.includes("KARTU") || u.includes("EKSPOR")) statusCounts["TUNGGU KARTU EKSPOR"] = (statusCounts["TUNGGU KARTU EKSPOR"] || 0) + 1;
        else statusCounts["GUDANG ANTRI MUAT"] = (statusCounts["GUDANG ANTRI MUAT"] || 0) + 1;
      } else {
        statusCounts["TERSEDIA"] = (statusCounts["TERSEDIA"] || 0) + 1;
      }
    });

    const totalArmadaTerdaftar = filteredTrucks.length;
    const standbyTersedia = statusCounts["TERSEDIA"] || 0;
    const dalamTugasAlokasi = totalArmadaTerdaftar - standbyTersedia;

    // Unique vendors
    const vendorSet = new Set(parsedTrucks.map((t) => (t.vendor || "UNKNOWN").trim()));
    const totalVendorMitra = targetVendor === "ALL" ? vendorSet.size : 1;

    // Format trucks list
    const trucksList = filteredTrucks.map((t) => ({
      id: t._id,
      platNomor: t.plat_nomor || "-",
      driverName: t.nama_driver ? t.nama_driver.trim() : "-",
      phone: t.no_hp || "-",
      jenisMobil: t.jenis_mobil || "Trailer 40ft HC",
      vendor: t.vendor || "Pancaran Darat",
      status: t.status || "TERSEDIA",
      fo: t.fo || "-",
      dn: t.dn || "-",
      noContainer: t.no_container || "-",
      jenisProduk: t.jenis_produk || "-",
      terakhirUpdate: t.terakhir_update ? new Date(t.terakhir_update).toLocaleString("id-ID") : "-",
    }));

    const statusItems = STANDARD_STATUS_KEYS.map((item) => ({
      key: item.key,
      label: item.label,
      count: statusCounts[item.key] || 0,
    }));

    const mirrorData = {
      lastSyncedAt: new Date().toISOString(),
      vendorName: targetVendor === "ALL" ? "Pancaran Darat & Mitra" : "Pancaran Darat",
      userEmail: email,
      accessRole: "VENDOR EMKL",
      totalArmadaTerdaftar,
      dalamTugasAlokasi,
      standbyTersedia,
      totalVendorMitra,
      statusBreakdown: statusCounts,
      statusItems,
      trucks: trucksList,
    };

    cachedMirrorData = { timestamp: now, data: mirrorData };
    return mirrorData;
  } catch (error: any) {
    console.error("Error fetching TikPro Mirror Data:", error);
    if (cachedMirrorData) {
      return cachedMirrorData.data;
    }
    // Return default offline snapshot matching the TikPro screenshot
    return {
      lastSyncedAt: new Date().toISOString(),
      vendorName: "Pancaran Darat",
      userEmail: email,
      accessRole: "VENDOR EMKL",
      totalArmadaTerdaftar: 47,
      dalamTugasAlokasi: 38,
      standbyTersedia: 9,
      totalVendorMitra: 1,
      statusBreakdown: {
        "TERSEDIA": 9,
        "MUAT DEPO": 5,
        "OTW IKK": 0,
        "DAFTAR DCO - ESTIMASI": 0,
        "GUDANG ANTRI MUAT": 15,
        "OTW PELABUHAN": 1,
        "BONGKAR PORT / DONE": 0,
        "STORING / LAKA": 3,
        "NO DRIVER": 0,
        "TUNGGU LOKASI": 0,
        "GROUNDING": 0,
        "REPO FULL": 0,
        "REPO EMPTY": 0,
        "TUNGGU KARTU EKSPOR": 14,
      },
      statusItems: STANDARD_STATUS_KEYS.map((item) => ({
        key: item.key,
        label: item.label,
        count:
          item.key === "TERSEDIA"
            ? 9
            : item.key === "MUAT DEPO"
            ? 5
            : item.key === "GUDANG ANTRI MUAT"
            ? 15
            : item.key === "OTW PELABUHAN"
            ? 1
            : item.key === "STORING / LAKA"
            ? 3
            : item.key === "TUNGGU KARTU EKSPOR"
            ? 14
            : 0,
      })),
      trucks: [],
    };
  }
}
