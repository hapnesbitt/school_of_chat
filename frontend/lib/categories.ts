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
        // Explicit single-course inclusion — keeps the news-flavored Pop Quiz
        // course out of this card so it lives in its own (lighter) category.
        courseSlugs: ["reading-comprehension"],
    },
    {
        slug: "pop-quiz",
        label: "Pop Quiz",
        icon: "📰",
        tagline: "Test yourself on this week's news",
        description:
            "Five open-response questions on a real article from the past week. " +
            "Type your answer; the grader has the article in front of it. General knowledge " +
            "won't be enough. The light corner of the site — still grounded, still real.",
        courseSlugs: ["pop-quiz"],
    },
    {
        slug: "cyber-daily",
        label: "Cyber Security Daily",
        icon: "🛡️",
        tagline: "Stay current with today's threat intelligence",
        description:
            "Pick today's threat-intel article from the Huntaegis feed and answer five typed " +
            "questions on it. The grader has the article — general knowledge won't be enough. " +
            "Comprehension badges with your name on them, one per article. Hosted by Huntaegis. " +
            "A reading log for staying current — not a credential or competence assessment.",
        courseSlugs: ["cyber-security-daily"],
    },
    {
        slug: "financial-daily",
        label: "Financial Daily",
        icon: "💹",
        tagline: "Stay current with today's financial news",
        description:
            "Pick today's financial-news article from the Arc Codex feed and answer five typed " +
            "questions on it. The grader has the article — general knowledge won't be enough. " +
            "Comprehension badges with your name on them, one per article. A reading log for " +
            "staying current with the financial news cycle — not a credential, professional " +
            "qualification, or regulatory competence assessment.",
        courseSlugs: ["financial-daily"],
    },
    {
        slug: "get-certified",
        label: "Get Certified",
        icon: "🌱",
        tagline: "Earn a merit badge for what you actually know",
        description:
            "Single-article merit badges, sponsor-branded. Pass a real plant article from " +
            "Arc Codex's catalog and earn a Plant Merit Badge for that specific plant — with " +
            "your name on it. Hosted by Plantorium. More badge tracks coming as other " +
            "sponsors come on.",
        courseSlugs: ["plant-badge"],
    },
];

export function getCategoryBySlug(slug: string): Category | undefined {
    return CATEGORIES.find((c) => c.slug === slug);
}
