import type { Application } from "@/types/application";

export function hostelStatusLine(app: Application): string {
  if (app.wantsAccommodation === true) {
    return "Hostel accommodation: Yes (confirmed)";
  }
  if (app.wantsAccommodation === false) {
    return "Hostel accommodation: No — own arrangements (confirmed)";
  }
  return "Hostel accommodation: Not confirmed yet";
}

export function formatShortlistSuccess(app: Application): string {
  return [
    `Congratulations, ${app.fullName}! You are on the shortlist.`,
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

export function formatAccommodationSaved(wants: boolean): string {
  return wants
    ? "Your preference is saved: Yes, I need hostel accommodation at NIT Jamshedpur."
    : "Your preference is saved: No, I will arrange my own stay.";
}
