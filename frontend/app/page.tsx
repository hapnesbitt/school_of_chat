import Link from "next/link";
import UserMenu from "@/components/UserMenu";

interface Course {
    slug: string;
    title: string;
    tagline: string;
    description: string;
    icon: string;
    tier: number;
    lesson_type: string;
    lesson_count: number;
}

const TIERS: { tier: number; label: string; sublabel: string }[] = [
    { tier: 1, label: "Month 1",  sublabel: "Required — Everyone" },
    { tier: 2, label: "Month 2",  sublabel: "Role Specific" },
    { tier: 3, label: "Month 3",  sublabel: "Advanced" },
];

async function getCourses(): Promise<Course[]> {
    const url = `${process.env.BACKEND_INTERNAL_URL ?? "http://localhost:5007"}/api/courses`;
    try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) return [];
        return res.json();
    } catch {
        return [];
    }
}

export default async function HomePage() {
    const courses = await getCourses();

    const byTier = TIERS.map((t) => ({
        ...t,
        courses: courses
            .filter((c) => (c.tier ?? 1) === t.tier)
            .sort((a, b) => a.title.localeCompare(b.title)),
    })).filter((t) => t.courses.length > 0);

    return (
        <div className="min-h-screen bg-rock-bg text-slate-200">
            <nav aria-label="Site navigation" className="border-b border-white/5 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span aria-hidden="true" className="text-2xl">🎸</span>
                    <span className="font-black text-white text-lg tracking-tight">School of Chat</span>
                </div>
                <UserMenu />
            </nav>

            {/* Hero */}
            <div className="px-6 pt-20 pb-12 max-w-3xl mx-auto text-center">
                <div aria-hidden="true" className="text-6xl mb-6">🎸</div>
                <h1 className="text-5xl sm:text-6xl font-black text-white mb-4 leading-tight tracking-tighter">
                    School of <span className="text-rock-yellow">Chat</span>
                </h1>
                <p className="text-xl text-slate-400 mb-2">
                    Typed answers. Real AI. Actual grading.
                </p>
                <p className="text-slate-500">
                    No multiple choice. No theory slides. Pick a course and start.
                </p>
            </div>

            {/* Course grid — tiered */}
            <main className="px-6 pb-24 max-w-2xl mx-auto space-y-12">
                {courses.length === 0 ? (
                    <div role="status" className="rounded-xl border border-white/10 bg-rock-card p-8 text-center text-slate-500">
                        Backend not responding. Run{" "}
                        <code className="text-rock-yellow font-mono text-sm">./claude_stack.sh start gunicorn</code>
                    </div>
                ) : (
                    byTier.map((tier) => (
                        <section key={tier.tier} aria-labelledby={`tier-${tier.tier}-heading`}>
                            <div className="flex items-baseline gap-3 mb-4">
                                <h2
                                    id={`tier-${tier.tier}-heading`}
                                    className="text-xs font-black uppercase tracking-widest text-rock-yellow"
                                >
                                    {tier.label}
                                </h2>
                                <span aria-hidden="true" className="text-xs text-slate-600 uppercase tracking-widest">
                                    {tier.sublabel}
                                </span>
                                <span className="sr-only">— {tier.sublabel}</span>
                            </div>

                            <div className="space-y-3">
                                {tier.courses.map((course) => (
                                    <Link
                                        key={course.slug}
                                        href={`/course/${course.slug}`}
                                        className="group block rounded-xl border border-white/10 bg-rock-card
                                                   hover:border-rock-yellow/30 hover:bg-[#161616] transition-all p-6
                                                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rock-yellow"
                                    >
                                        <div className="flex items-start gap-5">
                                            <span aria-hidden="true" className="text-3xl shrink-0 mt-0.5">{course.icon}</span>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-black text-white text-lg group-hover:text-rock-yellow transition-colors tracking-tight">
                                                    {course.title}
                                                </p>
                                                <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                                                    {course.tagline}
                                                </p>
                                                <p className="text-[11px] text-slate-600 mt-3 uppercase tracking-widest font-bold">
                                                    {course.lesson_type === "dynamic"
                                                        ? "Browse articles · certificate available"
                                                        : `${course.lesson_count} lessons · certificate available`}
                                                </p>
                                            </div>
                                            <span aria-hidden="true" className="text-slate-600 group-hover:text-rock-yellow transition-colors shrink-0 mt-1">→</span>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </section>
                    ))
                )}
            </main>

            <footer className="border-t border-white/5 py-8 text-center text-xs text-slate-600">
                School of Chat · powered by <span className="text-rock-yellow">Ollama</span>
            </footer>
        </div>
    );
}
