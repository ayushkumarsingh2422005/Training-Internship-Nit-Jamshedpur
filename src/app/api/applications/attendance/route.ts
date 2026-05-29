import { NextResponse } from "next/server";
import {
  type AttendanceSessionType,
  type AttendanceStatus,
  type StudentAttendanceEntry,
  attendancePercentage,
} from "@/lib/attendance";
import connectDB from "@/lib/mongodb";
import { getSessionFromRequest } from "@/lib/student-session";
import Application from "@/models/Application";
import AttendanceSession from "@/models/AttendanceSession";

export async function GET(request: Request) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Session expired. Please sign in again." }, { status: 401 });
    }

    await connectDB();

    const application = await Application.findOne({
      email: session.email,
      phoneNumber: session.phoneNumber,
    }).lean();

    if (!application) {
      return NextResponse.json({ error: "Application not found." }, { status: 404 });
    }

    const applicationId = application._id.toString();
    const sessions = await AttendanceSession.find({
      module: application.subpart,
      "records.applicationId": application._id,
    })
      .sort({ date: -1, sessionType: 1 })
      .lean();

    const entries: StudentAttendanceEntry[] = [];

    for (const attendanceSession of sessions) {
      const record = attendanceSession.records.find(
        (item) => item.applicationId.toString() === applicationId,
      );
      if (!record) continue;

      entries.push({
        id: attendanceSession._id.toString(),
        date: attendanceSession.date,
        sessionType: attendanceSession.sessionType as AttendanceSessionType,
        topic: attendanceSession.topic,
        status: record.status as AttendanceStatus,
      });
    }

    const theoryEntries = entries.filter((entry) => entry.sessionType === "theory");
    const labEntries = entries.filter((entry) => entry.sessionType === "lab");

    const theoryPresent = theoryEntries.filter((entry) => entry.status === "present").length;
    const labPresent = labEntries.filter((entry) => entry.status === "present").length;

    return NextResponse.json({
      module: application.subpart,
      theory: {
        present: theoryPresent,
        absent: theoryEntries.length - theoryPresent,
        total: theoryEntries.length,
        percentage: attendancePercentage(theoryPresent, theoryEntries.length),
      },
      lab: {
        present: labPresent,
        absent: labEntries.length - labPresent,
        total: labEntries.length,
        percentage: attendancePercentage(labPresent, labEntries.length),
      },
      entries,
    });
  } catch (error) {
    console.error("GET /api/applications/attendance", error);
    return NextResponse.json({ error: "Unable to load attendance." }, { status: 500 });
  }
}
