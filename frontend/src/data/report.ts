export const AGENTS = [
  { name: "Idea Extraction", note: "Dissecting problem, solution and keywords" },
  { name: "Market Trends", note: "Querying search interest and live headlines" },
  { name: "Competitor Intelligence", note: "Scanning the market for real players" },
  { name: "SWOT & Feasibility", note: "Weighing strengths, gaps and risks" },
  { name: "MVP Recommendation", note: "Scoping must-have and nice-to-have scope" },
  { name: "Report & Scoring", note: "Computing the 0–100 score and verdict" },
];

export const INDUSTRIES = [
  "FinTech",
  "HealthTech",
  "AI / DevTools",
  "EdTech",
  "B2B SaaS",
  "E-Commerce",
  "Climate",
];

export const SAMPLES = [
  "AI Telehealth Scribe",
  "Micro-Invoice Matcher",
  "B2B Contract Reviewer",
];

export const report = {
  title: "TheraCopilot AI",
  industry: "HealthTech",
  verdict: "Requires Refinement" as const,
  score: 74,
  summary:
    "Strong, well-timed demand from solo practitioners and a credible wedge in documentation time savings. The moat is thin — incumbent EHR vendors can ship a comparable scribe — so the winning move is a narrow compliance-first launch with one clinical specialty before broadening.",
  breakdown: [
    { label: "Market Demand", value: 84 },
    { label: "Technical Feasibility", value: 78 },
    { label: "Competitive Moat", value: 58 },
    { label: "Business Viability", value: 76 },
  ],
  radar: [
    { pillar: "Demand", you: 84, benchmark: 66 },
    { pillar: "Feasibility", you: 78, benchmark: 70 },
    { pillar: "Moat", you: 58, benchmark: 64 },
    { pillar: "Viability", you: 76, benchmark: 62 },
    { pillar: "Speed", you: 81, benchmark: 58 },
    { pillar: "Regulatory", you: 61, benchmark: 55 },
  ],
  trend: [
    { month: "Oct", interest: 42 },
    { month: "Nov", interest: 47 },
    { month: "Dec", interest: 44 },
    { month: "Jan", interest: 55 },
    { month: "Feb", interest: 61 },
    { month: "Mar", interest: 58 },
    { month: "Apr", interest: 67 },
    { month: "May", interest: 72 },
    { month: "Jun", interest: 70 },
    { month: "Jul", interest: 79 },
    { month: "Aug", interest: 86 },
    { month: "Sep", interest: 91 },
  ],
  trendBadge: "Rapidly Growing",
  competitorChart: [
    { name: "Your venture", breadth: 55, ux: 88, price: 82 },
    { name: "Nuance DAX", breadth: 92, ux: 61, price: 34 },
    { name: "Freed", breadth: 64, ux: 79, price: 66 },
    { name: "Heidi Health", breadth: 71, ux: 74, price: 58 },
  ],
  risk: {
    composite: 38,
    tiles: [
      { label: "Market Demand Risk", value: 22 },
      { label: "Feasibility Risk", value: 31 },
      { label: "Competitive Risk", value: 58 },
      { label: "Business Model Risk", value: 41 },
    ],
  },
  competitors: [
    {
      name: "Nuance DAX Copilot",
      domain: "nuance.com",
      url: "https://nuance.com",
      about: "Enterprise ambient clinical documentation bundled into hospital EHR contracts.",
      points: [
        "Enterprise ambient clinical documentation platform.",
        "Deep EHR integration bundled into hospital contracts.",
        "High compliance overhead and enterprise pricing tiers.",
      ],
      strengths: ["Deep EHR integration", "Trusted brand", "Enterprise compliance"],
      gaps: ["Priced out of solo practice", "Slow onboarding", "No therapy-specific notes"],
    },
    {
      name: "Freed",
      domain: "getfreed.ai",
      url: "https://getfreed.ai",
      about: "Consumer-friendly AI scribe aimed at independent clinicians.",
      points: [
        "Consumer-friendly AI scribe aimed at independent clinicians.",
        "Fast setup with self-serve onboarding experience.",
        "Generalist templates with limited insurance billing integration.",
      ],
      strengths: ["Fast setup", "Loved UX", "Transparent pricing"],
      gaps: ["Generalist templates", "Light analytics", "Limited insurance workflows"],
    },
    {
      name: "Heidi Health",
      domain: "heidihealth.com",
      url: "https://heidihealth.com",
      about: "Multi-specialty scribe with template marketplace and team features.",
      points: [
        "Multi-specialty scribe with template marketplace and team features.",
        "Support for multi-language clinical consultations.",
        "Crowded roadmap with thin US insurance billing workflows.",
      ],
      strengths: ["Template library", "Multi-language", "Team plans"],
      gaps: ["Thin US billing support", "Crowded roadmap", "Mixed mobile reviews"],
    },
  ],
  swot: {
    Strengths: [
      "Sharp focus on a single underserved clinician persona",
      "Documentation time savings are measurable in week one",
      "Low switching cost from paper and generic dictation",
    ],
    Weaknesses: [
      "No proprietary clinical dataset yet",
      "Compliance work slows the first release",
      "Founder-led sales does not scale past ~200 accounts",
    ],
    Opportunities: [
      "Insurance-ready note formats nobody serves well",
      "Supervision and group-practice reporting",
      "Referral loops inside therapist communities",
    ],
    Threats: [
      "Incumbent EHRs add native ambient recording modules",
      "Regulatory friction around HIPAA voice transmission consent",
      "Price race to the bottom by open-source wrapper tools",
    ],
  },
  mvp: {
    "Must-Have (Sprint 1–2)": [
      {
        title: "5-minute audio capture & SOAP note drafting",
        why: "Proves core value loop and immediate clinician time-saving.",
        kpi: "80% of generated notes approved without major edits",
      },
      {
        title: "HIPAA-compliant audio encryption & storage",
        why: "Non-negotiable table stakes for clinical practice adoption.",
        kpi: "Zero compliance audit exceptions",
      },
      {
        title: "One-click clipboard export to any EHR",
        why: "Bypasses slow EHR API partnership negotiations.",
        kpi: "Average export time under 5 seconds",
      },
    ],
    "Nice-to-Have (Sprint 3–4)": [
      {
        title: "Template library per modality",
        why: "Raises retention once the core loop is proven.",
        kpi: "50% of users adopt a custom template",
      },
      {
        title: "Weekly caseload digest",
        why: "Creates a reason to return outside session hours.",
        kpi: "35% digest open rate",
      },
    ],
    "Future (Quarterly Scale)": [
      {
        title: "Insurance claim pre-fill",
        why: "High value, high compliance cost — wait for pull.",
        kpi: "Requested by 30% of paying accounts",
      },
      {
        title: "Group practice admin console",
        why: "Only relevant after multi-seat demand appears.",
        kpi: "10 multi-seat accounts in pipeline",
      },
    ],
  },
  advice:
    "Run twenty recorded interviews with solo therapists before writing more code. Hand-produce the first fifty notes if you have to — the goal of the first month is proof that clinicians sign the output unedited, not a finished product.",
  news: [
    {
      title: "Ambient AI scribes cut clinician documentation time by a third, study finds",
      source: "Healthcare Dive",
      date: "Sep 2, 2026",
      link: "https://www.healthcaredive.com",
      points: [
        "Ambient scribes reduce documentation overhead by up to 33%.",
        "Clinical burnout metrics show immediate drop after initial week of adoption.",
      ],
    },
    {
      title: "Solo practice software spending grows 21% year over year",
      source: "MedCity News",
      date: "Aug 27, 2026",
      link: "https://medcitynews.com",
      points: [
        "Independent practitioners are rapidly allocating budget for workflow automation.",
        "High willingness to pay for specialized point solutions over legacy EHR suites.",
      ],
    },
    {
      title: "Regulators weigh new consent rules for recorded therapy sessions",
      source: "STAT",
      date: "Aug 19, 2026",
      link: "https://www.statnews.com",
      points: [
        "State health boards evaluating strict patient consent standards for audio capture.",
        "Compliance-first vendors poised to capture regulated clinical market share.",
      ],
    },
  ],
};

