import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const certificateSchema = new Schema(
  {
    applicationId: {
      type: Schema.Types.ObjectId,
      ref: "Application",
      required: true,
      unique: true,
      index: true,
    },
    certificateNumber: { type: String, required: true, unique: true, trim: true },
    verificationCode: { type: String, required: true, unique: true, index: true, trim: true },
    fullName: { type: String, required: true, trim: true },
    internId: { type: String, required: true, trim: true },
    collegeName: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    subpart: { type: String, required: true, trim: true },
    issuedAt: { type: Date, required: true, default: Date.now },
    status: { type: String, enum: ["valid", "revoked"], default: "valid", index: true },
  },
  {
    timestamps: true,
    collection: "certificates",
  },
);

export type CertificateDocument = InferSchemaType<typeof certificateSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

const Certificate: Model<CertificateDocument> =
  mongoose.models.Certificate ??
  mongoose.model<CertificateDocument>("Certificate", certificateSchema);

export default Certificate;
