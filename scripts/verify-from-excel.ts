/**
 * Mark students as admin-verified from an Excel list.
 *
 * Usage:
 *   npm run db:verify-from-excel
 *   npm run db:verify-from-excel -- --file ".varification data/Final Registered Students.xlsx"
 *   npm run db:verify-from-excel -- --dry-run
 *   npm run db:verify-from-excel -- --apply
 */
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import xlsx from "xlsx";
import Application from "../src/models/Application";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const DEFAULT_FILE = path.resolve(
  process.cwd(),
  ".varification data",
  "Final Registered Students.xlsx",
);

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const DRY_RUN = !APPLY || args.includes("--dry-run");

function getArgValue(flag: string): string | null {
  const idx = args.indexOf(flag);
  if (idx === -1) return null;
  return args[idx + 1] ?? null;
}

function normalizeInternId(value: unknown): string | null {
  if (value == null) return null;
  const text = String(value).trim().toUpperCase();
  return text || null;
}

function loadInternIdsFromExcel(filePath: string): string[] {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Excel file not found: ${filePath}`);
  }

  const workbook = xlsx.readFile(filePath, { cellDates: false });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error("Excel file has no sheets.");
  }

  const rows = xlsx.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName], {
    defval: "",
  });

  if (rows.length === 0) {
    throw new Error("Excel sheet has no data rows.");
  }

  const firstRow = rows[0];
  const internIdHeader =
    Object.keys(firstRow).find((key) => key.toLowerCase().replace(/\s+/g, "") === "internid") ??
    "InternId";

  const ids = new Set<string>();
  for (const row of rows) {
    const id = normalizeInternId(row[internIdHeader]);
    if (id) ids.add(id);
  }

  return Array.from(ids);
}

async function main() {
  const fileArg = getArgValue("--file");
  const excelPath = path.resolve(process.cwd(), fileArg || DEFAULT_FILE);
  const internIds = loadInternIdsFromExcel(excelPath);

  if (internIds.length === 0) {
    throw new Error("No Intern IDs found in Excel.");
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set. Add it to .env.local");
  }

  await mongoose.connect(uri);
  console.log("Connected to MongoDB");
  console.log(`Loaded ${internIds.length} unique Intern IDs from Excel.`);

  const docs = await Application.find({ internId: { $in: internIds } })
    .select({ _id: 1, internId: 1, isVerifiedByAdmin: 1 })
    .lean();

  const foundSet = new Set(docs.map((doc) => (doc.internId ?? "").toUpperCase()));
  const missingIds = internIds.filter((id) => !foundSet.has(id));

  const toVerify = docs.filter((doc) => !doc.isVerifiedByAdmin);
  const alreadyVerified = docs.length - toVerify.length;

  console.log(`Matched in DB: ${docs.length}`);
  console.log(`Already verified: ${alreadyVerified}`);
  console.log(`To mark verified: ${toVerify.length}`);
  console.log(`Not found in DB: ${missingIds.length}`);

  if (missingIds.length > 0) {
    console.log("\nSample not-found Intern IDs:");
    for (const id of missingIds.slice(0, 20)) {
      console.log(`  ${id}`);
    }
    if (missingIds.length > 20) {
      console.log(`  ...and ${missingIds.length - 20} more`);
    }
  }

  if (DRY_RUN) {
    console.log("\nDry run complete. No DB changes written.");
    await mongoose.disconnect();
    return;
  }

  if (toVerify.length > 0) {
    const now = new Date();
    const ops = toVerify.map((doc) => ({
      updateOne: {
        filter: { _id: doc._id },
        update: {
          $set: {
            isVerifiedByAdmin: true,
            verifiedByAdminAt: now,
          },
        },
      },
    }));
    const result = await Application.bulkWrite(ops, { ordered: false });
    console.log(`\nUpdated verified students: ${result.modifiedCount}`);
  } else {
    console.log("\nNo new students needed verification.");
  }

  await mongoose.disconnect();
  console.log("Done.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
