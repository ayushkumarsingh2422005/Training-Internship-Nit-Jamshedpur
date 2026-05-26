export const site = {
  title: "Industrial Training & Internship Portal",
  subtitle: "NIT Jamshedpur × Department of Higher and Technical Education, Jharkhand",
  shortName: "NIT JSR – DHTE Internship Portal",
  phone: "8299797516",
  nitContact: "internship@nitjsr.ac.in",
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
  trainingFee: "Chargeable (training fee as per programme norms)",
  hostelMess: "Chargeable (hostel & mess — based on actual rates at NIT Jamshedpur)",
  total: "Chargeable (consolidated amount communicated at admission)",
  discountNote:
    "NIT Jamshedpur provides training at subsidized rates under the state MOU, below standard skill-development norms.",
  hostelNote: "Hostel and mess are chargeable based on actual daily rates at NIT Jamshedpur hostels.",
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
    id: "n5",
    title: "Shortlist result announcement — 26 May 2026",
    date: "2026-05-26",
    category: "Assessment",
    isNew: true,
    excerpt:
      "Shortlisted candidates for industrial training at NIT Jamshedpur may check their status on the Results page from 26 May 2026 using registered email and mobile number.",
    body: "The shortlist for the upcoming residential training batch is announced on 26 May 2026. Eligible diploma students should visit the Results section of this portal, enter the same email and mobile number submitted in their application, and confirm hostel accommodation preference where applicable. Students not on the shortlist will be informed on the portal after verification.",
  },
  {
    id: "n6",
    title: "Training commencement from 1 June 2026 (42 days)",
    date: "2026-05-26",
    category: "Schedule",
    isNew: true,
    excerpt:
      "Residential industrial training at NIT Jamshedpur will commence on 1 June 2026 and continue for 42 days as per the approved batch schedule.",
    body: "All shortlisted students are informed that the training programme will commence on 1 June 2026. The batch will run for 42 days on campus, including classroom sessions, laboratory work, and residential stay where hostel accommodation has been opted. Reporting instructions, document checklist, and chargeable fee details will be communicated through parent polytechnics and this portal. Students must maintain biometric attendance throughout the programme.",
  }
];

export const results: Result[] = [
  {
    id: "r1",
    title: "Shortlist announced — check your status",
    date: "2026-05-26",
    batch: "Industrial Training & Internship 2026",
    description:
      "Shortlist results are available from 26 May 2026. Use the form below with your registered email and mobile number to view your status and hostel accommodation options.",
    fileLabel: "Check shortlist below",
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
