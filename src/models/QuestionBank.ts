import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const questionBankSchema = new Schema(
  {
    subject: { type: String, required: true, trim: true, index: true },
    subpart: { type: String, required: true, trim: true, index: true },
    topic: { type: String, trim: true },
    difficulty: {
      type: String,
      enum: ["Easy", "Medium", "Hard"],
      default: "Medium",
    },
    questionType: {
      type: String,
      enum: ["Single Correct", "Multiple Correct", "Integer Type"],
      required: true,
    },
    questionText: { type: String, required: true },
    options: [
      {
        text: { type: String, required: true },
        isCorrect: { type: Boolean, required: true },
      },
    ],
    correctIntegerAnswer: { type: Number },
    explanation: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: "Teacher" },
  },
  {
    timestamps: true,
    collection: "question_bank",
  },
);

export type QuestionBankDocument = InferSchemaType<typeof questionBankSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

const QuestionBank: Model<QuestionBankDocument> =
  mongoose.models.QuestionBank ??
  mongoose.model<QuestionBankDocument>("QuestionBank", questionBankSchema);

export default QuestionBank;
