// ─────────────────────────────────────────────────────────────────────────────
// CSV Upload endpoint
// Accepts a multipart form upload with:
//   file  — the CSV file
//   type  — "samsara" | "claims"
//
// Saves to the project data/ directory, then busts the data config cache.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { bustDataConfig } from "@/lib/dataConfig";
import { bustSamsaraCache } from "@/app/api/samsara/route";

const DATA_DIR = path.join(process.cwd(), "data");
const MAX_BYTES = 25 * 1024 * 1024; // 25 MB

const FILE_NAMES: Record<string, string> = {
  samsara: "samsara_events.csv",
  claims:  "claims.csv",
};

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const type = (form.get("type") as string | null) ?? "samsara";

    if (!file) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }
    if (!file.name.endsWith(".csv")) {
      return NextResponse.json({ error: "Only CSV files are accepted." }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File exceeds 25 MB limit." }, { status: 400 });
    }

    const fileName = FILE_NAMES[type] ?? "samsara_events.csv";
    const destPath = path.join(DATA_DIR, fileName);

    // Ensure data/ directory exists
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(destPath, buffer);

    // Count rows (header + data lines)
    const text = buffer.toString("utf-8").replace(/^\uFEFF/, "");
    const rows = text.split(/\r?\n/).filter((l) => l.trim()).length - 1; // minus header

    // Bust caches so next request reloads from disk
    bustDataConfig();
    if (type === "samsara") bustSamsaraCache();

    return NextResponse.json({
      ok: true,
      file: fileName,
      path: destPath,
      rows,
      bytes: file.size,
    });
  } catch (err) {
    console.error("[upload] Error:", err);
    return NextResponse.json({ error: "Upload failed." }, { status: 500 });
  }
}
