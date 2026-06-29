"use client";

import { useState } from "react";
import { AdminAttendance } from "@/components/AdminAttendance";
import { AdminAttendanceReport } from "@/components/AdminAttendanceReport";

type AttendanceTab = "mark" | "report";

export function AdminAttendanceHub() {
  const [activeTab, setActiveTab] = useState<AttendanceTab>("mark");

  return (
    <div className="admin-attendance-hub">
      <div className="admin-attendance-tabs" role="tablist" aria-label="Attendance views">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "mark"}
          className={`btn btn-sm ${activeTab === "mark" ? "btn-green" : "btn-secondary"}`}
          onClick={() => setActiveTab("mark")}
        >
          Mark attendance
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "report"}
          className={`btn btn-sm ${activeTab === "report" ? "btn-green" : "btn-secondary"}`}
          onClick={() => setActiveTab("report")}
        >
          Attendance report
        </button>
      </div>

      {activeTab === "mark" ? <AdminAttendance /> : <AdminAttendanceReport />}
    </div>
  );
}
