import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const manualExamResultSchema = new Schema(
  {
    manualExamId: { type: Schema.Types.ObjectId, ref: "ManualExam", required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: "Application", required: true, index: true },
    score: { type: Number, required: true, min: 0 },
    remarks: { type: String, default: "", trim: true },
    enteredBy: { type: Schema.Types.ObjectId, ref: "Teacher", required: true },
  },
  {
    timestamps: true,
    collection: "manual_exam_results",
  },
);

manualExamResultSchema.index({ manualExamId: 1, studentId: 1 }, { unique: true });
manualExamResultSchema.index({ studentId: 1, createdAt: -1 });

export type ManualExamResultDocument = InferSchemaType<typeof manualExamResultSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

const ManualExamResult: Model<ManualExamResultDocument> =
  mongoose.models.ManualExamResult ??
  mongoose.model<ManualExamResultDocument>("ManualExamResult", manualExamResultSchema);

export default ManualExamResult;
