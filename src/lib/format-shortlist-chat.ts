import type { Application } from "@/types/application";

export function hostelStatusLine(app: Application): string {
  if (app.wantsAccommodation === true) {
    const genderPart = app.gender ? ` · Gender: ${app.gender}` : "";
    return `Hostel accommodation: Yes (confirmed)${genderPart}`;
  }
  if (app.wantsAccommodation === false) {
    return "Hostel accommodation: No — own arrangements (confirmed)";
  }
  return "Hostel accommodation: Not confirmed yet";
}

export function formatShortlistSuccess(app: Application): string {
  return [
    `Congratulations, ${app.fullName}! You are on the shortlist.`,
    app.internId ? `Intern ID: ${app.internId}` : "",
    "",
    `College: ${app.collegeName}`,
    `Branch: ${app.subject}`,
    `Module: ${app.subpart}`,
    hostelStatusLine(app),
  ].join("\n");
}

export function formatShortlistFailure(): string {
  return [
    "You are not on the shortlist for this email and mobile number combination.",
    "",
    "Please verify the details from your original application, or contact your polytechnic if you believe this is an error.",
  ].join("\n");
}

export function formatAccommodationPrompt(): string {
  return [
    "NIT Jamshedpur offers optional hostel & mess for residential training (chargeable as per actual rates).",
    "",
    "Do you require hostel accommodation?",
  ].join("\n");
}

export function formatAccommodationSaved(wants: boolean, gender?: string | null): string {
  if (wants) {
    return gender
      ? `Your preference is saved: Yes, hostel required (Gender: ${gender}).`
      : "Your preference is saved: Yes, I need hostel accommodation at NIT Jamshedpur.";
  }
  return "Your preference is saved: No, I will arrange my own stay.";
}

export function formatGenderPrompt(): string {
  return "Please select your gender for hostel allocation:";
}
