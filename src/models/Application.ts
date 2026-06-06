import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const applicationSchema = new Schema(
  {
    fullName: { type: String, required: true, trim: true },
    fatherName: { type: String, required: true, trim: true },
    schoolName: { type: String, required: true, trim: true },
    collegeName: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    phoneNumber: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    subject: { type: String, required: true, trim: true },
    subpart: { type: String, required: true, trim: true },
    wantsAccommodation: { type: Boolean, default: null },
    accommodationEnrolledAt: { type: Date, default: null },
    gender: { type: String, default: null, trim: true },
    aadharNumber: { type: String, default: null, trim: true },
    collegeRegistrationNumber: { type: String, default: null, trim: true },
    profileCorrectedAt: { type: Date, default: null },
    hasLaptop: { type: Boolean, default: null },
    laptopUpdatedAt: { type: Date, default: null },
    internId: { type: String, default: null, trim: true },
    hostellerVerificationFromAdmin: { type: Boolean, default: false },
    hostellerVerificationAt: { type: Date, default: null },
    isVerifiedByAdmin: { type: Boolean, default: false },
    verifiedByAdminAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    collection: "applications",
  },
);

applicationSchema.index({ email: 1 }, { unique: true });
applicationSchema.index({ phoneNumber: 1 });
applicationSchema.index({ subject: 1, subpart: 1 });
applicationSchema.index({ internId: 1 }, { unique: true, sparse: true });
applicationSchema.index({ hostellerVerificationFromAdmin: 1, fullName: 1 });
applicationSchema.index({ isVerifiedByAdmin: 1, fullName: 1 });

export type ApplicationDocument = InferSchemaType<typeof applicationSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type ApplicationInput = Pick<
  ApplicationDocument,
  | "fullName"
  | "fatherName"
  | "schoolName"
  | "collegeName"
  | "address"
  | "phoneNumber"
  | "email"
  | "subject"
  | "subpart"
>;

const Application: Model<ApplicationDocument> =
  mongoose.models.Application ??
  mongoose.model<ApplicationDocument>("Application", applicationSchema);

export default Application;
