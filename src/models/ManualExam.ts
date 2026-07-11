import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const manualExamSchema = new Schema(
  {
    examName: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true, index: true },
    subpart: { type: String, required: true, trim: true, index: true },
    examType: {
      type: String,
      enum: ["Theory", "Lab", "Other"],
      default: "Theory",
    },
    maxMarks: { type: Number, required: true, min: 0 },
    examDate: { type: Date, default: null },
    notes: { type: String, default: "", trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "Teacher", required: true, index: true },
  },
  {
    timestamps: true,
    collection: "manual_exams",
  },
);

manualExamSchema.index({ subject: 1, subpart: 1 });
manualExamSchema.index({ createdBy: 1, createdAt: -1 });

export type ManualExamDocument = InferSchemaType<typeof manualExamSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

const ManualExam: Model<ManualExamDocument> =
  mongoose.models.ManualExam ?? mongoose.model<ManualExamDocument>("ManualExam", manualExamSchema);

export default ManualExam;
