import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const testResultSchema = new Schema(
  {
    testId: { type: Schema.Types.ObjectId, ref: "Test", required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: "Application", required: true, index: true },
    accessId: { type: Schema.Types.ObjectId, ref: "StudentTestAccess", required: true, unique: true },
    totalScore: { type: Number, required: true },
    correctQuestions: { type: Number, required: true },
    incorrectQuestions: { type: Number, required: true },
    unattemptedQuestions: { type: Number, required: true },
    accuracyPercentage: { type: Number, required: true },
    totalTimeSpentSeconds: { type: Number, required: true },
  },
  {
    timestamps: true,
    collection: "test_results",
  },
);

export type TestResultDocument = InferSchemaType<typeof testResultSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

const TestResult: Model<TestResultDocument> =
  mongoose.models.TestResult ?? mongoose.model<TestResultDocument>("TestResult", testResultSchema);

export default TestResult;
