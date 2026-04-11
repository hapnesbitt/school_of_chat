export interface Category {
    slug: string;
    label: string;
    icon: string;
    tagline: string;
    description: string;
    /** Ordered list of course slugs belonging to this category. */
    courseSlugs: string[];
    /** If true, any course with lesson_type "dynamic" is also included. */
    includeDynamic?: boolean;
    comingSoon?: boolean;
}

export const CATEGORIES: Category[] = [
    {
        slug: "workplace",
        label: "Workplace Essentials",
        icon: "🏢",
        tagline: "The courses everyone is expected to know",
        description:
            "Compliance and awareness training that applies to virtually every employee — " +
            "regardless of role, industry, or seniority. GDPR, HIPAA, DEI, anti-bribery, " +
            "harassment prevention, and email security.",
        courseSlugs: [
            "harassment-prevention",
            "email-security",
            "anti-bribery",
            "dei-fundamentals",
            "data-privacy-gdpr",
            "hipaa-awareness",
        ],
    },
    {
        slug: "industry",
        label: "Industry & Compliance",
        icon: "🏭",
        tagline: "Specialised regulatory training for specific roles",
        description:
            "Sector-specific compliance and regulatory knowledge. GMP for pharmaceutical and " +
            "manufacturing environments, plus future courses covering finance, healthcare operations, " +
            "and other regulated industries.",
        courseSlugs: ["gmp-essentials"],
    },
    {
        slug: "security",
        label: "Security & Technology",
        icon: "🛡️",
        tagline: "Technical certification prep and AI literacy",
        description:
            "Certification preparation and technical skills. CompTIA Security+ readiness and " +
            "prompt engineering fundamentals — for people who want to understand the tools, " +
            "not just use them.",
        courseSlugs: ["security-plus-readiness", "prompt-engineering-fundamentals", "proofpoint-administration", "enterprise-email-dns", "linux-system-reliability"],
    },
    {
        slug: "professional",
        label: "Professional Skills",
        icon: "💼",
        tagline: "Communication, leadership, and workplace effectiveness",
        description:
            "Skills that don't appear on a certification exam but matter just as much at work. " +
            "AI-assisted professional writing — SOAP notes, user stories, performance reviews, " +
            "incident reports, and executive summaries. You write the prompt. The AI writes the document.",
        courseSlugs: ["ai-professional-writing"],
    },
    {
        slug: "governance",
        label: "Governance & Risk",
        icon: "🏛️",
        tagline: "Who decides. Who's accountable. How you prove it.",
        description:
            "The frameworks, processes, and disciplines that make IT governable at scale. " +
            "IT governance fundamentals, change management, risk assessment, vendor risk, " +
            "audit preparation, business continuity, and disaster recovery — required at " +
            "every mid-to-large organisation and evidence for SOC 2, ISO 27001, and HIPAA.",
        courseSlugs: ["it-governance-fundamentals", "business-continuity-dr"],
    },
    {
        slug: "health-medical",
        label: "Health & Medical",
        icon: "🏥",
        tagline: "Understand your health. Advocate for yourself.",
        description:
            "Condition-specific awareness courses designed to build real understanding — not " +
            "just facts to pass a test. Whether you have a diagnosis, love someone who does, " +
            "or work in care, these courses give you the language, context, and confidence to " +
            "engage with the medical system on your own terms.",
        courseSlugs: ["ehlers-danlos-syndrome"],
    },
    {
        slug: "advanced",
        label: "Advanced Learning",
        icon: "🧠",
        tagline: "Cloud-powered courses using live content and AI generation",
        description:
            "Dynamic courses that pull live content and generate questions on the fly using " +
            "the cloud AI model. Requires cloud availability. Reading Comprehension uses real " +
            "cybersecurity articles from Arc Codex — different every time you practice.",
        courseSlugs: [],
        includeDynamic: true,
    },
];

export function getCategoryBySlug(slug: string): Category | undefined {
    return CATEGORIES.find((c) => c.slug === slug);
}
