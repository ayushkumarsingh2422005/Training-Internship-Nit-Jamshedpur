import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const studentAnswerSchema = new Schema(
  {
    accessId: { type: Schema.Types.ObjectId, ref: "StudentTestAccess", required: true, index: true },
    testId: { type: Schema.Types.ObjectId, ref: "Test", required: true },
    questionId: { type: Schema.Types.ObjectId, ref: "QuestionBank", required: true },
    studentId: { type: Schema.Types.ObjectId, ref: "Application", required: true },
    selectedOptionIds: [{ type: Schema.Types.ObjectId }], // For single/multiple correct
    integerAnswer: { type: Number, default: null }, // For integer type
    status: {
      type: String,
      enum: ["Answered", "Not Answered", "Marked for Review", "Answered & Marked for Review", "Not Visited"],
      default: "Not Visited",
    },
    timeSpentSeconds: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    collection: "student_answers",
  },
);

// Ensure a student only has one answer record per question in a specific test attempt
studentAnswerSchema.index({ accessId: 1, questionId: 1 }, { unique: true });

export type StudentAnswerDocument = InferSchemaType<typeof studentAnswerSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

const StudentAnswer: Model<StudentAnswerDocument> =
  mongoose.models.StudentAnswer ??
  mongoose.model<StudentAnswerDocument>("StudentAnswer", studentAnswerSchema);

export default StudentAnswer;
