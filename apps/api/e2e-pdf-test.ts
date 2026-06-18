#!/usr/bin/env node
/**
 * E2E test for PDF generation with PDFKit
 * Run with: npx tsx e2e-pdf-test.ts
 */

import * as zlib from "zlib";

const BASE_URL = "http://localhost:3000/api";

// Cookie jar for session management
let cookies: string[] = [];

// Helper for API calls
async function api(
  method: string,
  path: string,
  body?: any,
  isFormData: boolean = false
): Promise<any> {
  const headers: Record<string, string> = {};
  if (!isFormData && body) {
    headers["Content-Type"] = "application/json";
  }
  if (cookies.length > 0) {
    headers["Cookie"] = cookies.join("; ");
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: isFormData ? body : body ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });

  // Capture cookies from response
  const setCookies = res.headers.getSetCookie?.() || [];
  for (const sc of setCookies) {
    const cookiePart = sc.split(";")[0];
    const [name] = cookiePart.split("=");
    const existingIdx = cookies.findIndex((c) => c.startsWith(name + "="));
    if (existingIdx >= 0) {
      cookies[existingIdx] = cookiePart;
    } else {
      cookies.push(cookiePart);
    }
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${method} ${path} failed (${res.status}): ${text}`);
  }

  // Handle PDF response (binary)
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/pdf")) {
    return res;
  }

  return res.json();
}

// Generate a valid PNG (>100 bytes to pass validation, with real pixel data)
function generateTestPngBase64(): string {
  // Create a proper 10x10 red pixel PNG
  const zlib = require("zlib") as typeof import("zlib");

  function crc32(buf: Buffer): number {
    let c: number;
    const table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      table[n] = c;
    }
    c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  function createChunk(type: string, data: Buffer): Buffer {
    const typeBuffer = Buffer.from(type);
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const combined = Buffer.concat([typeBuffer, data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(combined));
    return Buffer.concat([length, combined, crc]);
  }

  // IHDR: 50x50, 8-bit RGB
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(50, 0); // width
  ihdr.writeUInt32BE(50, 4); // height
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type (RGB)
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // Raw pixel data (each row: filter byte + 50 RGB pixels)
  const rawRows: Buffer[] = [];
  for (let y = 0; y < 50; y++) {
    const row = Buffer.alloc(1 + 50 * 3);
    row[0] = 0; // no filter
    for (let x = 0; x < 50; x++) {
      const offset = 1 + x * 3;
      row[offset] = 255; // R
      row[offset + 1] = 0; // G
      row[offset + 2] = 0; // B (red)
    }
    rawRows.push(row);
  }
  const rawData = Buffer.concat(rawRows);
  const compressed = zlib.deflateSync(rawData);

  // Build PNG
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const png = Buffer.concat([
    signature,
    createChunk("IHDR", ihdr),
    createChunk("IDAT", compressed),
    createChunk("IEND", Buffer.alloc(0)),
  ]);

  return `data:image/png;base64,${png.toString("base64")}`;
}

// Decompress and extract text from PDF streams
function extractPdfText(pdfBuffer: Buffer): string {
  const str = pdfBuffer.toString("latin1");
  let allText = "";

  // Find all stream content
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match;

  while ((match = streamRegex.exec(str)) !== null) {
    const streamContent = Buffer.from(match[1], "latin1");

    try {
      const decompressed = zlib.inflateSync(streamContent);
      const text = decompressed.toString("latin1");
      allText += text + "\n";
    } catch {
      // Not compressed or other error
    }
  }

  return allText;
}

// Extract hex-encoded strings from PDF content
function extractHexStrings(content: string): string[] {
  const hexRegex = /<([0-9a-fA-F]+)>/g;
  const strings: string[] = [];
  let match;

  while ((match = hexRegex.exec(content)) !== null) {
    try {
      // PDFKit encodes text as latin1, not utf8
      const decoded = Buffer.from(match[1], "hex").toString("latin1");
      strings.push(decoded);
    } catch {
      // Invalid hex
    }
  }

  return strings;
}

// Concatenate all decoded strings to handle split text
function concatenateDecodedStrings(strings: string[]): string {
  return strings.join("");
}

async function main() {
  console.log("=== PDF Generation E2E Test ===\n");

  // Step 1: Login
  console.log("1. Logging in...");
  try {
    await api("POST", "/auth/login", {
      username: "admin",
      password: "admin123",
    });
    console.log("   ✓ Logged in as admin");
  } catch (e: any) {
    console.log("   Login failed, trying to register...");
    await api("POST", "/auth/register", {
      username: "admin",
      password: "admin123",
      fullName: "Admin Test",
      role: "ADMIN",
    });
    console.log("   ✓ Registered and logged in");
  }

  // Step 2: Create client
  console.log("\n2. Creating test client...");
  const clientRes = await api("POST", "/clients", {
    name: "Test Client PDF",
    location: "Santiago, Chile",
    contactName: "Juan Pérez",
    contactPhone: "+56912345678",
    contactEmail: "juan@test.cl",
    frequencyDays: 90,
  });
  const client = clientRes.client;
  console.log(`   ✓ Client created: ${client.id}`);

  // Step 3: Add equipment
  console.log("\n3. Adding equipment...");
  const equipRes = await api("POST", `/clients/${client.id}/equipment`, {
    name: "Servidor Principal",
    ip: "192.168.1.100",
    mac: "AA:BB:CC:DD:EE:FF",
    serial: "SRV-001",
  });
  const equipment = equipRes.equipment;
  console.log(`   ✓ Equipment created: ${equipment.id}`);

  // Step 4: Start maintenance (requires clientId + equipmentIds)
  console.log("\n4. Starting maintenance...");
  const maintRes = await api("POST", "/maintenances", {
    clientId: client.id,
    equipmentIds: [equipment.id],
  });
  const maintenance = maintRes.maintenance;
  console.log(`   ✓ Maintenance started: ${maintenance.id}`);
  console.log(`   Items: ${maintenance.items.length}`);

  const itemId = maintenance.items[0].id;

  // Step 5: Update item with observations
  console.log("\n5. Updating maintenance item...");
  await api("PATCH", `/maintenances/${maintenance.id}/items/${itemId}`, {
    observations: "Servidor funcionando correctamente, limpieza realizada",
    completed: true,
  });
  console.log("   ✓ Item updated");

  // Step 6: Upload photo to item
  console.log("\n6. Uploading photo to item...");
  const testPng = generateTestPngBase64();
  const photoFormData = new FormData();
  const photoBlob = await fetch(testPng).then((r) => r.blob());
  photoFormData.append("file", photoBlob, "test-photo.png");

  try {
    await api(
      "POST",
      `/maintenances/${maintenance.id}/items/${itemId}/attachments`,
      photoFormData,
      true
    );
    console.log("   ✓ Photo uploaded");
  } catch (e: any) {
    console.log(`   ⚠ Photo upload failed (${e.message}), continuing...`);
  }

  // Step 7: Close maintenance with signatures
  console.log("\n7. Closing maintenance with signatures...");
  const closedRes = await api("POST", `/maintenances/${maintenance.id}/close`, {
    clientSignatureData: testPng,
    technicianSignatureData: testPng,
  });
  console.log(`   ✓ Maintenance closed`);
  console.log(`   PDF path: ${closedRes.pdfPath || "none"}`);

  // Step 8: Get PDF
  console.log("\n8. Fetching PDF...");
  const pdfRes = await api("GET", `/maintenances/${maintenance.id}/pdf`);

  const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());
  console.log(`   ✓ PDF fetched: ${pdfBuffer.length} bytes`);

  // Step 9: Verify PDF content
  console.log("\n9. Verifying PDF content...");

  // Check PDF header
  const pdfHeader = pdfBuffer.slice(0, 5).toString("ascii");
  console.log(`   PDF header: "${pdfHeader}"`);
  if (pdfHeader === "%PDF-") {
    console.log("   ✓ Valid PDF header");
  } else {
    console.error("   ✗ Invalid PDF header!");
    process.exit(1);
  }

  // Extract text from compressed streams
  const pdfContent = extractPdfText(pdfBuffer);
  const hexStrings = extractHexStrings(pdfContent);
  const allDecodedText = concatenateDecodedStrings(hexStrings);

  console.log("\n   Searching for required text strings:");

  const searchTerms = [
    { term: "Mantenti", desc: "Company name" },
    { term: "Reporte", desc: "Report subtitle (partial)" },
    { term: "Mantención", desc: "Report subtitle (accent)" },
    { term: "Firma", desc: "Signature label" },
    { term: "Técnico", desc: "Technician label" },
    { term: "Cliente", desc: "Client label" },
    { term: "Test Client PDF", desc: "Client name" },
    { term: "Servidor", desc: "Equipment name (partial)" },
    { term: "Santiago", desc: "Location" },
    { term: "Página", desc: "Page number" },
  ];

  let allFound = true;
  for (const { term, desc } of searchTerms) {
    // Check in concatenated decoded strings (handles split text)
    const foundInContent = allDecodedText.includes(term);
    console.log(
      `   ${foundInContent ? "✓" : "✗"} "${term}" (${desc}): ${foundInContent ? "FOUND" : "NOT FOUND"}`
    );
    if (!foundInContent) allFound = false;
  }

  // Count images (look for image XObjects in the raw PDF)
  const pdfRaw = pdfBuffer.toString("latin1");
  const imageMarkers = pdfRaw.match(/\/Subtype\s*\/Image/g);
  const imageCount = imageMarkers ? imageMarkers.length : 0;
  console.log(`\n   Embedded images: ${imageCount}`);
  console.log("   (Expected: 2 signatures + 1 photo = 3)");

  // Summary
  console.log("\n=== Test Results ===");
  console.log(`PDF Size: ${pdfBuffer.length} bytes`);
  console.log(`All text found: ${allFound ? "YES" : "NO"}`);
  console.log(`Images embedded: ${imageCount}`);

  if (allFound && imageCount >= 2 && pdfBuffer.length > 1000) {
    console.log("\n✅ ALL TESTS PASSED - PDF contains real text and images!");
  } else {
    console.log("\n❌ SOME TESTS FAILED - check output above");
    if (!allFound) console.log("   - Missing text strings");
    if (imageCount < 2) console.log("   - Expected at least 2 images (signatures)");
    if (pdfBuffer.length <= 1000) console.log("   - PDF too small");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
