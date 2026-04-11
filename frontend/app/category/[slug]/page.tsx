import { notFound } from "next/navigation";
import Link from "next/link";
import UserMenu from "@/components/UserMenu";
import CourseCard from "@/components/CourseCard";
import type { Course } from "@/components/CourseCard";
import { getCategoryBySlug, CATEGORIES } from "@/lib/categories";

interface Props {
    params: Promise<{ slug: string }>;
}

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

// Let Next.js pre-render known slugs at build time
export function generateStaticParams() {
    return CATEGORIES.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props) {
    const { slug } = await params;
    const cat = getCategoryBySlug(slug);
    if (!cat) return {};
    return {
        title: `${cat.label} — School of Chat`,
        description: cat.description,
    };
}

export default async function CategoryPage({ params }: Props) {
    const { slug } = await params;
    const cat = getCategoryBySlug(slug);
    if (!cat) notFound();

    const allCourses = await getCourses();
    const bySlug = Object.fromEntries(allCourses.map((c) => [c.slug, c]));

    const courses: Course[] = [
        ...cat.courseSlugs.map((s) => bySlug[s]).filter(Boolean),
        ...(cat.includeDynamic
            ? allCourses.filter((c) => c.lesson_type === "dynamic")
            : []),
    ];

    return (
        <div className="min-h-screen bg-rock-bg text-slate-200">
            <nav aria-label="Site navigation" className="border-b border-white/5 px-6 py-4 flex items-center justify-between">
                <Link
                    href="/"
                    className="flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rock-yellow rounded"
                >
                    <span aria-hidden="true" className="text-2xl">🎸</span>
                    <span className="font-black text-white text-lg tracking-tight">School of Chat</span>
                </Link>
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

            <main className="px-6 pt-14 pb-24 max-w-2xl mx-auto">

                {/* Breadcrumb */}
                <nav aria-label="Breadcrumb" className="mb-10">
                    <Link
                        href="/"
                        className="text-xs font-black uppercase tracking-widest text-slate-600
                                   hover:text-rock-yellow transition-colors
                                   focus-visible:outline-none focus-visible:underline"
                    >
                        ← All Categories
                    </Link>
                </nav>

                {/* Header */}
                <header className="mb-10">
                    <div aria-hidden="true" className="text-4xl mb-4">{cat.icon}</div>
                    <h1 className="text-4xl sm:text-5xl font-black text-white mb-4 leading-tight tracking-tighter">
                        {cat.label}
                    </h1>
                    <p className="text-slate-400 leading-relaxed max-w-prose">
                        {cat.description}
                    </p>
                </header>

                {/* Course list */}
                {cat.comingSoon ? (
                    <div className="rounded-xl border border-white/10 bg-rock-card p-10 text-center">
                        <p className="text-slate-500 mb-2">No courses yet.</p>
                        <p className="text-xs text-slate-600 uppercase tracking-widest font-black">Coming soon</p>
                    </div>
                ) : courses.length === 0 ? (
                    <div role="status" className="rounded-xl border border-white/10 bg-rock-card p-8 text-center text-slate-500">
                        Backend not responding. Run{" "}
                        <code className="text-rock-yellow font-mono text-sm">./claude_stack.sh start gunicorn</code>
                    </div>
                ) : (
                    <div className="space-y-3" aria-label={`${cat.label} courses`}>
                        {cat.includeDynamic && (
                            <p className="text-[11px] text-slate-600 uppercase tracking-widest font-black mb-4">
                                Requires cloud AI · may be slower when cloud model is unavailable
                            </p>
                        )}
                        {courses.map((course) => (
                            <CourseCard key={course.slug} course={course} />
                        ))}
                    </div>
                )}

            </main>

            <footer className="border-t border-white/5 py-8 text-center text-xs text-slate-600">
                School of Chat · powered by <span className="text-rock-yellow">Ollama</span>
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
