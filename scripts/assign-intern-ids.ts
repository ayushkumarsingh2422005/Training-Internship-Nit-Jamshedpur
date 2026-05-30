/**
 * Assign Intern IDs (NIT-INT26-XXXX) to applications missing one.
 * Usage: npm run db:assign-intern-ids
 * Options:
 *   --dry-run   print planned assignments without writing
 *   --force     reassign all students in createdAt order (starts at 1000)
 */
import dotenv from "dotenv";
import path from "path";
import mongoose from "mongoose";
import Application from "../src/models/Application";
import { formatInternId, maxInternIdSequence, nextInternIdSequence } from "../src/lib/intern-id";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const DRY_RUN = process.argv.includes("--dry-run");
const FORCE = process.argv.includes("--force");

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set. Add it to .env.local");
  }

  await mongoose.connect(uri);
  console.log("Connected to MongoDB");

  const allDocs = await Application.find({})
    .sort({ createdAt: 1, _id: 1 })
    .select({ internId: 1, fullName: 1, email: 1, createdAt: 1 })
    .lean();

  if (allDocs.length === 0) {
    console.log("No applications found.");
    await mongoose.disconnect();
    return;
  }

  const existingIds = allDocs.map((doc) => doc.internId);
  let nextSequence = FORCE ? 1000 : nextInternIdSequence(existingIds);

  const updates: Array<{ id: string; fullName: string; email: string; internId: string }> = [];

  for (const doc of allDocs) {
    const id = doc._id.toString();
    const current = doc.internId?.trim() || null;

    if (!FORCE && current) {
      continue;
    }

    const internId = formatInternId(nextSequence);
    updates.push({
      id,
      fullName: doc.fullName,
      email: doc.email,
      internId,
    });
    nextSequence += 1;
  }

  if (updates.length === 0) {
    console.log("All applications already have an Intern ID.");
    await mongoose.disconnect();
    return;
  }

  console.log(`\n${DRY_RUN ? "[dry run] " : ""}Assigning ${updates.length} Intern ID(s):`);
  for (const row of updates) {
    console.log(`  ${row.internId}  ${row.fullName}  <${row.email}>`);
  }

  if (DRY_RUN) {
    console.log("\nDry run complete. No changes written.");
    await mongoose.disconnect();
    return;
  }

  const ops = updates.map((row) => ({
    updateOne: {
      filter: { _id: row.id },
      update: { $set: { internId: row.internId } },
    },
  }));

  const result = await Application.bulkWrite(ops, { ordered: true });
  const assignedMax = maxInternIdSequence(updates.map((row) => row.internId));

  console.log("\nIntern ID assignment complete:");
  console.log(`  Modified: ${result.modifiedCount}`);
  console.log(`  Highest ID: ${assignedMax != null ? formatInternId(assignedMax) : "—"}`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
