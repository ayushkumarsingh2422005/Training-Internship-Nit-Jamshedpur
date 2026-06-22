import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const teacherSchema = new Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phoneNumber: { type: String, required: true, trim: true },
    assignedModules: [
      {
        subject: { type: String, required: true, trim: true },
        subpart: { type: String, required: true, trim: true },
      },
    ],
  },
  {
    timestamps: true,
    collection: "teachers",
  },
);

teacherSchema.index({ email: 1 }, { unique: true });
teacherSchema.index({ phoneNumber: 1 }, { unique: true });

export type TeacherDocument = InferSchemaType<typeof teacherSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

const Teacher: Model<TeacherDocument> =
  mongoose.models.Teacher ?? mongoose.model<TeacherDocument>("Teacher", teacherSchema);

export default Teacher;
