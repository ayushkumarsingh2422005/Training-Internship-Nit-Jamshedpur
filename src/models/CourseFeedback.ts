import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const courseFeedbackSchema = new Schema(
  {
    applicationId: { type: Schema.Types.ObjectId, ref: "Application", required: true, index: true },
    internId: { type: String, default: null, trim: true },
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    subject: { type: String, required: true, trim: true },
    subpart: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
  },
  {
    timestamps: true,
    collection: "course_feedback",
  },
);

courseFeedbackSchema.index({ createdAt: -1 });

export type CourseFeedbackDocument = InferSchemaType<typeof courseFeedbackSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

const CourseFeedback: Model<CourseFeedbackDocument> =
  mongoose.models.CourseFeedback ??
  mongoose.model<CourseFeedbackDocument>("CourseFeedback", courseFeedbackSchema);

export default CourseFeedback;
