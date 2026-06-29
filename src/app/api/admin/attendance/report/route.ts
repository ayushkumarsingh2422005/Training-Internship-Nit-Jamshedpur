import mongoose from "mongoose";
import { NextResponse } from "next/server";
import {
  extractStudentEntriesFromSessions,
  summarizeAttendanceEntries,
  type AttendanceSessionRecord,
} from "@/lib/attendance";
import { getAdminSessionFromRequest } from "@/lib/admin-session";
import connectDB from "@/lib/mongodb";
import Application from "@/models/Application";
import AttendanceSession from "@/models/AttendanceSession";

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(request: Request) {
  try {
    if (!(await getAdminSessionFromRequest(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const moduleName = clean(searchParams.get("module"));
    const q = clean(searchParams.get("q"));
    const applicationId = clean(searchParams.get("applicationId"));

    await connectDB();

    const modules = (await Application.distinct("subpart")).filter(Boolean).sort();

    if (applicationId) {
      if (!mongoose.Types.ObjectId.isValid(applicationId)) {
        return NextResponse.json({ error: "Invalid application id." }, { status: 400 });
      }

      const application = await Application.findById(applicationId).lean();
      if (!application) {
        return NextResponse.json({ error: "Application not found." }, { status: 404 });
      }

      const sessions = await AttendanceSession.find({
        module: application.subpart,
        "records.applicationId": application._id,
      })
        .sort({ date: -1, sessionType: 1 })
        .lean();

      const entries = extractStudentEntriesFromSessions(
        applicationId,
        sessions as AttendanceSessionRecord[],
      );
      const summary = summarizeAttendanceEntries(entries);

      return NextResponse.json({
        modules,
        student: {
          id: application._id.toString(),
          internId: application.internId?.trim() || null,
          fullName: application.fullName,
          email: application.email,
          phoneNumber: application.phoneNumber,
          collegeName: application.collegeName,
          subject: application.subject,
          module: application.subpart,
          isVerifiedByAdmin: Boolean(application.isVerifiedByAdmin),
        },
        module: application.subpart,
        ...summary,
        entries,
      });
    }

    const filter: Record<string, unknown> = { isVerifiedByAdmin: true };
    if (moduleName) filter.subpart = moduleName;
    if (q) {
      const regex = new RegExp(escapeRegex(q), "i");
      filter.$or = [
        { fullName: regex },
        { email: regex },
        { phoneNumber: regex },
        { internId: regex },
        { collegeName: regex },
      ];
    }

    const applications = await Application.find(filter).sort({ fullName: 1 }).lean();
    const moduleSet = new Set(applications.map((application) => application.subpart).filter(Boolean));
    const sessions =
      moduleSet.size > 0
        ? await AttendanceSession.find({ module: { $in: [...moduleSet] } }).lean()
        : [];

    const sessionsByModule = new Map<string, AttendanceSessionRecord[]>();
    for (const session of sessions) {
      const key = session.module;
      const list = sessionsByModule.get(key) ?? [];
      list.push(session as AttendanceSessionRecord);
      sessionsByModule.set(key, list);
    }

    const items = applications.map((application) => {
      const id = application._id.toString();
      const moduleSessions = sessionsByModule.get(application.subpart) ?? [];
      const entries = extractStudentEntriesFromSessions(id, moduleSessions);
      const summary = summarizeAttendanceEntries(entries);

      return {
        applicationId: id,
        internId: application.internId?.trim() || null,
        fullName: application.fullName,
        email: application.email,
        phoneNumber: application.phoneNumber,
        collegeName: application.collegeName,
        subject: application.subject,
        module: application.subpart,
        ...summary,
      };
    });

    const withSessions = items.filter((item) => item.overall.total > 0).length;
    const averageOverallPercentage =
      withSessions > 0
        ? Math.round(
            items
              .filter((item) => item.overall.total > 0)
              .reduce((sum, item) => sum + item.overall.percentage, 0) / withSessions,
          )
        : 0;
    const belowThreshold = items.filter(
      (item) => item.overall.total > 0 && item.overall.percentage < 75,
    ).length;

    return NextResponse.json({
      modules,
      stats: {
        totalStudents: items.length,
        withSessions,
        averageOverallPercentage,
        belowThreshold,
      },
      items,
    });
  } catch (error) {
    console.error("GET /api/admin/attendance/report", error);
    return NextResponse.json({ error: "Failed to load attendance report." }, { status: 500 });
  }
}
