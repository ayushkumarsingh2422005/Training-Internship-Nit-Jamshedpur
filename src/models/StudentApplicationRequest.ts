import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

export const REQUEST_STATUSES = ["pending", "approved", "rejected"] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

const studentApplicationRequestSchema = new Schema(
  {
    applicationId: { type: Schema.Types.ObjectId, ref: "Application", required: true, index: true },
    internId: { type: String, default: null, trim: true },
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    subject: { type: String, required: true, trim: true },
    subpart: { type: String, required: true, trim: true },
    requestText: { type: String, required: true, trim: true, maxlength: 4000 },
    status: { type: String, enum: REQUEST_STATUSES, default: "pending", required: true },
    adminRemark: { type: String, default: null, trim: true, maxlength: 2000 },
    reviewedByEmail: { type: String, default: null, trim: true, lowercase: true },
    reviewedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    collection: "student_application_requests",
  },
);

studentApplicationRequestSchema.index({ status: 1, createdAt: -1 });

export type StudentApplicationRequestDocument = InferSchemaType<typeof studentApplicationRequestSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

const StudentApplicationRequest: Model<StudentApplicationRequestDocument> =
  mongoose.models.StudentApplicationRequest ??
  mongoose.model<StudentApplicationRequestDocument>(
    "StudentApplicationRequest",
    studentApplicationRequestSchema,
  );

export default StudentApplicationRequest;
