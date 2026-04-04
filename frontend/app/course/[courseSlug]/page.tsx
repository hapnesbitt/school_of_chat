import { notFound } from "next/navigation";
import Link from "next/link";
import UserMenu from "@/components/UserMenu";
import CourseCertificateBanner from "@/components/CourseCertificateBanner";

interface LessonSummary {
    slug: string;
    number: number;
    title: string;
    tagline: string;
    difficulty: string;
    lesson_type: string;
}

interface Course {
    slug: string;
    title: string;
    tagline: string;
    description: string;
    icon: string;
    lesson_type: string;
    lessons: LessonSummary[];
}

interface ArticleSummary {
    id: string;
    title: string;
    source: string;
    category: string;
    published_at: string;
    preview: string;
    word_count: number;
}

async function getCourse(slug: string): Promise<Course | null> {
    const url = `${process.env.BACKEND_INTERNAL_URL ?? "http://localhost:5007"}/api/course/${slug}`;
    try {
        const res = await fetch(url, { cache: "no-store" });
        if (res.status === 404) return null;
        if (!res.ok) return null;
        return res.json();
    } catch {
        return null;
    }
}

async function getArticles(): Promise<ArticleSummary[]> {
    const url = `${process.env.BACKEND_INTERNAL_URL ?? "http://localhost:5007"}/api/dynamic/articles`;
    try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) return [];
        return res.json();
    } catch {
        return [];
    }
}

const DIFF_STYLE: Record<string, string> = {
    beginner:     "text-rock-green  border-rock-green/30  bg-rock-green/10",
    intermediate: "text-rock-yellow border-rock-yellow/30 bg-rock-yellow/10",
    advanced:     "text-rock-orange border-rock-orange/30 bg-rock-orange/10",
};

// ---------------------------------------------------------------------------
// Dynamic course — article browser
// ---------------------------------------------------------------------------

function CategoryBadge({ category }: { category: string }) {
    if (!category) return null;
    return (
        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full
                         bg-rock-yellow/10 text-rock-yellow/80 border border-rock-yellow/20 shrink-0">
            {category}
        </span>
    );
}

async function DynamicCourseContent({ courseSlug }: { courseSlug: string }) {
    const articles = await getArticles();

    if (!articles || articles.length === 0) {
        return (
            <div className="rounded-xl border border-white/10 bg-rock-card p-8 text-center">
                <p className="text-slate-500 text-sm">Could not load articles from Arc Codex. Check back soon.</p>
            </div>
        );
    }

    return (
        <>
            <div className="rounded-xl border border-rock-yellow/20 bg-rock-yellow/5 px-5 py-4 mb-8">
                <p className="text-xs text-rock-yellow font-black uppercase tracking-widest mb-1">How this works</p>
                <p className="text-sm text-slate-400 leading-relaxed">
                    Select any article below to read it. Once you&apos;re done, Ollama generates 5 comprehension
                    questions from the article&apos;s content. Answer them, get graded, and pass 3 at 70%+ to earn
                    your certificate.
                </p>
            </div>

            <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-5">
                Live articles · {articles.length} available
            </h2>

            <div className="space-y-3">
                {articles.map((article) => (
                    <Link
                        key={article.id}
                        href={`/course/${courseSlug}/article/${article.id}`}
                        className="group block rounded-xl border border-white/10 bg-rock-card
                                   hover:border-rock-yellow/30 hover:bg-[#161616] transition-all p-5
                                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rock-yellow"
                    >
                        <div className="flex items-start justify-between gap-4 mb-2">
                            <p className="font-bold text-white group-hover:text-rock-yellow transition-colors leading-snug flex-1">
                                {article.title}
                            </p>
                            <CategoryBadge category={article.category} />
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed mb-3 line-clamp-2">
                            {article.preview}
                        </p>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 text-[11px] text-slate-600">
                                {article.source && <span>{article.source}</span>}
                                {article.published_at && (
                                    <>
                                        <span aria-hidden="true">·</span>
                                        <span>{article.published_at.slice(0, 10)}</span>
                                    </>
                                )}
                                {article.word_count > 0 && (
                                    <>
                                        <span aria-hidden="true">·</span>
                                        <span>{article.word_count} words</span>
                                    </>
                                )}
                            </div>
                            <span aria-hidden="true" className="text-slate-600 group-hover:text-rock-yellow transition-colors text-xs font-bold shrink-0">
                                Read & Test →
                            </span>
                        </div>
                    </Link>
                ))}
            </div>
        </>
    );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function CoursePage({ params }: { params: Promise<{ courseSlug: string }> }) {
    const { courseSlug } = await params;
    const course = await getCourse(courseSlug);
    if (!course) notFound();

    const backendUrl   = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:5007";
    const isDynamic    = course.lesson_type === "dynamic";

    return (
        <div className="min-h-screen bg-rock-bg text-slate-200">
            <nav aria-label="Site navigation" className="border-b border-white/5 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link
                        href="/"
                        className="text-slate-500 hover:text-white transition-colors text-sm
                                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rock-yellow rounded"
                    >
                        ← Courses
                    </Link>
                    <span aria-hidden="true" className="text-white/10">|</span>
                    <span aria-hidden="true" className="text-2xl">{course.icon}</span>
                    <span className="font-black text-white text-sm hidden sm:block">{course.title}</span>
                </div>
                <UserMenu />
            </nav>

            <main className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
                {/* Header */}
                <div className="mb-10">
                    <div aria-hidden="true" className="text-5xl mb-4">{course.icon}</div>
                    <h1 className="text-4xl font-black text-white mb-2 tracking-tighter">{course.title}</h1>
                    <p className="text-slate-400 leading-relaxed">{course.description}</p>
                </div>

                {/* Certificate banner */}
                <CourseCertificateBanner backendUrl={backendUrl} courseSlug={course.slug} />

                {/* Content: article browser or lesson list */}
                {isDynamic ? (
                    <DynamicCourseContent courseSlug={courseSlug} />
                ) : (
                    <>
                        <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-5">
                            Lessons
                        </h2>
                        <ol className="space-y-3 list-none">
                            {course.lessons.map((lesson) => (
                                <li key={lesson.slug}>
                                    <Link
                                        href={`/lesson/${lesson.slug}`}
                                        className="group block rounded-xl border border-white/10 bg-rock-card
                                                   hover:border-rock-yellow/30 hover:bg-[#161616] transition-all p-5
                                                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rock-yellow"
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex items-center gap-4">
                                                <span aria-hidden="true" className="text-2xl font-black text-white/20 group-hover:text-rock-yellow/40 transition-colors tabular-nums w-8 shrink-0">
                                                    {String(lesson.number).padStart(2, "0")}
                                                </span>
                                                <div>
                                                    <p className="font-bold text-white group-hover:text-rock-yellow transition-colors">
                                                        {lesson.title}
                                                    </p>
                                                    <p className="text-sm text-slate-500 mt-0.5">{lesson.tagline}</p>
                                                </div>
                                            </div>
                                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded border shrink-0 mt-0.5 ${DIFF_STYLE[lesson.difficulty] ?? DIFF_STYLE.beginner}`}>
                                                {lesson.difficulty}
                                            </span>
                                        </div>
                                    </Link>
                                </li>
                            ))}
                        </ol>
                    </>
                )}
            </main>

            <footer className="border-t border-white/5 py-8 text-center text-xs text-slate-600">
                School of Chat · <Link href="/" className="hover:text-slate-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rock-yellow rounded">All courses</Link>
            </footer>
        </div>
    );
}
