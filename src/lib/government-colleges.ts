export const GOVERNMENT_POLYtechnic_COLLEGES = [
  "Government Polytechnic, Ranchi",
  "Government Polytechnic, Dhanbad",
  "Government Polytechnic, Nirsa, Dhanbad",
  "Government Polytechnic, Dumka",
  "Government Polytechnic, Adityapur",
  "Government Polytechnic, Jainamore, Khutri, Bokaro",
  "Government Polytechnic, Koderma",
  "Government Polytechnic, Bhaga, Dhanbad",
  "Government Polytechnic, Latehar",
  "Government Polytechnic, Kharsawan",
  "Government Womens Polytechnic, Tharpakhna, Ranchi",
  "Government Womens Polytechnic, Gamharia, Jamshedpur",
  "Government Womens Polytechnic, Balidih, Bokaro",
  "Government Polytechnic, Sahibganj",
  "Government Women's Polytechnic, Dumka",
  "Government Polytechnic, Simdega",
  "Govt. Polytechnic, Jagannathpur",
] as const;

export const COLLEGE_OTHER = "Other" as const;

export type GovernmentCollege =
  | (typeof GOVERNMENT_POLYtechnic_COLLEGES)[number]
  | typeof COLLEGE_OTHER;

export const COLLEGE_DROPDOWN_OPTIONS: readonly GovernmentCollege[] = [
  ...GOVERNMENT_POLYtechnic_COLLEGES,
  COLLEGE_OTHER,
];

export function isListedCollege(value: string): value is (typeof GOVERNMENT_POLYtechnic_COLLEGES)[number] {
  return (GOVERNMENT_POLYtechnic_COLLEGES as readonly string[]).includes(value);
}

export function isValidCollegeSelection(value: string | null | undefined): value is GovernmentCollege {
  return COLLEGE_DROPDOWN_OPTIONS.includes(value as GovernmentCollege);
}

/** Infer dropdown value from the stored collegeName. */
export function inferCollegeDropdown(collegeName: string): GovernmentCollege {
  if (isListedCollege(collegeName.trim())) {
    return collegeName.trim() as (typeof GOVERNMENT_POLYtechnic_COLLEGES)[number];
  }
  return COLLEGE_OTHER;
}

export function resolveCollegeName(selection: GovernmentCollege, customName: string): string {
  if (selection === COLLEGE_OTHER) {
    return customName.trim();
  }
  return selection;
}
