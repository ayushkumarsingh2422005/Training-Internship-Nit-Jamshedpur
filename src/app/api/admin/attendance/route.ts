import mongoose from "mongoose";
import { NextResponse } from "next/server";
import {
  type AttendanceSessionType,
  type AttendanceStatus,
  type AttendanceStudentRow,
  isAttendanceSessionType,
  isAttendanceStatus,
  summarizeAttendanceCounts,
} from "@/lib/attendance";
import { getAdminSessionFromRequest } from "@/lib/admin-session";
import connectDB from "@/lib/mongodb";
import Application from "@/models/Application";
import AttendanceSession from "@/models/AttendanceSession";

type SavePayload = {
  id?: string;
  date?: string;
  module?: string;
  sessionType?: string;
  topic?: string;
  records?: { applicationId?: string; status?: string }[];
};

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isValidDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function statusMapFromSession(
  records: { applicationId: mongoose.Types.ObjectId; status: AttendanceStatus }[],
): Map<string, AttendanceStatus> {
  return new Map(records.map((record) => [record.applicationId.toString(), record.status]));
}

export async function GET(request: Request) {
  try {
    if (!(await getAdminSessionFromRequest(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const date = clean(searchParams.get("date"));
    const moduleName = clean(searchParams.get("module"));
    const sessionType = clean(searchParams.get("sessionType"));

    await connectDB();

    const modules = (await Application.distinct("subpart")).filter(Boolean).sort();

    if (!date || !moduleName || !sessionType) {
      return NextResponse.json({ modules, session: null, students: [] });
    }

    if (!isValidDate(date)) {
      return NextResponse.json({ error: "Invalid date format." }, { status: 400 });
    }

    if (!isAttendanceSessionType(sessionType)) {
      return NextResponse.json({ error: "Session type must be theory or lab." }, { status: 400 });
    }

    const [applications, existingSession] = await Promise.all([
      Application.find({ subpart: moduleName }).sort({ fullName: 1 }).lean(),
      AttendanceSession.findOne({ date, module: moduleName, sessionType }).lean(),
    ]);

    const statusByApplicationId = existingSession
      ? statusMapFromSession(
          existingSession.records.map((record) => ({
            applicationId: record.applicationId as mongoose.Types.ObjectId,
            status: record.status as AttendanceStatus,
          })),
        )
      : new Map<string, AttendanceStatus>();

    const students: AttendanceStudentRow[] = applications.map((application) => {
      const id = application._id.toString();
      return {
        id,
        internId: application.internId?.trim() || null,
        fullName: application.fullName,
        email: application.email,
        phoneNumber: application.phoneNumber,
        collegeName: application.collegeName,
        status: statusByApplicationId.get(id) ?? "present",
      };
    });

    const counts = summarizeAttendanceCounts(
      students.map((student) => ({ status: student.status ?? "present" })),
    );

    const session = existingSession
      ? {
          id: existingSession._id.toString(),
          date: existingSession.date,
          module: existingSession.module,
          sessionType: existingSession.sessionType as AttendanceSessionType,
          topic: existingSession.topic,
          ...counts,
          updatedAt: existingSession.updatedAt?.toISOString() ?? null,
        }
      : null;

    return NextResponse.json({
      modules,
      session,
      students,
      isExisting: Boolean(existingSession),
    });
  } catch (error) {
    console.error("GET /api/admin/attendance", error);
    return NextResponse.json({ error: "Failed to load attendance session." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    if (!(await getAdminSessionFromRequest(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as SavePayload;
    const id = clean(body.id);
    const date = clean(body.date);
    const moduleName = clean(body.module);
    const sessionType = clean(body.sessionType);
    const topic = clean(body.topic);
    const records = Array.isArray(body.records) ? body.records : [];

    if (!date || !moduleName || !sessionType || !topic) {
      return NextResponse.json(
        { error: "Date, module, session type, and topic are required." },
        { status: 400 },
      );
    }

    if (!isValidDate(date)) {
      return NextResponse.json({ error: "Invalid date format." }, { status: 400 });
    }

    if (!isAttendanceSessionType(sessionType)) {
      return NextResponse.json({ error: "Session type must be theory or lab." }, { status: 400 });
    }

    if (records.length === 0) {
      return NextResponse.json({ error: "At least one student record is required." }, { status: 400 });
    }

    const normalizedRecords = records.map((record) => {
      const applicationId = clean(record.applicationId);
      const status = clean(record.status);
      if (!applicationId || !mongoose.Types.ObjectId.isValid(applicationId)) {
        throw new Error("INVALID_APPLICATION");
      }
      if (!isAttendanceStatus(status)) {
        throw new Error("INVALID_STATUS");
      }
      return { applicationId, status };
    });

    await connectDB();

    const moduleStudentIds = new Set(
      (await Application.find({ subpart: moduleName }).select("_id").lean()).map((application) =>
        application._id.toString(),
      ),
    );

    for (const record of normalizedRecords) {
      if (!moduleStudentIds.has(record.applicationId)) {
        return NextResponse.json(
          { error: "One or more students do not belong to the selected module." },
          { status: 400 },
        );
      }
    }

    const payload = {
      date,
      module: moduleName,
      sessionType,
      topic,
      records: normalizedRecords.map((record) => ({
        applicationId: new mongoose.Types.ObjectId(record.applicationId),
        status: record.status,
      })),
    };

    let saved;
    if (id) {
      saved = await AttendanceSession.findByIdAndUpdate(id, { $set: payload }, { new: true }).lean();
      if (!saved) {
        return NextResponse.json({ error: "Attendance session not found." }, { status: 404 });
      }
    } else {
      saved = await AttendanceSession.findOneAndUpdate(
        { date, module: moduleName, sessionType },
        { $set: payload },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      ).lean();
    }

    const counts = summarizeAttendanceCounts(
      saved.records.map((record) => ({ status: record.status as AttendanceStatus })),
    );

    return NextResponse.json({
      success: true,
      session: {
        id: saved._id.toString(),
        date: saved.date,
        module: saved.module,
        sessionType: saved.sessionType,
        topic: saved.topic,
        ...counts,
        updatedAt: saved.updatedAt?.toISOString() ?? null,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "INVALID_APPLICATION") {
        return NextResponse.json({ error: "Invalid student record in attendance." }, { status: 400 });
      }
      if (error.message === "INVALID_STATUS") {
        return NextResponse.json({ error: "Invalid attendance status." }, { status: 400 });
      }
    }
    console.error("PUT /api/admin/attendance", error);
    return NextResponse.json({ error: "Failed to save attendance session." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    if (!(await getAdminSessionFromRequest(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = clean(searchParams.get("id"));
    const date = clean(searchParams.get("date"));
    const moduleName = clean(searchParams.get("module"));
    const sessionType = clean(searchParams.get("sessionType"));

    await connectDB();

    let deleted;
    if (id) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return NextResponse.json({ error: "Invalid session id." }, { status: 400 });
      }
      deleted = await AttendanceSession.findByIdAndDelete(id).lean();
    } else if (date && moduleName && sessionType) {
      if (!isValidDate(date)) {
        return NextResponse.json({ error: "Invalid date format." }, { status: 400 });
      }
      if (!isAttendanceSessionType(sessionType)) {
        return NextResponse.json({ error: "Session type must be theory or lab." }, { status: 400 });
      }
      deleted = await AttendanceSession.findOneAndDelete({ date, module: moduleName, sessionType }).lean();
    } else {
      return NextResponse.json(
        { error: "Session id or date, module, and session type are required." },
        { status: 400 },
      );
    }

    if (!deleted) {
      return NextResponse.json({ error: "Attendance session not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/admin/attendance", error);
    return NextResponse.json({ error: "Failed to delete attendance session." }, { status: 500 });
  }
}
