import {
  attendancePolicy,
  certification,
  feeStructure,
  formatDate,
  notices,
  programOverview,
  results,
  site,
  studentPortalPath,
  trainingCourses,
  trainingMethodology,
} from "./content";

export type ChatButton = {
  id: string;
  label: string;
  nextNodeId?: string;
  href?: string;
  /** In-chat shortlist / hostel actions (handled in Chatbot.tsx). */
  action?:
    | "shortlist_check"
    | "shortlist_logout"
    | "accommodation_yes"
    | "accommodation_no"
    | "accommodation_change"
    | "accommodation_cancel"
    | "accommodation_gender_male"
    | "accommodation_gender_female"
    | "accommodation_gender_other";
};

export type ChatNode = {
  id: string;
  messages: string[];
  buttons: ChatButton[];
};

function branchNodeId(branch: string) {
  return `courses_${branch.replace(/\s+/g, "_").replace(/\//g, "_")}`;
}

const mainMenuButtons: ChatButton[] = [
  { id: "m-shortlist", label: "Check my shortlist", action: "shortlist_check" },
  { id: "m-about", label: "About the programme", nextNodeId: "about" },
  { id: "m-eligible", label: "Who can join?", nextNodeId: "eligibility" },
  { id: "m-courses", label: "Training modules", nextNodeId: "courses_menu" },
  { id: "m-fees", label: "Fees & hostel", nextNodeId: "fees" },
  { id: "m-attendance", label: "Attendance rules", nextNodeId: "attendance" },
  { id: "m-assess", label: "Assessment & results", nextNodeId: "assessment" },
  { id: "m-cert", label: "Certificate", nextNodeId: "certification" },
  { id: "m-notices", label: "Latest notices", nextNodeId: "notices_menu" },
  { id: "m-contact", label: "Contact & helpline", nextNodeId: "contact" },
];

function withMenu(extra: ChatButton[] = [], backNodeId?: string): ChatButton[] {
  const buttons = [...extra];
  if (backNodeId) {
    buttons.push({ id: `back-${backNodeId}`, label: "← Back", nextNodeId: backNodeId });
  }
  buttons.push({ id: "to-menu", label: "Main menu", nextNodeId: "menu" });
  return buttons;
}

const courseBranches = Object.keys(trainingCourses) as Array<keyof typeof trainingCourses>;

function coursesNode(branch: keyof typeof trainingCourses): ChatNode {
  const modules = trainingCourses[branch];
  return {
    id: branchNodeId(branch),
    messages: [
      `${branch}\n\nModules offered:\n${modules.map((m, i) => `${i + 1}. ${m}`).join("\n")}`,
      "Final module allotment is decided by NIT Jamshedpur and DHTE based on batch planning.",
    ],
    buttons: withMenu(
      [{ id: "other-branch", label: "Other branches", nextNodeId: "courses_menu" }],
      "courses_menu",
    ),
  };
}

const courseNodes = Object.fromEntries(
  courseBranches.map((branch) => [branchNodeId(branch), coursesNode(branch)]),
) as Record<string, ChatNode>;

const noticeNodes = Object.fromEntries(
  notices.map((n) => [
    `notice_${n.id}`,
    {
      id: `notice_${n.id}`,
      messages: [
        `${n.title}\n(${formatDate(n.date)} · ${n.category})`,
        n.excerpt,
        n.body,
      ],
      buttons: withMenu(
        [{ id: "more-notices", label: "Other notices", nextNodeId: "notices_menu" }],
        "notices_menu",
      ),
    } satisfies ChatNode,
  ]),
) as Record<string, ChatNode>;

export const chatNodes: Record<string, ChatNode> = {
  start: {
    id: "start",
    messages: [
      `Welcome to the ${site.shortName} assistant.`,
      "I can help with programme details, shortlist status (email + mobile), hostel accommodation enrollment, fees, training modules, notices, and contact information.",
      "Tap an option below to continue — just like a WhatsApp chatbot.",
    ],
    buttons: [{ id: "start-menu", label: "Get started", nextNodeId: "menu" }],
  },

  menu: {
    id: "menu",
    messages: ["What would you like to know?"],
    buttons: mainMenuButtons,
  },

  about: {
    id: "about",
    messages: [
      programOverview.summary,
      `Host: ${programOverview.host}\nPartner: ${programOverview.partner}\nDuration: ${programOverview.duration}`,
      programOverview.aboutNit,
      programOverview.approval,
    ],
    buttons: withMenu(
      [
        { id: "about-method", label: "Training methodology", nextNodeId: "methodology" },
        { id: "about-targets", label: "Programme targets", nextNodeId: "targets" },
        { id: "about-jut", label: "JUT academic credit", nextNodeId: "jut" },
      ],
      "menu",
    ),
  },

  eligibility: {
    id: "eligibility",
    messages: [
      `Eligible students:\n${programOverview.audience}`,
      "This is a residential industrial training programme at NIT Jamshedpur.",
      programOverview.notificationLead,
    ],
    buttons: withMenu(
      [{ id: "el-duration", label: "Duration & intake", nextNodeId: "duration_capacity" }],
      "menu",
    ),
  },

  duration_capacity: {
    id: "duration_capacity",
    messages: [
      `Duration: ${programOverview.duration} (residential training at NIT Jamshedpur)`,
      "On-campus hostel and mess facilities are provided for enrolled students.",
    ],
    buttons: withMenu([], "menu"),
  },

  methodology: {
    id: "methodology",
    messages: [
      "Training methodology includes:",
      trainingMethodology.map((item, i) => `${i + 1}. ${item}`).join("\n"),
    ],
    buttons: withMenu(
      [{ id: "meth-assess", label: "Assessment details", nextNodeId: "assessment" }],
      "about",
    ),
  },

  fees: {
    id: "fees",
    messages: [
      `Fee structure (per student):\n• Training: ${feeStructure.trainingFee}\n• Hostel & mess: ${feeStructure.hostelMess}\n• Total: ${feeStructure.total}`,
      feeStructure.discountNote,
      feeStructure.hostelNote,
    ],
    buttons: withMenu(
      [{ id: "fees-notice", label: "Fee-related notice", nextNodeId: "notice_n3" }],
      "menu",
    ),
  },

  attendance: {
    id: "attendance",
    messages: [
      "Attendance policy:",
      attendancePolicy.recording,
      attendancePolicy.minimum,
      attendancePolicy.medical,
    ],
    buttons: withMenu(
      [{ id: "att-notice", label: "Read attendance notice", nextNodeId: "notice_n2" }],
      "menu",
    ),
  },

  assessment: {
    id: "assessment",
    messages: [
      "Assessment includes internal tests, project work, workshops, and a final presentation by NIT faculty.",
      "Shortlisted students can enter email and mobile in this chat to view status and confirm hostel accommodation (yes/no).",
    ],
    buttons: withMenu(
      [
        { id: "ass-shortlist", label: "Check my shortlist", action: "shortlist_check" },
        { id: "ass-results", label: "Batch announcements", nextNodeId: "results" },
        { id: "ass-notice", label: "Assessment notice", nextNodeId: "notice_n4" },
        { id: "ass-page", label: "Open Login & Profile", href: `${studentPortalPath}#check-shortlist` },
      ],
      "menu",
    ),
  },

  certification: {
    id: "certification",
    messages: [
      certification.title,
      `Issued by: ${certification.issuer}`,
      certification.details,
      "You must meet attendance rules and pass assessments to receive the certificate.",
    ],
    buttons: withMenu([], "menu"),
  },

  targets: {
    id: "targets",
    messages: [
      "Programme targets (MOU):",
      "• Certification: at least 75% of enrolled students",
      "• Placement: at least 40% of certified students",
      "• Intake: 500 students per year | Duration: 6 weeks",
    ],
    buttons: withMenu([], "about"),
  },

  jut: {
    id: "jut",
    messages: [programOverview.jutNote],
    buttons: withMenu([], "about"),
  },

  courses_menu: {
    id: "courses_menu",
    messages: ["Select an engineering branch to view training modules:"],
    buttons: [
      ...courseBranches.map((branch) => ({
        id: `branch-${branchNodeId(branch)}`,
        label: branch,
        nextNodeId: branchNodeId(branch),
      })),
      { id: "to-menu", label: "Main menu", nextNodeId: "menu" },
    ],
  },

  ...courseNodes,

  notices_menu: {
    id: "notices_menu",
    messages: ["Latest notices — tap one for details:"],
    buttons: [
      ...notices.map((n) => ({
        id: `btn-${n.id}`,
        label: n.title.length > 36 ? `${n.title.slice(0, 34)}…` : n.title,
        nextNodeId: `notice_${n.id}`,
      })),
      { id: "notices-page", label: "View all notices", href: "/notices" },
      { id: "to-menu", label: "Main menu", nextNodeId: "menu" },
    ],
  },

  ...noticeNodes,

  results: {
    id: "results",
    messages: [
      results.length === 0
        ? "No results published yet. Check back after batch evaluations."
        : results.map((r) => `${r.title}\n${formatDate(r.date)} · ${r.batch}\n${r.description}`).join("\n\n"),
    ],
    buttons: withMenu(
      [
        { id: "results-shortlist", label: "Check my shortlist", action: "shortlist_check" },
        { id: "results-page", label: "Open Login & Profile", href: `${studentPortalPath}#check-shortlist` },
      ],
      "menu",
    ),
  },

  contact: {
    id: "contact",
    messages: [
      "Contact information:",
      `NIT Jamshedpur — ${site.nitContact}\nNIT Jamshedpur, Jharkhand – 831014`,
      `DHTE Jharkhand — ${site.dhteContact}`,
      "For batch instructions, also contact your parent polytechnic Principal.",
    ],
    buttons: withMenu(
      [
        { id: "email-nit", label: "Email NIT", href: `mailto:${site.nitContact}` },
        { id: "contact-page", label: "Contact page", href: "/contact" },
      ],
      "menu",
    ),
  },
};

export function getChatNode(nodeId: string): ChatNode {
  return chatNodes[nodeId] ?? chatNodes.menu;
}

export const CHAT_START_NODE = "start";
