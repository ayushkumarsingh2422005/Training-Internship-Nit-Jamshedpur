import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const testQuestionSchema = new Schema(
  {
    testId: { type: Schema.Types.ObjectId, ref: "Test", required: true, index: true },
    questionId: { type: Schema.Types.ObjectId, ref: "QuestionBank", required: true },
    marks: { type: Number, required: true },
    negativeMarks: { type: Number, default: 0 },
    timeLimitSeconds: { type: Number, default: 0 }, // 0 means no per-question limit
    order: { type: Number, required: true, default: 0 },
  },
  {
    timestamps: true,
    collection: "test_questions",
  },
);

export type TestQuestionDocument = InferSchemaType<typeof testQuestionSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

const TestQuestion: Model<TestQuestionDocument> =
  mongoose.models.TestQuestion ??
  mongoose.model<TestQuestionDocument>("TestQuestion", testQuestionSchema);

export default TestQuestion;
