"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { AdminApplication } from "@/lib/admin-application";
import type { NoticeCategory } from "@/lib/notices";
import { AdminAttendance } from "@/components/AdminAttendance";
import { useTopLoading } from "@/components/TopLoadingProvider";
import { downloadIdCardsPdf, type IdCardProgress } from "@/lib/id-card-pdf";
import { COLLEGE_DROPDOWN_OPTIONS, COLLEGE_OTHER } from "@/lib/government-colleges";

type AppliedFilters = {
  q: string;
  college: string;
  subject: string;
  subpart: string;
  accommodation: string;
  laptop: string;
  gender: string;
  verification: string;
};

type ApiResponse = {
  total: number;
  page: number;
  limit: number;
  items: AdminApplication[];
  filters: { subjects: string[]; subparts: string[] };
  stats: {
    hostelYes: number;
    hostelNo: number;
    hostelUnset: number;
    laptopYes: number;
    laptopNo: number;
    laptopUnset: number;
  };
};

type AdminNotice = {
  id: string;
  title: string;
  date: string;
  category: NoticeCategory;
  excerpt: string;
  body: string;
  pdfUrl: string | null;
  isNew: boolean;
  isPublished: boolean;
};

type NoticeForm = {
  id: string | null;
  title: string;
  date: string;
  category: string;
  excerpt: string;
  body: string;
  pdfUrl: string | null;
  isNew: boolean;
  isPublished: boolean;
};

type StudentForm = {
  id: string | null;
  fullName: string;
  fatherName: string;
  schoolName: string;
  address: string;
  phoneNumber: string;
  email: string;
  subject: string;
  subpart: string;
  wantsAccommodation: "unset" | "yes" | "no";
  gender: "" | "Male" | "Female" | "Other";
  aadharNumber: string;
  collegeRegistrationNumber: string;
  hasLaptop: "unset" | "yes" | "no";
};

const LIMIT = 50;
const NOTICE_CATEGORY_OPTIONS = [
  "General",
  "Schedule",
  "Admission",
  "Assessment",
  "Hostel",
  "Fees",
  "Documents",
  "Workshop",
  "Examination",
  "Placement",
] as const;
const DEFAULT_NOTICE_FORM: NoticeForm = {
  id: null,
  title: "",
  date: new Date().toISOString().slice(0, 10),
  category: "General",
  excerpt: "",
  body: "",
  pdfUrl: null,
  isNew: true,
  isPublished: true,
};
const DEFAULT_STUDENT_FORM: StudentForm = {
  id: null,
  fullName: "",
  fatherName: "",
  schoolName: "",
  address: "",
  phoneNumber: "",
  email: "",
  subject: "",
  subpart: "",
  wantsAccommodation: "unset",
  gender: "",
  aadharNumber: "",
  collegeRegistrationNumber: "",
  hasLaptop: "unset",
};

function hostelLabel(app: AdminApplication): string {
  if (app.wantsAccommodation === true) {
    return app.gender ? `Yes (${app.gender})` : "Yes";
  }
  if (app.wantsAccommodation === false) return "No";
  return "—";
}

function laptopLabel(app: AdminApplication): string {
  if (app.hasLaptop === true) return "Yes";
  if (app.hasLaptop === false) return "No";
  return "—";
}

function boolToSelect(value: boolean | null | undefined): "unset" | "yes" | "no" {
  if (value === true) return "yes";
  if (value === false) return "no";
  return "unset";
}

function selectToBool(value: "unset" | "yes" | "no"): boolean | null {
  if (value === "yes") return true;
  if (value === "no") return false;
  return null;
}

function studentFormFromApplication(app: AdminApplication): StudentForm {
  return {
    id: app.id,
    fullName: app.fullName,
    fatherName: app.fatherName,
    schoolName: app.schoolName,
    address: app.address,
    phoneNumber: app.phoneNumber,
    email: app.email,
    subject: app.subject,
    subpart: app.subpart,
    wantsAccommodation: boolToSelect(app.wantsAccommodation),
    gender: (app.gender as StudentForm["gender"]) || "",
    aadharNumber: app.aadharNumber || "",
    collegeRegistrationNumber: app.collegeRegistrationNumber || "",
    hasLaptop: boolToSelect(app.hasLaptop),
  };
}

export function AdminDashboard() {
  const router = useRouter();
  const [adminRole, setAdminRole] = useState<"admin" | "hostel_admin" | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [q, setQ] = useState("");
  const [college, setCollege] = useState("");
  const [subject, setSubject] = useState("");
  const [subpart, setSubpart] = useState("");
  const [accommodation, setAccommodation] = useState("");
  const [laptop, setLaptop] = useState("");
  const [gender, setGender] = useState("");
  const [verification, setVerification] = useState("");
  const [page, setPage] = useState(1);
  const [applied, setApplied] = useState<AppliedFilters>({
    q: "",
    college: "",
    subject: "",
    subpart: "",
    accommodation: "",
    laptop: "",
    gender: "",
    verification: "",
  });
  const [csvExporting, setCsvExporting] = useState(false);
  const [idCardsExporting, setIdCardsExporting] = useState(false);
  const [idCardsProgress, setIdCardsProgress] = useState<IdCardProgress | null>(null);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingApplicationId, setDeletingApplicationId] = useState<string | null>(null);
  const [verifyingApplicationId, setVerifyingApplicationId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [adminNotices, setAdminNotices] = useState<AdminNotice[]>([]);
  const [noticeLoading, setNoticeLoading] = useState(true);
  const [noticeError, setNoticeError] = useState<string | null>(null);
  const [noticeSaving, setNoticeSaving] = useState(false);
  const [noticePdfUploading, setNoticePdfUploading] = useState(false);
  const [noticeForm, setNoticeForm] = useState<NoticeForm>(DEFAULT_NOTICE_FORM);
  const [selectedCategoryOption, setSelectedCategoryOption] = useState<string>(DEFAULT_NOTICE_FORM.category);
  const [customCategory, setCustomCategory] = useState("");
  const [studentForm, setStudentForm] = useState<StudentForm>(DEFAULT_STUDENT_FORM);
  const [studentSaving, setStudentSaving] = useState(false);
  const [studentCollegeOption, setStudentCollegeOption] = useState<string>("");
  const [studentCollegeCustom, setStudentCollegeCustom] = useState("");
  const [bulkInput, setBulkInput] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [applicationMessage, setApplicationMessage] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<"applications" | "notices" | "hostellers" | "attendance">(
    "applications",
  );
  const [hostellers, setHostellers] = useState<AdminApplication[]>([]);
  const [hostellerLoading, setHostellerLoading] = useState(false);
  const [hostellerError, setHostellerError] = useState<string | null>(null);
  const [hostellerInternId, setHostellerInternId] = useState("");
  const [hostellerLookupLoading, setHostellerLookupLoading] = useState(false);
  const [hostellerEnrollLoading, setHostellerEnrollLoading] = useState(false);
  const [hostellerLookupResult, setHostellerLookupResult] = useState<AdminApplication | null>(null);
  const [hostellerScannerOpen, setHostellerScannerOpen] = useState(false);
  const [hostellerScannerError, setHostellerScannerError] = useState<string | null>(null);
  const hostellerVideoRef = useRef<HTMLVideoElement | null>(null);
  const hostellerStreamRef = useRef<MediaStream | null>(null);

  const adminOnlyLoading =
    loading ||
    noticeLoading ||
    noticeSaving ||
    studentSaving ||
    bulkSaving ||
    deletingApplicationId !== null ||
    verifyingApplicationId !== null ||
    csvExporting ||
    idCardsExporting;

  useTopLoading(
    sessionLoading ||
      hostellerLoading ||
      hostellerLookupLoading ||
      hostellerEnrollLoading ||
      (adminRole === "admin" && adminOnlyLoading),
  );

  useEffect(() => {
    let active = true;
    async function loadSession() {
      setSessionLoading(true);
      try {
        const response = await fetch("/api/admin/session");
        if (response.status === 401) {
          router.push("/admin/login");
          return;
        }
        const json = (await response.json()) as { role?: "admin" | "hostel_admin" };
        if (!response.ok || !json.role) {
          router.push("/admin/login");
          return;
        }
        if (!active) return;
        setAdminRole(json.role);
        if (json.role === "hostel_admin") {
          setActiveSection("hostellers");
        }
      } catch {
        if (active) router.push("/admin/login");
      } finally {
        if (active) setSessionLoading(false);
      }
    }
    void loadSession();
    return () => {
      active = false;
    };
  }, [router]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (applied.q) params.set("q", applied.q);
    if (applied.college) params.set("college", applied.college);
    if (applied.subject) params.set("subject", applied.subject);
    if (applied.subpart) params.set("subpart", applied.subpart);
    if (applied.accommodation) params.set("accommodation", applied.accommodation);
    if (applied.laptop) params.set("laptop", applied.laptop);
    if (applied.gender) params.set("gender", applied.gender);
    if (applied.verification) params.set("verification", applied.verification);
    params.set("page", String(page));
    params.set("limit", String(LIMIT));

    try {
      const response = await fetch(`/api/admin/applications?${params.toString()}`);
      if (response.status === 401) {
        router.push("/admin/login");
        return;
      }
      const json = (await response.json()) as ApiResponse & { error?: string };
      if (!response.ok) {
        setError(json.error ?? "Failed to load data.");
        return;
      }
      setData(json);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }, [applied, page, router]);

  const loadNotices = useCallback(async () => {
    setNoticeLoading(true);
    setNoticeError(null);
    try {
      const response = await fetch("/api/admin/notices");
      if (response.status === 401) {
        router.push("/admin/login");
        return;
      }
      const json = (await response.json()) as { items?: AdminNotice[]; error?: string };
      if (!response.ok) {
        setNoticeError(json.error ?? "Failed to load notices.");
        return;
      }
      setAdminNotices(json.items ?? []);
    } catch {
      setNoticeError("Network error while loading notices.");
    } finally {
      setNoticeLoading(false);
    }
  }, [router]);

  const loadHostellers = useCallback(async () => {
    setHostellerLoading(true);
    setHostellerError(null);
    try {
      const response = await fetch("/api/admin/hostellers");
      if (response.status === 401) {
        router.push("/admin/login");
        return;
      }
      const json = (await response.json()) as { items?: AdminApplication[]; error?: string };
      if (!response.ok) {
        setHostellerError(json.error ?? "Failed to load hostellers.");
        return;
      }
      setHostellers(json.items ?? []);
    } catch {
      setHostellerError("Network error while loading hostellers.");
    } finally {
      setHostellerLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (adminRole === "admin") {
      void load();
    }
  }, [adminRole, load]);

  useEffect(() => {
    if (adminRole === "admin") {
      void loadNotices();
    }
  }, [adminRole, loadNotices]);

  useEffect(() => {
    if (!adminRole) return;
    if (activeSection === "hostellers") {
      void loadHostellers();
    }
  }, [activeSection, adminRole, loadHostellers]);

  const stopHostellerScanner = useCallback(() => {
    if (hostellerStreamRef.current) {
      for (const track of hostellerStreamRef.current.getTracks()) {
        track.stop();
      }
    }
    hostellerStreamRef.current = null;
    if (hostellerVideoRef.current) {
      hostellerVideoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    if (!hostellerScannerOpen) {
      stopHostellerScanner();
      return;
    }

    let cancelled = false;
    let rafId = 0;

    async function startScanner() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (cancelled) {
          for (const track of stream.getTracks()) track.stop();
          return;
        }

        hostellerStreamRef.current = stream;
        const video = hostellerVideoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();

        const BarcodeDetectorCtor = (
          window as unknown as {
            BarcodeDetector?: new (config?: { formats?: string[] }) => {
              detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue?: string }>>;
            };
          }
        ).BarcodeDetector;

        if (!BarcodeDetectorCtor) {
          setHostellerScannerError("Barcode scan is not supported in this browser. Enter Intern ID manually.");
          return;
        }

        setHostellerScannerError(null);
        const detector = new BarcodeDetectorCtor({
          formats: ["code_128", "code_39", "ean_13", "ean_8", "qr_code"],
        });

        const tick = async () => {
          if (cancelled || !hostellerScannerOpen) return;
          try {
            if (video.readyState >= 2) {
              const found = await detector.detect(video);
              const rawValue = found[0]?.rawValue?.trim();
              if (rawValue) {
                setHostellerInternId(rawValue);
                setHostellerScannerOpen(false);
                stopHostellerScanner();
                return;
              }
            }
          } catch {
            // Ignore intermittent detector errors.
          }
          rafId = window.requestAnimationFrame(() => {
            void tick();
          });
        };

        rafId = window.requestAnimationFrame(() => {
          void tick();
        });
      } catch {
        setHostellerScannerError("Unable to access camera. Check permissions or use manual Intern ID entry.");
      }
    }

    void startScanner();

    return () => {
      cancelled = true;
      if (rafId) window.cancelAnimationFrame(rafId);
      stopHostellerScanner();
    };
  }, [hostellerScannerOpen, stopHostellerScanner]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (showStudentModal) setShowStudentModal(false);
      if (showBulkModal) setShowBulkModal(false);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showStudentModal, showBulkModal]);

  function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    setPage(1);
    setApplied({ q, college, subject, subpart, accommodation, laptop, gender, verification });
  }

  function clearFilters() {
    setQ("");
    setCollege("");
    setSubject("");
    setSubpart("");
    setAccommodation("");
    setLaptop("");
    setGender("");
    setVerification("");
    setPage(1);
    setApplied({
      q: "",
      college: "",
      subject: "",
      subpart: "",
      accommodation: "",
      laptop: "",
      gender: "",
      verification: "",
    });
  }

  async function downloadCsv() {
    setCsvExporting(true);
    setError(null);

    const params = new URLSearchParams();
    if (applied.q) params.set("q", applied.q);
    if (applied.college) params.set("college", applied.college);
    if (applied.subject) params.set("subject", applied.subject);
    if (applied.subpart) params.set("subpart", applied.subpart);
    if (applied.accommodation) params.set("accommodation", applied.accommodation);
    if (applied.laptop) params.set("laptop", applied.laptop);
    if (applied.gender) params.set("gender", applied.gender);
    if (applied.verification) params.set("verification", applied.verification);
    params.set("export", "csv");

    try {
      const response = await fetch(`/api/admin/applications?${params.toString()}`);
      if (response.status === 401) {
        router.push("/admin/login");
        return;
      }
      if (!response.ok) {
        let message = "Failed to export CSV.";
        try {
          const json = (await response.json()) as { error?: string };
          message = json.error ?? message;
        } catch {
          // non-JSON error body
        }
        setError(message);
        return;
      }

      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition");
      const match = disposition?.match(/filename="([^"]+)"/);
      const filename = match?.[1] ?? `students-${new Date().toISOString().slice(0, 10)}.csv`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Network error while exporting CSV.");
    } finally {
      setCsvExporting(false);
    }
  }

  async function downloadIdCards() {
    setIdCardsExporting(true);
    setIdCardsProgress(null);
    setError(null);

    const params = new URLSearchParams();
    if (applied.q) params.set("q", applied.q);
    if (applied.college) params.set("college", applied.college);
    if (applied.subject) params.set("subject", applied.subject);
    if (applied.subpart) params.set("subpart", applied.subpart);
    if (applied.accommodation) params.set("accommodation", applied.accommodation);
    if (applied.laptop) params.set("laptop", applied.laptop);
    if (applied.gender) params.set("gender", applied.gender);
    if (applied.verification) params.set("verification", applied.verification);
    params.set("export", "idcards");

    try {
      const response = await fetch(`/api/admin/applications?${params.toString()}`);
      if (response.status === 401) {
        router.push("/admin/login");
        return;
      }
      if (!response.ok) {
        let message = "Failed to prepare ID cards.";
        try {
          const json = (await response.json()) as { error?: string };
          message = json.error ?? message;
        } catch {
          // non-JSON error body
        }
        setError(message);
        return;
      }

      const json = (await response.json()) as { items?: AdminApplication[] };
      if (!json.items?.length) {
        setError("No students match the current filters.");
        return;
      }

      await downloadIdCardsPdf(json.items, (progress) => setIdCardsProgress(progress));
    } catch {
      setError("Could not generate ID card PDF. Please try again.");
    } finally {
      setIdCardsExporting(false);
      setIdCardsProgress(null);
    }
  }

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  async function deleteApplication(app: AdminApplication) {
    const confirmed = window.confirm(`Delete student record for ${app.fullName}? This cannot be undone.`);
    if (!confirmed) return;

    setDeletingApplicationId(app.id);
    setError(null);
    try {
      const response = await fetch(`/api/admin/applications?id=${encodeURIComponent(app.id)}`, { method: "DELETE" });
      const json = (await response.json()) as { error?: string };
      if (response.status === 401) {
        router.push("/admin/login");
        return;
      }
      if (!response.ok) {
        setError(json.error ?? "Failed to delete application.");
        return;
      }
      if (expandedId === app.id) {
        setExpandedId(null);
      }
      await load();
    } catch {
      setError("Network error while deleting application.");
    } finally {
      setDeletingApplicationId(null);
    }
  }

  async function toggleApplicationVerification(app: AdminApplication) {
    setVerifyingApplicationId(app.id);
    setError(null);
    try {
      const response = await fetch("/api/admin/applications/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: app.id, verified: !app.isVerifiedByAdmin }),
      });
      const json = (await response.json()) as { error?: string };
      if (response.status === 401) {
        router.push("/admin/login");
        return;
      }
      if (!response.ok) {
        setError(json.error ?? "Failed to update verification status.");
        return;
      }
      await load();
    } catch {
      setError("Network error while updating verification.");
    } finally {
      setVerifyingApplicationId(null);
    }
  }

  function resetStudentForm() {
    setStudentForm(DEFAULT_STUDENT_FORM);
    setStudentCollegeOption(COLLEGE_DROPDOWN_OPTIONS[0]);
    setStudentCollegeCustom("");
  }

  async function saveStudentApplication(event: React.FormEvent) {
    event.preventDefault();
    setStudentSaving(true);
    setError(null);
    setApplicationMessage(null);
    try {
      const selectedCollege = studentCollegeOption.trim();
      const collegeName =
        selectedCollege === COLLEGE_OTHER ? studentCollegeCustom.trim() : selectedCollege;
      if (!collegeName) {
        setError("Please select a college from dropdown.");
        return;
      }

      const payload = {
        fullName: studentForm.fullName,
        fatherName: studentForm.fatherName,
        schoolName: studentForm.schoolName,
        collegeName,
        address: studentForm.address,
        phoneNumber: studentForm.phoneNumber,
        email: studentForm.email,
        subject: studentForm.subject,
        subpart: studentForm.subpart,
        wantsAccommodation: selectToBool(studentForm.wantsAccommodation),
        gender: studentForm.gender || null,
        aadharNumber: studentForm.aadharNumber || null,
        collegeRegistrationNumber: studentForm.collegeRegistrationNumber || null,
        hasLaptop: selectToBool(studentForm.hasLaptop),
      };
      const response = await fetch("/api/admin/applications", {
        method: studentForm.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          studentForm.id
            ? { id: studentForm.id, application: payload }
            : { application: payload },
        ),
      });
      const json = (await response.json()) as { error?: string };
      if (response.status === 401) {
        router.push("/admin/login");
        return;
      }
      if (!response.ok) {
        setError(json.error ?? "Failed to save application.");
        return;
      }
      setApplicationMessage(studentForm.id ? "Application updated successfully." : "Student added successfully.");
      resetStudentForm();
      setShowStudentModal(false);
      await load();
    } catch {
      setError("Network error while saving application.");
    } finally {
      setStudentSaving(false);
    }
  }

  function parseBulkInput(text: string): Array<Record<string, string>> {
    const trimmed = text.trim();
    if (!trimmed) return [];

    if (trimmed.startsWith("[")) {
      const parsed = JSON.parse(trimmed) as unknown;
      if (!Array.isArray(parsed)) {
        throw new Error("JSON bulk input must be an array.");
      }
      return parsed.map((row) => (typeof row === "object" && row ? (row as Record<string, string>) : {}));
    }

    const rows = trimmed
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (rows.length < 2) {
      throw new Error("CSV bulk input must include a header and at least one row.");
    }

    const splitLine = (line: string): string[] => {
      const out: string[] = [];
      let current = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i += 1) {
        const char = line[i];
        if (char === "\"") {
          if (inQuotes && line[i + 1] === "\"") {
            current += "\"";
            i += 1;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === "," && !inQuotes) {
          out.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      out.push(current.trim());
      return out;
    };

    const headers = splitLine(rows[0]).map((value) => value.toLowerCase());
    return rows.slice(1).map((line) => {
      const cols = splitLine(line);
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = cols[index] ?? "";
      });
      return row;
    });
  }

  async function saveBulkApplications(event: React.FormEvent) {
    event.preventDefault();
    setBulkSaving(true);
    setError(null);
    setApplicationMessage(null);
    try {
      const rows = parseBulkInput(bulkInput);
      if (!rows.length) {
        setError("Bulk input is empty.");
        return;
      }
      const applications = rows.map((row) => ({
        fullName: row.fullname ?? row.full_name ?? "",
        fatherName: row.fathername ?? row.father_name ?? "",
        schoolName: row.schoolname ?? row.school_name ?? "",
        collegeName: row.collegename ?? row.college_name ?? "",
        address: row.address ?? "",
        phoneNumber: row.phonenumber ?? row.phone ?? row.mobile ?? "",
        email: row.email ?? "",
        subject: row.subject ?? row.branch ?? "",
        subpart: row.subpart ?? row.module ?? "",
        wantsAccommodation: row.wantsaccommodation ?? row.hostel ?? "",
        gender: row.gender ?? "",
        aadharNumber: row.aadharnumber ?? row.aadhar ?? "",
        collegeRegistrationNumber: row.collegeregistrationnumber ?? row.registrationnumber ?? "",
        hasLaptop: row.haslaptop ?? row.laptop ?? "",
      }));

      const response = await fetch("/api/admin/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applications }),
      });
      const json = (await response.json()) as { error?: string; created?: number };
      if (response.status === 401) {
        router.push("/admin/login");
        return;
      }
      if (!response.ok) {
        setError(json.error ?? "Failed to bulk add applications.");
        return;
      }
      setBulkInput("");
      setApplicationMessage(`Bulk add complete: ${json.created ?? applications.length} students added.`);
      setShowBulkModal(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse bulk input.");
    } finally {
      setBulkSaving(false);
    }
  }

  async function handleNoticePdfUpload(file: File) {
    setNoticePdfUploading(true);
    setNoticeError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/admin/notices/upload", {
        method: "POST",
        body: formData,
      });
      const json = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !json.url) {
        setNoticeError(json.error ?? "Failed to upload PDF.");
        return;
      }
      setNoticeForm((prev) => ({ ...prev, pdfUrl: json.url ?? null }));
    } catch {
      setNoticeError("Network error while uploading PDF.");
    } finally {
      setNoticePdfUploading(false);
    }
  }

  async function saveNotice(event: React.FormEvent) {
    event.preventDefault();
    setNoticeSaving(true);
    setNoticeError(null);
    try {
      const payload = {
        id: noticeForm.id,
        title: noticeForm.title,
        date: noticeForm.date,
        category:
          selectedCategoryOption === "__custom__" ? customCategory.trim() : selectedCategoryOption.trim(),
        excerpt: noticeForm.excerpt,
        body: noticeForm.body,
        pdfUrl: noticeForm.pdfUrl,
        isNew: noticeForm.isNew,
        isPublished: noticeForm.isPublished,
      };
      const response = await fetch("/api/admin/notices", {
        method: noticeForm.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) {
        setNoticeError(json.error ?? "Failed to save notice.");
        return;
      }
      setNoticeForm(DEFAULT_NOTICE_FORM);
      setSelectedCategoryOption(DEFAULT_NOTICE_FORM.category);
      setCustomCategory("");
      await loadNotices();
    } catch {
      setNoticeError("Network error while saving notice.");
    } finally {
      setNoticeSaving(false);
    }
  }

  function editNotice(notice: AdminNotice) {
    setNoticeForm({
      id: notice.id,
      title: notice.title,
      date: notice.date,
      category: notice.category,
      excerpt: notice.excerpt,
      body: notice.body,
      pdfUrl: notice.pdfUrl,
      isNew: notice.isNew,
      isPublished: notice.isPublished,
    });
    if ((NOTICE_CATEGORY_OPTIONS as readonly string[]).includes(notice.category)) {
      setSelectedCategoryOption(notice.category);
      setCustomCategory("");
    } else {
      setSelectedCategoryOption("__custom__");
      setCustomCategory(notice.category);
    }
    setActiveSection("notices");
  }

  async function deleteNotice(id: string) {
    if (!window.confirm("Delete this notice?")) return;
    setNoticeError(null);
    try {
      const response = await fetch(`/api/admin/notices?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) {
        setNoticeError(json.error ?? "Failed to delete notice.");
        return;
      }
      if (noticeForm.id === id) {
        setNoticeForm(DEFAULT_NOTICE_FORM);
        setSelectedCategoryOption(DEFAULT_NOTICE_FORM.category);
        setCustomCategory("");
      }
      await loadNotices();
    } catch {
      setNoticeError("Network error while deleting notice.");
    }
  }

  async function lookupHosteller() {
    const internId = hostellerInternId.trim();
    if (!internId) {
      setHostellerError("Enter or scan an Intern ID.");
      return;
    }

    setHostellerLookupLoading(true);
    setHostellerError(null);
    try {
      const response = await fetch(`/api/admin/hostellers/lookup?internId=${encodeURIComponent(internId)}`);
      if (response.status === 401) {
        router.push("/admin/login");
        return;
      }
      const json = (await response.json()) as { item?: AdminApplication; error?: string };
      if (!response.ok || !json.item) {
        setHostellerLookupResult(null);
        setHostellerError(json.error ?? "Student not found.");
        return;
      }
      setHostellerLookupResult(json.item);
    } catch {
      setHostellerError("Network error while looking up Intern ID.");
    } finally {
      setHostellerLookupLoading(false);
    }
  }

  async function enrollHosteller(enroll: boolean) {
    const sourceInternId = hostellerLookupResult?.internId ?? hostellerInternId.trim();
    if (!sourceInternId) {
      setHostellerError("Intern ID is required.");
      return;
    }

    setHostellerEnrollLoading(true);
    setHostellerError(null);
    try {
      const response = await fetch("/api/admin/hostellers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ internId: sourceInternId, enroll }),
      });
      if (response.status === 401) {
        router.push("/admin/login");
        return;
      }
      const json = (await response.json()) as { item?: AdminApplication; error?: string };
      if (!response.ok || !json.item) {
        setHostellerError(json.error ?? "Failed to update hosteller enrollment.");
        return;
      }
      setHostellerLookupResult(json.item);
      await loadHostellers();
    } catch {
      setHostellerError("Network error while updating hosteller enrollment.");
    } finally {
      setHostellerEnrollLoading(false);
    }
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;
  const subjectOptions = Array.from(new Set([...(data?.filters.subjects ?? []), studentForm.subject].filter(Boolean)));
  const subpartOptions = Array.from(new Set([...(data?.filters.subparts ?? []), studentForm.subpart].filter(Boolean)));

  if (sessionLoading || !adminRole) {
    return <p className="admin-loading">Loading dashboard…</p>;
  }

  return (
    <div className="admin-dashboard">
      <header className="admin-topbar">
        <div>
          <h1>{adminRole === "admin" ? "Applications dashboard" : "Hostellers dashboard"}</h1>
          <p>
            {adminRole === "admin"
              ? "All shortlisted students — search, filter, and review records."
              : "Hostel admin access — search student by Intern ID and manage hosteller verification."}
          </p>
        </div>
        <div className="admin-topbar-actions">
          <a href="/" className="btn btn-secondary btn-sm">
            Public site
          </a>
          <button
            type="button"
            className="btn btn-outline-admin btn-sm"
            onClick={() => void (adminRole === "admin" ? load() : loadHostellers())}
          >
            Refresh
          </button>
          <button type="button" className="btn btn-green btn-sm" onClick={() => void handleLogout()}>
            Log out
          </button>
        </div>
      </header>

      <div className="admin-section-switcher">
        {adminRole === "admin" ? (
          <>
            <button
              type="button"
              className={`btn btn-sm ${activeSection === "applications" ? "btn-green" : "btn-secondary"}`}
              onClick={() => setActiveSection("applications")}
            >
              Applications
            </button>
            <button
              type="button"
              className={`btn btn-sm ${activeSection === "notices" ? "btn-green" : "btn-secondary"}`}
              onClick={() => setActiveSection("notices")}
            >
              Notices
            </button>
          </>
        ) : null}
        <button
          type="button"
          className={`btn btn-sm ${activeSection === "hostellers" ? "btn-green" : "btn-secondary"}`}
          onClick={() => setActiveSection("hostellers")}
        >
          Hostellers
        </button>
        {adminRole === "admin" ? (
          <button
            type="button"
            className={`btn btn-sm ${activeSection === "attendance" ? "btn-green" : "btn-secondary"}`}
            onClick={() => setActiveSection("attendance")}
          >
            Attendance
          </button>
        ) : null}
      </div>

      {adminRole === "admin" && activeSection === "applications" && data ? (
        <div className="admin-stats">
          <div className="admin-stat-card">
            <span className="admin-stat-value">{data.total}</span>
            <span className="admin-stat-label">Matching records</span>
          </div>
          <div className="admin-stat-card">
            <span className="admin-stat-value">{data.stats.hostelYes}</span>
            <span className="admin-stat-label">Hostel: Yes</span>
          </div>
          <div className="admin-stat-card">
            <span className="admin-stat-value">{data.stats.hostelNo}</span>
            <span className="admin-stat-label">Hostel: No</span>
          </div>
          <div className="admin-stat-card">
            <span className="admin-stat-value">{data.stats.hostelUnset}</span>
            <span className="admin-stat-label">Hostel: Not set</span>
          </div>
          <div className="admin-stat-card">
            <span className="admin-stat-value">{data.stats.laptopYes}</span>
            <span className="admin-stat-label">Laptop: Yes</span>
          </div>
          <div className="admin-stat-card">
            <span className="admin-stat-value">{data.stats.laptopNo}</span>
            <span className="admin-stat-label">Laptop: No</span>
          </div>
          <div className="admin-stat-card">
            <span className="admin-stat-value">{data.stats.laptopUnset}</span>
            <span className="admin-stat-label">Laptop: Not set</span>
          </div>
        </div>
      ) : null}

      {adminRole === "admin" && activeSection === "applications" ? (
        <div className="admin-application-toolbar">
          <button
            type="button"
            className="btn btn-green btn-sm"
            onClick={() => {
              resetStudentForm();
              setStudentCollegeOption(COLLEGE_DROPDOWN_OPTIONS[0]);
              setApplicationMessage(null);
              setShowStudentModal(true);
            }}
          >
            Add student
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setApplicationMessage(null);
              setShowBulkModal(true);
            }}
          >
            Bulk add
          </button>
        </div>
      ) : null}

      {adminRole === "admin" && activeSection === "applications" && applicationMessage ? (
        <p className="admin-success" role="status">
          {applicationMessage}
        </p>
      ) : null}

      {adminRole === "admin" && activeSection === "applications" && showStudentModal ? (
        <div className="admin-modal-backdrop" onClick={() => setShowStudentModal(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2 className="admin-subhead">
                {studentForm.id ? "Edit application" : "Add student to database"}
              </h2>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowStudentModal(false)}
                disabled={studentSaving}
              >
                Close
              </button>
            </div>
            <form className="admin-modal-body" onSubmit={saveStudentApplication}>
              <div className="admin-form-grid-two">
                <div className="form-field">
                  <label htmlFor="student-fullName">Full name</label>
                  <input
                    id="student-fullName"
                    value={studentForm.fullName}
                    onChange={(e) => setStudentForm((prev) => ({ ...prev, fullName: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="student-fatherName">Father / guardian</label>
                  <input
                    id="student-fatherName"
                    value={studentForm.fatherName}
                    onChange={(e) => setStudentForm((prev) => ({ ...prev, fatherName: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="student-schoolName">School</label>
                  <input
                    id="student-schoolName"
                    value={studentForm.schoolName}
                    onChange={(e) => setStudentForm((prev) => ({ ...prev, schoolName: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="student-collegeName">College</label>
                  <select
                    id="student-collegeName"
                    value={studentCollegeOption}
                    onChange={(e) => setStudentCollegeOption(e.target.value)}
                    required
                  >
                    <option value="">Select college</option>
                    {COLLEGE_DROPDOWN_OPTIONS.map((college) => (
                      <option key={college} value={college}>
                        {college}
                      </option>
                    ))}
                  </select>
                </div>
                {studentCollegeOption === COLLEGE_OTHER ? (
                  <div className="form-field">
                    <label htmlFor="student-other-college">Other college name</label>
                    <input
                      id="student-other-college"
                      value={studentCollegeCustom}
                      onChange={(e) => setStudentCollegeCustom(e.target.value)}
                      required
                    />
                  </div>
                ) : null}
                <div className="form-field">
                  <label htmlFor="student-subject">Branch</label>
                  <select
                    id="student-subject"
                    value={studentForm.subject}
                    onChange={(e) => setStudentForm((prev) => ({ ...prev, subject: e.target.value }))}
                    required
                  >
                    <option value="">Select branch</option>
                    {subjectOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-field">
                  <label htmlFor="student-subpart">Module</label>
                  <select
                    id="student-subpart"
                    value={studentForm.subpart}
                    onChange={(e) => setStudentForm((prev) => ({ ...prev, subpart: e.target.value }))}
                    required
                  >
                    <option value="">Select module</option>
                    {subpartOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-field">
                  <label htmlFor="student-email">Email</label>
                  <input
                    id="student-email"
                    type="email"
                    value={studentForm.email}
                    onChange={(e) => setStudentForm((prev) => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="student-phone">Phone number</label>
                  <input
                    id="student-phone"
                    value={studentForm.phoneNumber}
                    onChange={(e) => setStudentForm((prev) => ({ ...prev, phoneNumber: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="student-hostel">Hostel</label>
                  <select
                    id="student-hostel"
                    value={studentForm.wantsAccommodation}
                    onChange={(e) =>
                      setStudentForm((prev) => ({
                        ...prev,
                        wantsAccommodation: e.target.value as StudentForm["wantsAccommodation"],
                      }))
                    }
                  >
                    <option value="unset">Not set</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>
                <div className="form-field">
                  <label htmlFor="student-gender">Gender</label>
                  <select
                    id="student-gender"
                    value={studentForm.gender}
                    onChange={(e) =>
                      setStudentForm((prev) => ({ ...prev, gender: e.target.value as StudentForm["gender"] }))
                    }
                  >
                    <option value="">Not set</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="form-field">
                  <label htmlFor="student-laptop">Laptop</label>
                  <select
                    id="student-laptop"
                    value={studentForm.hasLaptop}
                    onChange={(e) =>
                      setStudentForm((prev) => ({
                        ...prev,
                        hasLaptop: e.target.value as StudentForm["hasLaptop"],
                      }))
                    }
                  >
                    <option value="unset">Not set</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>
                <div className="form-field">
                  <label htmlFor="student-aadhar">Aadhaar (optional)</label>
                  <input
                    id="student-aadhar"
                    value={studentForm.aadharNumber}
                    onChange={(e) => setStudentForm((prev) => ({ ...prev, aadharNumber: e.target.value }))}
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="student-registration">College registration no. (optional)</label>
                  <input
                    id="student-registration"
                    value={studentForm.collegeRegistrationNumber}
                    onChange={(e) =>
                      setStudentForm((prev) => ({ ...prev, collegeRegistrationNumber: e.target.value }))
                    }
                  />
                </div>
                <div className="form-field admin-field-full">
                  <label htmlFor="student-address">Address</label>
                  <textarea
                    id="student-address"
                    rows={2}
                    value={studentForm.address}
                    onChange={(e) => setStudentForm((prev) => ({ ...prev, address: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div className="admin-filters-actions">
                <button type="submit" className="btn btn-green btn-sm" disabled={studentSaving || bulkSaving}>
                  {studentSaving ? "Saving..." : studentForm.id ? "Update application" : "Add student"}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={resetStudentForm}
                  disabled={studentSaving || bulkSaving}
                >
                  Reset form
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {adminRole === "admin" && activeSection === "applications" && showBulkModal ? (
        <div className="admin-modal-backdrop" onClick={() => setShowBulkModal(false)}>
          <div className="admin-modal admin-modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2 className="admin-subhead">Bulk add students</h2>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowBulkModal(false)}
                disabled={bulkSaving}
              >
                Close
              </button>
            </div>
            <form className="admin-modal-body" onSubmit={saveBulkApplications}>
              <p className="admin-muted">
                Paste CSV (header + rows) or JSON array. Intern IDs are auto-generated.
              </p>
              <div className="form-field">
                <label htmlFor="admin-bulk-input">Bulk input</label>
                <textarea
                  id="admin-bulk-input"
                  rows={10}
                  value={bulkInput}
                  placeholder="CSV header example: fullName,fatherName,schoolName,collegeName,address,phoneNumber,email,subject,subpart"
                  onChange={(e) => setBulkInput(e.target.value)}
                />
              </div>
              <div className="admin-filters-actions">
                <button type="submit" className="btn btn-green btn-sm" disabled={studentSaving || bulkSaving}>
                  {bulkSaving ? "Adding..." : "Bulk add"}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setBulkInput("")}
                  disabled={studentSaving || bulkSaving}
                >
                  Clear bulk input
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {adminRole === "admin" && activeSection === "applications" ? <form className="admin-filters" onSubmit={handleSearch}>
        <div className="admin-filters-row">
          <div className="form-field admin-filter-search">
            <label htmlFor="admin-q">Search</label>
            <input
              id="admin-q"
              type="search"
              placeholder="Name, email, phone, Intern ID, school…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div className="form-field admin-filter-search">
            <label htmlFor="admin-college">College</label>
            <input
              id="admin-college"
              type="search"
              placeholder="College name only"
              value={college}
              onChange={(e) => setCollege(e.target.value)}
            />
          </div>
          <div className="form-field">
            <label htmlFor="admin-subject">Branch</label>
            <select id="admin-subject" value={subject} onChange={(e) => setSubject(e.target.value)}>
              <option value="">All</option>
              {data?.filters.subjects.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="admin-subpart">Module</label>
            <select id="admin-subpart" value={subpart} onChange={(e) => setSubpart(e.target.value)}>
              <option value="">All</option>
              {data?.filters.subparts.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="admin-acc">Hostel</label>
            <select
              id="admin-acc"
              value={accommodation}
              onChange={(e) => setAccommodation(e.target.value)}
            >
              <option value="">All</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
              <option value="unset">Not set</option>
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="admin-gender">Gender</label>
            <select id="admin-gender" value={gender} onChange={(e) => setGender(e.target.value)}>
              <option value="">All</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="admin-laptop">Laptop</label>
            <select id="admin-laptop" value={laptop} onChange={(e) => setLaptop(e.target.value)}>
              <option value="">All</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
              <option value="unset">Not set</option>
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="admin-verification">Verification</label>
            <select
              id="admin-verification"
              value={verification}
              onChange={(e) => setVerification(e.target.value)}
            >
              <option value="">All</option>
              <option value="verified">Verified</option>
              <option value="not-verified">Not Verified</option>
            </select>
          </div>
        </div>
        <div className="admin-filters-actions">
          <button type="submit" className="btn btn-green btn-sm">
            Apply filters
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={clearFilters}>
            Clear
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={csvExporting || idCardsExporting || loading || !data?.total}
            onClick={() => void downloadCsv()}
          >
            {csvExporting ? "Preparing CSV…" : `Download CSV (${data?.total ?? 0})`}
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={csvExporting || idCardsExporting || loading || !data?.total}
            onClick={() => void downloadIdCards()}
          >
            {idCardsExporting
              ? idCardsProgress
                ? `Generating ID cards… ${idCardsProgress.completed}/${idCardsProgress.total}`
                : "Preparing ID cards…"
              : `Download ID cards (${data?.total ?? 0})`}
          </button>
        </div>
        {idCardsExporting && idCardsProgress ? (
          <div className="admin-idcard-progress" role="status" aria-live="polite">
            <div className="admin-idcard-progress-bar">
              <div
                className="admin-idcard-progress-fill"
                style={{
                  width: `${
                    idCardsProgress.total
                      ? Math.round((idCardsProgress.completed / idCardsProgress.total) * 100)
                      : 0
                  }%`,
                }}
              />
            </div>
            <span className="admin-idcard-progress-text">
              {idCardsProgress.completed} of {idCardsProgress.total} ID cards rendered
            </span>
          </div>
        ) : null}
      </form> : null}

      {adminRole === "admin" && activeSection === "applications" && error ? (
        <p className="admin-error" role="alert">
          {error}
        </p>
      ) : null}

      {adminRole === "admin" && activeSection === "applications" && loading ? <p className="admin-loading">Loading…</p> : null}

      {adminRole === "admin" && activeSection === "applications" && !loading && data && data.items.length === 0 ? (
        <p className="admin-empty">No applications match your filters.</p>
      ) : null}

      {adminRole === "admin" && activeSection === "applications" && !loading && data && data.items.length > 0 ? (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Intern ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Mobile</th>
                  <th>College</th>
                  <th>Branch</th>
                  <th>Module</th>
                  <th>Hostel</th>
                  <th>Laptop</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.items.map((app) => (
                  <Fragment key={app.id}>
                    <tr
                      className={
                        app.isVerifiedByAdmin
                          ? "admin-application-row-verified"
                          : "admin-application-row-not-verified"
                      }
                    >
                      <td>{app.internId || "—"}</td>
                      <td>{app.fullName}</td>
                      <td>
                        <a href={`mailto:${app.email}`}>{app.email}</a>
                      </td>
                      <td>{app.phoneNumber}</td>
                      <td>{app.collegeName}</td>
                      <td>{app.subject}</td>
                      <td>{app.subpart}</td>
                      <td>{hostelLabel(app)}</td>
                      <td>{laptopLabel(app)}</td>
                      <td>
                        <div className="admin-row-actions">
                          <button
                            type="button"
                            className={`admin-icon-btn ${app.isVerifiedByAdmin ? "admin-icon-btn-verified" : "admin-icon-btn-not-verified"}`}
                            onClick={() => void toggleApplicationVerification(app)}
                            disabled={
                              deletingApplicationId === app.id || verifyingApplicationId === app.id
                            }
                            title={app.isVerifiedByAdmin ? "Mark as not verified" : "Mark as verified"}
                            aria-label={app.isVerifiedByAdmin ? "Mark as not verified" : "Mark as verified"}
                          >
                            {verifyingApplicationId === app.id
                              ? "⏳"
                              : app.isVerifiedByAdmin
                                ? "✓"
                                : "○"}
                          </button>
                          <button
                            type="button"
                            className="admin-icon-btn admin-icon-btn-neutral"
                            onClick={() => {
                              setStudentForm(studentFormFromApplication(app));
                              if ((COLLEGE_DROPDOWN_OPTIONS as readonly string[]).includes(app.collegeName)) {
                                setStudentCollegeOption(app.collegeName);
                                setStudentCollegeCustom("");
                              } else {
                                setStudentCollegeOption(COLLEGE_OTHER);
                                setStudentCollegeCustom(app.collegeName);
                              }
                              setApplicationMessage(null);
                              setShowStudentModal(true);
                            }}
                            title="Edit student"
                            aria-label="Edit student"
                          >
                            ✎
                          </button>
                          <button
                            type="button"
                            className="admin-icon-btn admin-icon-btn-neutral"
                            onClick={() => setExpandedId(expandedId === app.id ? null : app.id)}
                            title={expandedId === app.id ? "Hide details" : "Show details"}
                            aria-label={expandedId === app.id ? "Hide details" : "Show details"}
                          >
                            {expandedId === app.id ? "▾" : "▸"}
                          </button>
                          <button
                            type="button"
                            className="admin-icon-btn admin-icon-btn-danger"
                            onClick={() => void deleteApplication(app)}
                            disabled={deletingApplicationId === app.id || verifyingApplicationId === app.id}
                            title={deletingApplicationId === app.id ? "Deleting..." : "Delete student"}
                            aria-label={deletingApplicationId === app.id ? "Deleting student" : "Delete student"}
                          >
                            {deletingApplicationId === app.id ? "…" : "🗑"}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedId === app.id ? (
                      <tr className="admin-detail-row admin-detail-row-compact">
                        <td colSpan={10}>
                          <dl className="admin-detail-grid">
                            <div>
                              <dt>Father / guardian</dt>
                              <dd>{app.fatherName}</dd>
                            </div>
                            <div>
                              <dt>College registration no.</dt>
                              <dd>{app.collegeRegistrationNumber || "—"}</dd>
                            </div>
                            <div>
                              <dt>Aadhaar</dt>
                              <dd>{app.aadharNumber || "—"}</dd>
                            </div>
                            <div>
                              <dt>Gender</dt>
                              <dd>{app.gender || "—"}</dd>
                            </div>
                            <div>
                              <dt>School</dt>
                              <dd>{app.schoolName}</dd>
                            </div>
                            <div>
                              <dt>Admin verification</dt>
                              <dd>{app.isVerifiedByAdmin ? "Verified" : "Not verified"}</dd>
                            </div>
                            {app.verifiedByAdminAt ? (
                              <div>
                                <dt>Verified at</dt>
                                <dd>{new Date(app.verifiedByAdminAt).toLocaleString("en-IN")}</dd>
                              </div>
                            ) : null}
                            <div className="admin-detail-full">
                              <dt>Address</dt>
                              <dd>{app.address}</dd>
                            </div>
                            {app.accommodationEnrolledAt ? (
                              <div>
                                <dt>Hostel saved at</dt>
                                <dd>{new Date(app.accommodationEnrolledAt).toLocaleString("en-IN")}</dd>
                              </div>
                            ) : null}
                            <div>
                              <dt>Hosteller allotted</dt>
                              <dd>{app.hostellerVerificationFromAdmin ? "Yes" : "No"}</dd>
                            </div>
                            {app.hostellerVerificationFromAdmin ? (
                              <>
                                <div>
                                  <dt>Hosteller allotted by</dt>
                                  <dd>{app.hostellerVerifiedByAdminEmail || "—"}</dd>
                                </div>
                                <div>
                                  <dt>Hosteller allotted at</dt>
                                  <dd>
                                    {app.hostellerVerificationAt
                                      ? new Date(app.hostellerVerificationAt).toLocaleString("en-IN")
                                      : "—"}
                                  </dd>
                                </div>
                              </>
                            ) : null}
                          </dl>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>

          <div className="admin-pagination">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </button>
            <span>
              Page {page} of {totalPages} ({data.total} total)
            </span>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </>
      ) : null}

      {adminRole === "admin" && activeSection === "notices" ? (
        <section className="admin-notices-layout">
          <form className="admin-filters admin-notice-form" onSubmit={saveNotice}>
            <h2>{noticeForm.id ? "Edit notice" : "Create notice"}</h2>
            <div className="form-field">
              <label htmlFor="notice-title">Title</label>
              <input
                id="notice-title"
                value={noticeForm.title}
                onChange={(e) => setNoticeForm((prev) => ({ ...prev, title: e.target.value }))}
                required
              />
            </div>
            <div className="admin-filters-row">
              <div className="form-field">
                <label htmlFor="notice-date">Date</label>
                <input
                  id="notice-date"
                  type="date"
                  value={noticeForm.date}
                  onChange={(e) => setNoticeForm((prev) => ({ ...prev, date: e.target.value }))}
                  required
                />
              </div>
              <div className="form-field">
                <label htmlFor="notice-category">Category</label>
                <select
                  id="notice-category"
                  value={selectedCategoryOption}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSelectedCategoryOption(value);
                    if (value !== "__custom__") {
                      setNoticeForm((prev) => ({ ...prev, category: value }));
                    } else {
                      setNoticeForm((prev) => ({ ...prev, category: customCategory.trim() }));
                    }
                  }}
                >
                  {NOTICE_CATEGORY_OPTIONS.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                  <option value="__custom__">Custom category</option>
                </select>
              </div>
            </div>
            {selectedCategoryOption === "__custom__" ? (
              <div className="form-field">
                <label htmlFor="notice-custom-category">Custom category</label>
                <input
                  id="notice-custom-category"
                  value={customCategory}
                  maxLength={60}
                  placeholder="Enter your category"
                  onChange={(e) => {
                    setCustomCategory(e.target.value);
                    setNoticeForm((prev) => ({ ...prev, category: e.target.value }));
                  }}
                  required
                />
              </div>
            ) : null}
            <div className="form-field">
              <label htmlFor="notice-excerpt">Excerpt</label>
              <textarea
                id="notice-excerpt"
                value={noticeForm.excerpt}
                onChange={(e) => setNoticeForm((prev) => ({ ...prev, excerpt: e.target.value }))}
                rows={3}
                required
              />
            </div>
            <div className="form-field">
              <label htmlFor="notice-body">Body</label>
              <textarea
                id="notice-body"
                value={noticeForm.body}
                onChange={(e) => setNoticeForm((prev) => ({ ...prev, body: e.target.value }))}
                rows={6}
                required
              />
            </div>
            <div className="form-field">
              <label htmlFor="notice-pdf">Attach PDF (optional)</label>
              <input
                id="notice-pdf"
                type="file"
                accept="application/pdf,.pdf"
                disabled={noticePdfUploading || noticeSaving}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleNoticePdfUpload(file);
                  e.target.value = "";
                }}
              />
              {noticePdfUploading ? <span className="admin-muted">Uploading PDF…</span> : null}
              {noticeForm.pdfUrl ? (
                <div className="admin-notice-pdf-row">
                  <a href={noticeForm.pdfUrl} target="_blank" rel="noopener noreferrer">
                    View attached PDF
                  </a>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setNoticeForm((prev) => ({ ...prev, pdfUrl: null }))}
                    disabled={noticeSaving}
                  >
                    Remove
                  </button>
                </div>
              ) : null}
            </div>
            <div className="admin-notice-checks">
              <label>
                <input
                  type="checkbox"
                  checked={noticeForm.isNew}
                  onChange={(e) => setNoticeForm((prev) => ({ ...prev, isNew: e.target.checked }))}
                />{" "}
                Mark as new
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={noticeForm.isPublished}
                  onChange={(e) => setNoticeForm((prev) => ({ ...prev, isPublished: e.target.checked }))}
                />{" "}
                Published on public site
              </label>
            </div>
            <div className="admin-filters-actions">
              <button
                type="submit"
                className="btn btn-green btn-sm"
                disabled={noticeSaving || noticePdfUploading}
              >
                {noticeSaving ? "Saving..." : noticeForm.id ? "Update notice" : "Create notice"}
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setNoticeForm(DEFAULT_NOTICE_FORM);
                  setSelectedCategoryOption(DEFAULT_NOTICE_FORM.category);
                  setCustomCategory("");
                }}
                disabled={noticeSaving}
              >
                Reset
              </button>
            </div>
          </form>

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Notice</th>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {noticeLoading ? (
                  <tr>
                    <td colSpan={5}>Loading notices...</td>
                  </tr>
                ) : adminNotices.length === 0 ? (
                  <tr>
                    <td colSpan={5}>No notices found in database.</td>
                  </tr>
                ) : (
                  adminNotices.map((notice) => (
                    <tr key={notice.id}>
                      <td>
                        <strong>{notice.title}</strong>
                        <br />
                        <span className="admin-muted">{notice.excerpt}</span>
                      </td>
                      <td>{new Date(notice.date).toLocaleDateString("en-IN")}</td>
                      <td>{notice.category}</td>
                      <td>
                        {notice.isPublished ? "Published" : "Draft"}
                        {notice.isNew ? " • New" : ""}
                        {notice.pdfUrl ? " • PDF" : ""}
                      </td>
                      <td>
                        <div className="admin-row-actions">
                          <button
                            type="button"
                            className="admin-icon-btn admin-icon-btn-neutral"
                            onClick={() => editNotice(notice)}
                            title="Edit notice"
                            aria-label="Edit notice"
                          >
                            ✎
                          </button>
                          <button
                            type="button"
                            className="admin-icon-btn admin-icon-btn-danger"
                            onClick={() => void deleteNotice(notice.id)}
                            title="Delete notice"
                            aria-label="Delete notice"
                          >
                            🗑
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {noticeError ? (
              <p className="admin-error" role="alert">
                {noticeError}
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      {activeSection === "hostellers" ? (
        <section className="admin-notices-layout">
          <div className="admin-filters admin-notice-form">
            <h2>Hosteller verification (Admin)</h2>
            <p className="admin-muted">
              Enter Intern ID manually or scan barcode from ID card, then enroll student as hosteller.
            </p>
            <div className="admin-filters-row">
              <div className="form-field admin-filter-search">
                <label htmlFor="hosteller-intern-id">Intern ID</label>
                <input
                  id="hosteller-intern-id"
                  value={hostellerInternId}
                  placeholder="NITJSR-XXXX"
                  onChange={(e) => setHostellerInternId(e.target.value)}
                />
              </div>
            </div>
            <div className="admin-filters-actions">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setHostellerScannerOpen((prev) => !prev)}
              >
                {hostellerScannerOpen ? "Stop camera scan" : "Scan ID card barcode"}
              </button>
              <button
                type="button"
                className="btn btn-green btn-sm"
                onClick={() => void lookupHosteller()}
                disabled={hostellerLookupLoading || hostellerEnrollLoading}
              >
                {hostellerLookupLoading ? "Looking up..." : "Find student"}
              </button>
              <button
                type="button"
                className="btn btn-green btn-sm"
                onClick={() => void enrollHosteller(true)}
                disabled={
                  !hostellerLookupResult ||
                  hostellerEnrollLoading ||
                  !hostellerLookupResult.isVerifiedByAdmin
                }
              >
                {hostellerEnrollLoading ? "Saving..." : "Enroll as hosteller"}
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => void enrollHosteller(false)}
                disabled={!hostellerLookupResult || hostellerEnrollLoading}
              >
                Remove hosteller
              </button>
            </div>
            {hostellerScannerOpen ? (
              <div className="admin-idcard-progress" role="status" aria-live="polite">
                <video ref={hostellerVideoRef} className="admin-video-scan" muted playsInline />
              </div>
            ) : null}
            {hostellerScannerError ? (
              <p className="admin-error" role="alert">
                {hostellerScannerError}
              </p>
            ) : null}
            {hostellerLookupResult ? (
              <div
                className={`admin-hosteller-lookup-status ${
                  hostellerLookupResult.hostellerVerificationFromAdmin
                    ? "admin-hosteller-lookup-status-green"
                    : "admin-hosteller-lookup-status-red"
                }`}
                style={{ marginTop: 12 }}
              >
                {hostellerLookupResult.hostellerVerificationFromAdmin
                  ? "Hostel status: already allotted."
                  : "Hostel status: not allotted yet."}
              </div>
            ) : null}
            {hostellerLookupResult ? (
              <div
                className={`admin-detail-row admin-hosteller-detail-compact ${
                  hostellerLookupResult.isVerifiedByAdmin
                    ? "admin-hosteller-detail-green"
                    : "admin-hosteller-detail-red"
                }`}
                style={{ marginTop: 8 }}
              >
                <dl className="admin-detail-grid">
                  <div>
                    <dt>Name</dt>
                    <dd>{hostellerLookupResult.fullName}</dd>
                  </div>
                  <div>
                    <dt>Intern ID</dt>
                    <dd>{hostellerLookupResult.internId || "—"}</dd>
                  </div>
                  <div>
                    <dt>College</dt>
                    <dd>{hostellerLookupResult.collegeName}</dd>
                  </div>
                  <div>
                    <dt>Branch</dt>
                    <dd>{hostellerLookupResult.subject}</dd>
                  </div>
                  <div>
                    <dt>Module</dt>
                    <dd>{hostellerLookupResult.subpart}</dd>
                  </div>
                  <div>
                    <dt>Applications Verify</dt>
                    <dd>{hostellerLookupResult.isVerifiedByAdmin ? "Verified" : "Not Verified"}</dd>
                  </div>
                  <div>
                    <dt>Hosteller Enrollment</dt>
                    <dd>{hostellerLookupResult.hostellerVerificationFromAdmin ? "Yes" : "No"}</dd>
                  </div>
                  <div>
                    <dt>Verified by (email)</dt>
                    <dd>{hostellerLookupResult.hostellerVerifiedByAdminEmail || "—"}</dd>
                  </div>
                </dl>
              </div>
            ) : null}
            {hostellerError ? (
              <p className="admin-error" role="alert">
                {hostellerError}
              </p>
            ) : null}
          </div>

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Intern ID</th>
                  <th>Name</th>
                  <th>College</th>
                  <th>Branch</th>
                  <th>Module</th>
                  <th>Verified By</th>
                  <th>Verified At</th>
                </tr>
              </thead>
              <tbody>
                {hostellerLoading ? (
                  <tr>
                    <td colSpan={7}>Loading hostellers...</td>
                  </tr>
                ) : hostellers.length === 0 ? (
                  <tr>
                    <td colSpan={7}>No admin-verified hostellers yet.</td>
                  </tr>
                ) : (
                  hostellers.map((student) => (
                    <tr key={student.id}>
                      <td>{student.internId || "—"}</td>
                      <td>{student.fullName}</td>
                      <td>{student.collegeName}</td>
                      <td>{student.subject}</td>
                      <td>{student.subpart}</td>
                      <td>{student.hostellerVerifiedByAdminEmail || "—"}</td>
                      <td>
                        {student.hostellerVerificationAt
                          ? new Date(student.hostellerVerificationAt).toLocaleString("en-IN")
                          : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {adminRole === "admin" && activeSection === "attendance" ? <AdminAttendance /> : null}
    </div>
  );
}
