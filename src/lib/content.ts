export const site = {
  title: "Industrial Training & Internship Portal",
  subtitle: "NIT Jamshedpur × Department of Higher and Technical Education, Jharkhand",
  shortName: "NIT JSR – DHTE Internship Portal",
  tollFree: "1800-569-3311",
  nitContact: "training@nitjsr.ac.in",
  dhteContact: "dhte.jharkhand@gov.in",
} as const;

export const programOverview = {
  summary:
    "Under a formal Memorandum of Understanding between the Department of Higher and Technical Education (DHTE), Government of Jharkhand, and the National Institute of Technology (NIT), Jamshedpur, diploma students from Government Polytechnic and Government Women's Polytechnic institutions across the state receive structured industrial training and internships to bridge classroom learning with real-world technical practice.",
  host: "National Institute of Technology (NIT), Jamshedpur",
  partner: "Department of Higher and Technical Education, Government of Jharkhand",
  audience:
    "Students enrolled in Government Polytechnic and Government Women's Polytechnic colleges in Jharkhand",
  capacity: "Up to 500 students per year",
  duration: "6 weeks",
  notificationLead: "Training schedules and notices are published at least 60 days in advance to DHTE and all participating polytechnics.",
  approval:
    "Approved by the State Government (Council of Ministers, February 2026). MOU signed on 6 March 2026.",
  aboutNit:
    "Established in 1960 (originally as Regional Institute of Technology), NIT Jamshedpur is a premier technical institution in the industrial hub of Jamshedpur, offering B.Tech, M.Tech, MBA, M.Sc, and Ph.D programmes.",
  jutNote:
    "In coordination with Jharkhand University of Technology (JUT), Ranchi, academic credit for internships during even semesters may be awarded as per university norms.",
} as const;

export const trainingMethodology = [
  "On-field training at NIT Jamshedpur facilities",
  "Classroom sessions and laboratory work",
  "Short project assignments",
  "Internal assessment tests",
  "Workshops and seminars",
  "Final presentation and evaluation",
] as const;

export const attendancePolicy = {
  recording: "Attendance is recorded through a biometric system for training sessions and hostel stay.",
  minimum:
    "A minimum of 80% attendance is required to be eligible for the final assessment and certification.",
  medical:
    "Absence due to medical reasons requires a certificate and approval from the Principal of the student's parent polytechnic.",
} as const;

export const feeStructure = {
  trainingFee: 5292,
  hostelMessApprox: 3500,
  totalPerStudent: 8792,
  discountNote:
    "NIT Jamshedpur provides training at approximately 40% below the standard skill-development rate (₹49 per hour as per government norms).",
  hostelNote: "Hostel and mess charges are based on actual daily rates at NIT Jamshedpur hostels.",
} as const;

export const performanceTargets = [
  {
    label: "Certification target",
    value: "≥ 75%",
    description: "Share of enrolled students who successfully complete training and receive certification.",
    accent: "blue",
  },
  {
    label: "Placement target",
    value: "≥ 40%",
    description: "Share of certified students who secure employment after completion.",
    accent: "green",
  },
  {
    label: "Annual intake",
    value: "500",
    description: "Maximum students trained per year under the scheme.",
    accent: "purple",
  },
  {
    label: "Program duration",
    value: "6 weeks",
    description: "Residential skill-development and internship programme at NIT Jamshedpur.",
    accent: "teal",
  },
] as const;

export const trainingCourses = {
  "Computer Science and Engineering": [
    "Computer Literacy and Proficiency",
    "C Programming Language",
    "Python Programming",
    "Web Technologies",
    "Android Development",
  ],
  "Mechanical Engineering": [
    "Solid Modeling (AutoCAD, SolidWorks)",
    "Mechanical Design (FEM, ANSYS)",
    "Automation and Robotics",
    "Vibration and Noise Control",
    "Automobile Engineering",
    "Refrigeration and Air Conditioning",
  ],
  "Electrical Engineering": [
    "Electrical Design Drawing and Estimation",
    "Renewable Energy Integration",
    "MATLAB / Simulink / Electronics CAD",
    "Analog / Digital Electronics",
  ],
  "Civil Engineering": [
    "Drafting (Architectural and Structural)",
    "Estimation and Costing",
    "Quality Control",
  ],
  "Workshop / Production": [
    "Computer-Aided Manufacturing (CAM)",
    "Welding and Additive Manufacturing",
    "Foundry and Forming",
  ],
} as const;

export const certification = {
  title: "Training Completion Certificate",
  issuer: "NIT Jamshedpur",
  details:
    "Awarded upon successful completion of assessments. The certificate records training duration, subjects covered, and the student's performance.",
} as const;

export type Notice = {
  id: string;
  title: string;
  date: string;
  category: "General" | "Schedule" | "Admission" | "Assessment";
  excerpt: string;
  body: string;
  isNew?: boolean;
};

export type Result = {
  id: string;
  title: string;
  date: string;
  batch: string;
  description: string;
  fileLabel?: string;
  fileUrl?: string;
};

export const notices: Notice[] = [
  {
    id: "n1",
    title: "Advance notification for upcoming training batch",
    date: "2026-03-10",
    category: "Schedule",
    isNew: true,
    excerpt:
      "As per MOU terms, batch schedule and instructions will be communicated to all Government Polytechnics at least 60 days before commencement.",
    body: "NIT Jamshedpur, in coordination with DHTE Jharkhand, will publish the detailed training calendar, reporting dates, and document checklist for the next residential batch. Principals of participating polytechnics are requested to disseminate this notice to eligible diploma students.",
  },
  {
    id: "n2",
    title: "Biometric attendance and 80% eligibility rule",
    date: "2026-03-08",
    category: "General",
    isNew: true,
    excerpt:
      "Attendance for training and hostel stay is tracked biometrically. Minimum 80% attendance is mandatory for final assessment.",
    body: "Students must maintain regular attendance throughout the 6-week programme. Medical leave requires a valid certificate and prior approval from the student's parent polytechnic Principal.",
  },
  {
    id: "n3",
    title: "Approved fee structure for residential training",
    date: "2026-03-06",
    category: "Admission",
    excerpt:
      "Training fee ₹5,292 plus hostel/mess (approx. ₹3,500) per student. NIT provides subsidized rates under the state MOU.",
    body: "The consolidated fee of ₹8,792 per student covers skill training at discounted rates and residential facilities on campus. Hostel and mess charges may vary slightly based on actual daily rates.",
  },
  {
    id: "n4",
    title: "Internal assessment and final presentation schedule",
    date: "2026-02-28",
    category: "Assessment",
    excerpt:
      "Assessment includes internal tests, project work, and a final presentation evaluated by NIT faculty.",
    body: "Detailed assessment rubrics will be shared at the start of each batch. Results will be published on this portal after evaluation.",
  },
];

export const results: Result[] = [
  {
    id: "r1",
    title: "Sample batch – assessment results (placeholder)",
    date: "2026-02-20",
    batch: "Mechanical Engineering – CAM Module (Pilot)",
    description:
      "This entry is a placeholder. Official result PDFs and merit lists will be uploaded here after each training cycle is evaluated.",
    fileLabel: "Results will be published here",
  },
];

export const navLinks = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About the Programme" },
  { href: "/program", label: "Training Modules" },
  { href: "/notices", label: "Notices" },
  { href: "/results", label: "Results" },
  { href: "/contact", label: "Contact" },
] as const;

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}
