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
    order?: number;
}

// Hand-authored EDITORIAL categories — multi-course groupings and the Advanced
// dynamic intro. The single-course "daily" dynamic tiles (Pop Quiz, Cyber/
// Financial/Religion Daily, School for a New Machine, Get Certified) are NOT
// here: they're generated from the backend course registry (each course's
// `card:` block in lessons.yaml) and merged in by getCategories(). So adding a
// new daily course needs no edit to this file.
export const STATIC_CATEGORIES: Category[] = [
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
];

/** Static category slugs — used by generateStaticParams (build time, no backend). */
export const STATIC_CATEGORY_SLUGS = STATIC_CATEGORIES.map((c) => c.slug);

// Single-course dynamic tiles generated from the backend course registry
// (/api/categories ← each course's `card:` block). Sorted by `order`.
async function fetchGeneratedCategories(): Promise<Category[]> {
    const url = `${process.env.BACKEND_INTERNAL_URL ?? "http://localhost:5007"}/api/categories`;
    try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) return [];
        return res.json();
    } catch {
        return [];
    }
}

/** Editorial categories first, then registry-generated single-course tiles. */
export async function getCategories(): Promise<Category[]> {
    const generated = await fetchGeneratedCategories();
    return [...STATIC_CATEGORIES, ...generated];
}

export async function getCategoryBySlug(slug: string): Promise<Category | undefined> {
    const stat = STATIC_CATEGORIES.find((c) => c.slug === slug);
    if (stat) return stat;
    const generated = await fetchGeneratedCategories();
    return generated.find((c) => c.slug === slug);
}
