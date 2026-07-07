import connectDB from "@/lib/mongodb";
import StudentTestAccess from "@/models/StudentTestAccess";
import Test from "@/models/Test";

export async function terminateExamAccess(accessId: string, testOwnerId?: unknown) {
  await connectDB();

  const access = await StudentTestAccess.findById(accessId);
  if (!access) {
    return { ok: false as const, status: 404, error: "Attempt not found." };
  }

  if (access.status === "Submitted") {
    return { ok: false as const, status: 400, error: "This attempt has already been submitted." };
  }

  if (access.status === "Terminated") {
    return { ok: true as const, alreadyTerminated: true };
  }

  if (testOwnerId) {
    const test = await Test.findOne({ _id: access.testId, createdBy: testOwnerId }).lean();
    if (!test) {
      return { ok: false as const, status: 403, error: "You cannot terminate this attempt." };
    }
  }

  access.status = "Terminated";
  access.submittedAt = new Date();
  await access.save();

  return { ok: true as const, alreadyTerminated: false };
}
