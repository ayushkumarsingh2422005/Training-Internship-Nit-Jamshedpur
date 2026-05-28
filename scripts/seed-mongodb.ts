/**
 * Load public/data.json and notice seeds into MongoDB.
 * Usage: npm run db:seed
 * Options: --reset  drop applications and notices collections before insert
 */
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import Application, { type ApplicationInput } from "../src/models/Application";
import Notice from "../src/models/Notice";
import { notices } from "../src/lib/content";
import { normalizeNoticeSeed } from "../src/lib/notices";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const DATA_PATH = path.resolve(process.cwd(), "public", "data.json");
const RESET = process.argv.includes("--reset");

function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

function loadApplications(): ApplicationInput[] {
  if (!fs.existsSync(DATA_PATH)) {
    console.warn(`Applications seed file not found at ${DATA_PATH}. Skipping applications seed.`);
    return [];
  }
  const raw = JSON.parse(fs.readFileSync(DATA_PATH, "utf-8")) as ApplicationInput[];
  if (!Array.isArray(raw)) {
    throw new Error("data.json must be a JSON array of applications");
  }
  return raw.map((row) => ({
    fullName: row.fullName.trim(),
    fatherName: row.fatherName.trim(),
    schoolName: row.schoolName.trim(),
    collegeName: row.collegeName.trim(),
    address: row.address.trim(),
    phoneNumber: normalizePhone(row.phoneNumber),
    email: row.email.trim().toLowerCase(),
    subject: row.subject.trim(),
    subpart: row.subpart.trim(),
  }));
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set. Add it to .env.local");
  }

  const applications = loadApplications();
  if (applications.length > 0) {
    console.log(`Loaded ${applications.length} records from ${DATA_PATH}`);
  }

  await mongoose.connect(uri);
  console.log("Connected to MongoDB");

  if (RESET) {
    await Application.collection.drop().catch(() => {
      /* collection may not exist yet */
    });
    await Notice.collection.drop().catch(() => {
      /* collection may not exist yet */
    });
    console.log("Dropped applications and notices collections");
  }

  let result = { upsertedCount: 0, modifiedCount: 0, matchedCount: 0 };
  let total = 0;
  if (applications.length > 0) {
    const ops = applications.map((doc) => ({
      updateOne: {
        filter: { email: doc.email },
        update: { $set: doc },
        upsert: true,
      },
    }));

    const writeResult = await Application.bulkWrite(ops, { ordered: false });
    result = {
      upsertedCount: writeResult.upsertedCount,
      modifiedCount: writeResult.modifiedCount,
      matchedCount: writeResult.matchedCount,
    };
    total = await Application.countDocuments();
  }

  const noticeOps = notices.map((notice) => {
    const normalized = normalizeNoticeSeed(notice);
    return {
      updateOne: {
        filter: { legacyId: normalized.legacyId },
        update: { $set: normalized },
        upsert: true,
      },
    };
  });

  const noticeResult = await Notice.bulkWrite(noticeOps, { ordered: false });
  const noticeTotal = await Notice.countDocuments();

  console.log("\nSeed complete:");
  console.log(`  Upserted: ${result.upsertedCount}`);
  console.log(`  Modified: ${result.modifiedCount}`);
  console.log(`  Matched:  ${result.matchedCount}`);
  console.log(`  Total in DB: ${total}`);
  console.log("\nNotices seed:");
  console.log(`  Upserted: ${noticeResult.upsertedCount}`);
  console.log(`  Modified: ${noticeResult.modifiedCount}`);
  console.log(`  Matched:  ${noticeResult.matchedCount}`);
  console.log(`  Total notices in DB: ${noticeTotal}`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
