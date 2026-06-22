import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const studentTestAccessSchema = new Schema(
  {
    testId: { type: Schema.Types.ObjectId, ref: "Test", required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: "Application", required: true, index: true },
    studentHash: { type: String, required: true, unique: true },
    secureToken: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ["Not Started", "In Progress", "Submitted", "Terminated"],
      default: "Not Started",
    },
    startedAt: { type: Date, default: null },
    submittedAt: { type: Date, default: null },
    tabSwitches: { type: Number, default: 0 },
    focusLosses: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    collection: "student_test_access",
  },
);

export type StudentTestAccessDocument = InferSchemaType<typeof studentTestAccessSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

const StudentTestAccess: Model<StudentTestAccessDocument> =
  mongoose.models.StudentTestAccess ??
  mongoose.model<StudentTestAccessDocument>("StudentTestAccess", studentTestAccessSchema);

export default StudentTestAccess;
