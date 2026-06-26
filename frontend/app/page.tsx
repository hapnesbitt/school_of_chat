import Link from "next/link";
import UserMenu from "@/components/UserMenu";
import { getCategories } from "@/lib/categories";
import type { Course } from "@/components/CourseCard";

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
    const [courses, categories] = await Promise.all([getCourses(), getCategories()]);
    const bySlug = Object.fromEntries(courses.map((c) => [c.slug, c]));

    // Compute a live course count for each category
    const categoriesWithCounts = categories.map((cat) => {
        const staticCount = cat.courseSlugs.filter((s) => bySlug[s]).length;
        const dynamicCount = cat.includeDynamic
            ? courses.filter((c) => c.lesson_type === "dynamic").length
            : 0;
        return { ...cat, count: staticCount + dynamicCount };
    });

    const backendDown = courses.length === 0;

    return (
        <div className="min-h-screen bg-rock-bg text-slate-200">
            <nav aria-label="Site navigation" className="border-b border-white/5 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span aria-hidden="true" className="text-2xl">🎸</span>
                    <span className="font-black text-white text-lg tracking-tight">School of Chat</span>
                </div>
                <div className="flex items-center gap-5">
                    <Link
                        href="/about"
                        className="text-sm font-bold text-slate-500 hover:text-rock-yellow uppercase tracking-widest transition-colors focus-visible:outline-none focus-visible:underline"
                    >
                        About
                    </Link>
                    <UserMenu />
                </div>
            </nav>

            {/* Hero */}
            <div className="px-6 pt-24 pb-16 max-w-3xl mx-auto text-center">
                <div aria-hidden="true" className="text-6xl mb-6">🎸</div>
                <h1 className="text-5xl sm:text-6xl font-black text-white mb-5 leading-tight tracking-tighter">
                    School of <span className="text-rock-yellow">Chat</span>
                </h1>
                <p className="text-xl text-slate-400 mb-3 leading-relaxed">
                    Typed answers. Real AI. Actual grading.
                </p>
                <p className="text-slate-500 max-w-xl mx-auto leading-relaxed">
                    Practice for the compliance training your employer requires.
                    Prep for the certifications you actually want.
                    No multiple choice. No slides. Just you and a blank text box.
                </p>
            </div>

            {/* Category grid */}
            <main className="px-6 pb-28 max-w-3xl mx-auto" aria-label="Course categories">

                {backendDown ? (
                    <div role="status" className="rounded-xl border border-white/10 bg-rock-card p-8 text-center text-slate-500">
                        Backend not responding. Run{" "}
                        <code className="text-rock-yellow font-mono text-sm">./claude_stack.sh start gunicorn</code>
                    </div>
                ) : (
                    <div className="grid sm:grid-cols-2 gap-4">
                        {categoriesWithCounts.map((cat) => (
                            cat.comingSoon ? (
                                <div
                                    key={cat.slug}
                                    className="rounded-xl border border-white/5 bg-rock-card/50 p-7 opacity-50 cursor-default select-none"
                                    aria-label={`${cat.label} — coming soon`}
                                >
                                    <div className="flex items-start justify-between gap-4 mb-4">
                                        <span aria-hidden="true" className="text-3xl">{cat.icon}</span>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 border border-white/10 rounded-full px-2 py-0.5 shrink-0 mt-1">
                                            Coming soon
                                        </span>
                                    </div>
                                    <p className="font-black text-slate-400 text-lg tracking-tight mb-1">{cat.label}</p>
                                    <p className="text-sm text-slate-600 leading-relaxed">{cat.tagline}</p>
                                </div>
                            ) : (
                                <Link
                                    key={cat.slug}
                                    href={`/category/${cat.slug}`}
                                    className="group block rounded-xl border border-white/10 bg-rock-card
                                               hover:border-rock-yellow/30 hover:bg-[#161616] transition-all p-7
                                               focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rock-yellow"
                                >
                                    <div className="flex items-start justify-between gap-4 mb-4">
                                        <span aria-hidden="true" className="text-3xl">{cat.icon}</span>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 mt-1.5 shrink-0">
                                            {cat.count} {cat.count === 1 ? "course" : "courses"}
                                        </span>
                                    </div>
                                    <p className="font-black text-white text-lg group-hover:text-rock-yellow transition-colors tracking-tight mb-1.5">
                                        {cat.label}
                                    </p>
                                    <p className="text-sm text-slate-500 leading-relaxed">
                                        {cat.tagline}
                                    </p>
                                    <p className="mt-5 text-xs font-black uppercase tracking-widest text-slate-700 group-hover:text-rock-yellow/60 transition-colors">
                                        Browse courses →
                                    </p>
                                </Link>
                            )
                        ))}
                    </div>
                )}
            </main>

            <footer className="border-t border-white/5 py-8 text-center text-xs text-slate-600">
                School of Chat · powered by <span className="text-rock-yellow">Ollama</span>
                <span aria-hidden="true" className="mx-3">·</span>
                <Link href="/about" className="hover:text-slate-400 transition-colors focus-visible:outline-none focus-visible:text-rock-yellow">
                    About
                </Link>
                <span aria-hidden="true" className="mx-3">·</span>
                <Link href="/about/privacy" className="hover:text-slate-400 transition-colors focus-visible:outline-none focus-visible:text-rock-yellow">
                    Privacy
                </Link>
                <span aria-hidden="true" className="mx-3">·</span>
                <Link href="/about/terms" className="hover:text-slate-400 transition-colors focus-visible:outline-none focus-visible:text-rock-yellow">
                    Terms
                </Link>
                <span aria-hidden="true" className="mx-3">·</span>
                <a
                    href="https://arc-codex.com"
                    className="inline-flex items-center gap-1 hover:text-slate-400 transition-colors focus-visible:outline-none focus-visible:text-rock-yellow"
                    aria-label="Arc Codex — cybersecurity intelligence"
                >
                    <span aria-hidden="true">📰</span>
                    Arc Codex
                </a>
            </footer>
        </div>
    );
}
