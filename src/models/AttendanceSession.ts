import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { ATTENDANCE_SESSION_TYPES, ATTENDANCE_STATUSES } from "@/lib/attendance";

const attendanceRecordSchema = new Schema(
  {
    applicationId: { type: Schema.Types.ObjectId, ref: "Application", required: true },
    status: { type: String, enum: ATTENDANCE_STATUSES, required: true },
  },
  { _id: false },
);

const attendanceSessionSchema = new Schema(
  {
    date: { type: String, required: true, trim: true },
    module: { type: String, required: true, trim: true },
    sessionType: { type: String, enum: ATTENDANCE_SESSION_TYPES, required: true },
    topic: { type: String, required: true, trim: true },
    records: { type: [attendanceRecordSchema], default: [] },
  },
  {
    timestamps: true,
    collection: "attendance_sessions",
  },
);

attendanceSessionSchema.index({ date: 1, module: 1, sessionType: 1 }, { unique: true });
attendanceSessionSchema.index({ module: 1, date: -1 });
attendanceSessionSchema.index({ "records.applicationId": 1 });

export type AttendanceSessionDocument = InferSchemaType<typeof attendanceSessionSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

const AttendanceSession: Model<AttendanceSessionDocument> =
  mongoose.models.AttendanceSession ??
  mongoose.model<AttendanceSessionDocument>("AttendanceSession", attendanceSessionSchema);

export default AttendanceSession;
