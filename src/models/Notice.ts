import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const noticeSchema = new Schema(
  {
    legacyId: { type: String, trim: true, default: null, index: true },
    title: { type: String, required: true, trim: true },
    date: { type: Date, required: true },
    category: { type: String, required: true, trim: true, maxlength: 60 },
    excerpt: { type: String, required: true, trim: true },
    body: { type: String, required: true, trim: true },
    isNew: { type: Boolean, default: false },
    isPublished: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    collection: "notices",
    suppressReservedKeysWarning: true,
  },
);

noticeSchema.index({ isPublished: 1, date: -1 });

export type NoticeDocument = InferSchemaType<typeof noticeSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

const Notice: Model<NoticeDocument> =
  mongoose.models.Notice ?? mongoose.model<NoticeDocument>("Notice", noticeSchema);

export default Notice;
