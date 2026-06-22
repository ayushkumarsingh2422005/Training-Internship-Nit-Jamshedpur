import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const testSchema = new Schema(
  {
    testName: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true, index: true },
    subpart: { type: String, required: true, trim: true, index: true },
    startDateTime: { type: Date, required: true },
    endDateTime: { type: Date, required: true },
    durationMinutes: { type: Number, required: true },
    instructions: { type: String },
    totalMarks: { type: Number, required: true, default: 0 },
    isNegativeMarking: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["Draft", "Published", "Archived"],
      default: "Draft",
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "Teacher", required: true },
  },
  {
    timestamps: true,
    collection: "tests",
  },
);

export type TestDocument = InferSchemaType<typeof testSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

const Test: Model<TestDocument> =
  mongoose.models.Test ?? mongoose.model<TestDocument>("Test", testSchema);

export default Test;
