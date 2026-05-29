export type AdminApplicationFilterParams = {
  q?: string;
  college?: string;
  subject?: string;
  subpart?: string;
  accommodation?: string;
  laptop?: string;
  gender?: string;
};

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function caseInsensitiveRegex(value: string) {
  return { $regex: escapeRegex(value), $options: "i" as const };
}

export function buildAdminApplicationFilter(
  params: AdminApplicationFilterParams,
): Record<string, unknown> {
  const q = params.q?.trim() ?? "";
  const college = params.college?.trim() ?? "";
  const subject = params.subject?.trim() ?? "";
  const subpart = params.subpart?.trim() ?? "";
  const accommodation = params.accommodation ?? "";
  const laptop = params.laptop ?? "";
  const gender = params.gender?.trim() ?? "";

  const filter: Record<string, unknown> = {};

  if (subject) filter.subject = subject;
  if (subpart) filter.subpart = subpart;
  if (gender) filter.gender = gender;

  if (accommodation === "yes") filter.wantsAccommodation = true;
  else if (accommodation === "no") filter.wantsAccommodation = false;
  else if (accommodation === "unset") filter.wantsAccommodation = null;

  if (laptop === "yes") filter.hasLaptop = true;
  else if (laptop === "no") filter.hasLaptop = false;
  else if (laptop === "unset") filter.hasLaptop = null;

  if (college) {
    filter.collegeName = caseInsensitiveRegex(college);
  }

  if (q) {
    const regex = caseInsensitiveRegex(q);
    filter.$or = [
      { fullName: regex },
      { fatherName: regex },
      { email: regex },
      { phoneNumber: regex },
      { schoolName: regex },
    ];
  }

  return filter;
}

export function parseAdminApplicationFilterParams(
  searchParams: URLSearchParams,
): AdminApplicationFilterParams {
  return {
    q: searchParams.get("q") ?? undefined,
    college: searchParams.get("college") ?? undefined,
    subject: searchParams.get("subject") ?? undefined,
    subpart: searchParams.get("subpart") ?? undefined,
    accommodation: searchParams.get("accommodation") ?? undefined,
    laptop: searchParams.get("laptop") ?? undefined,
    gender: searchParams.get("gender") ?? undefined,
  };
}
