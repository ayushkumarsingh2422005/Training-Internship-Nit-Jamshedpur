/**
 * Load public/data.json into MongoDB (applications collection).
 * Usage: npm run db:seed
 * Options: --reset  drop applications collection before insert
 */
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import Application, { type ApplicationInput } from "../src/models/Application";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const DATA_PATH = path.resolve(process.cwd(), "public", "data.json");
const RESET = process.argv.includes("--reset");

function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

function loadApplications(): ApplicationInput[] {
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
  console.log(`Loaded ${applications.length} records from ${DATA_PATH}`);

  await mongoose.connect(uri);
  console.log("Connected to MongoDB");

  if (RESET) {
    await Application.collection.drop().catch(() => {
      /* collection may not exist yet */
    });
    console.log("Dropped applications collection");
  }

  const ops = applications.map((doc) => ({
    updateOne: {
      filter: { email: doc.email },
      update: { $set: doc },
      upsert: true,
    },
  }));

  const result = await Application.bulkWrite(ops, { ordered: false });
  const total = await Application.countDocuments();

  console.log("\nSeed complete:");
  console.log(`  Upserted: ${result.upsertedCount}`);
  console.log(`  Modified: ${result.modifiedCount}`);
  console.log(`  Matched:  ${result.matchedCount}`);
  console.log(`  Total in DB: ${total}`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
