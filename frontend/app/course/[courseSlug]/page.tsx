import { notFound } from "next/navigation";
import Link from "next/link";
import UserMenu from "@/components/UserMenu";
import CourseCertificateBanner from "@/components/CourseCertificateBanner";
import PlantBadgesClient from "@/components/PlantBadgesClient";

interface LessonSummary {
    slug: string;
    number: number;
    title: string;
    tagline: string;
    difficulty: string;
    lesson_type: string;
}

interface Sponsor {
    name: string;
    url?: string;
    tagline?: string;
    reward_fine_print?: string;
}

interface DynamicConfig {
    how_it_works: string;
    header_label: string;
    fetch_path: string;
    cta_label: string;
}

interface Course {
    slug: string;
    title: string;
    tagline: string;
    description: string;
    icon: string;
    lesson_type: string;
    article_source?: string;
    dynamic?: DynamicConfig | null;
    sponsor?: Sponsor | null;
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
    common?: string;
    latin?: string;
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

// One config-driven fetcher: every dynamic course's article list comes from the
// `fetch_path` in its registry record (served by /api/course). Replaces the
// per-course getFinance/getAI/getReligion/getHuntaegis/getArticles clones.
async function getDynamic(path: string): Promise<ArticleSummary[]> {
    const url = `${process.env.BACKEND_INTERNAL_URL ?? "http://localhost:5007"}${path}`;
    try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) return [];
        return res.json();
    } catch {
        return [];
    }
}

// Plant-badge is the one genuinely divergent dynamic course (catalog source,
// coupon, common/latin rendering, per-plant badge) — it keeps its own fetch.
async function getPlants(): Promise<ArticleSummary[]> {
    return getDynamic("/api/dynamic/plants");
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

function SponsorPill({ sponsor }: { sponsor: Sponsor }) {
    const inner = (
        <>
            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-black">Hosted by</span>
            <span className="text-rock-yellow font-black">{sponsor.name}</span>
            {sponsor.tagline && <span className="text-slate-500 text-xs">· {sponsor.tagline}</span>}
        </>
    );
    return sponsor.url ? (
        <a
            href={sponsor.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-rock-yellow/20 bg-rock-yellow/5
                       px-3 py-1.5 hover:border-rock-yellow/40 hover:bg-rock-yellow/10 transition-colors
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rock-yellow"
        >
            {inner}
        </a>
    ) : (
        <span className="inline-flex items-center gap-2 rounded-full border border-rock-yellow/20 bg-rock-yellow/5 px-3 py-1.5">
            {inner}
        </span>
    );
}

// Shared "How this works" callout — copy comes from the course's registry record.
function HowThisWorks({ text }: { text: string }) {
    return (
        <div className="rounded-xl border border-rock-yellow/20 bg-rock-yellow/5 px-5 py-4 mb-8">
            <p className="text-xs text-rock-yellow font-black uppercase tracking-widest mb-1">How this works</p>
            <p className="text-sm text-slate-400 leading-relaxed">{text}</p>
        </div>
    );
}

function FeedLoadError() {
    return (
        <div className="rounded-xl border border-white/10 bg-rock-card p-8 text-center">
            <p className="text-slate-500 text-sm">Could not load articles from Arc Codex. Check back soon.</p>
        </div>
    );
}

// Config-driven content for every dynamic course EXCEPT plant-badge. All the
// per-course variation (how_it_works, header_label, fetch_path, cta_label) is
// read off course.dynamic — the registry record — so a new course needs no code.
async function GenericDynamicContent({ course }: { course: Course }) {
    const cfg        = course.dynamic;
    const fetchPath  = cfg?.fetch_path  ?? "/api/dynamic/articles";
    const headerLbl  = cfg?.header_label ?? "Live articles";
    const ctaLabel   = cfg?.cta_label   ?? "Read & Test →";
    const howItWorks = cfg?.how_it_works ?? "Select any article below to read it. Once you're done, Ollama generates 5 comprehension questions from the article's content. Answer them, get graded, and pass 3 at 70%+ to earn your certificate.";

    const articles = await getDynamic(fetchPath);
    if (!articles || articles.length === 0) return <FeedLoadError />;

    return (
        <>
            <HowThisWorks text={howItWorks} />

            <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-5">
                {`${headerLbl} · ${articles.length} ${articles.length === 1 ? "article" : "articles"}`}
            </h2>

            <div className="space-y-3">
                {articles.map((article) => (
                    <Link
                        key={article.id}
                        href={`/course/${course.slug}/article/${article.id}`}
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
                                {ctaLabel}
                            </span>
                        </div>
                    </Link>
                ))}
            </div>
        </>
    );
}

// Plant-badge escape hatch — the one genuinely divergent dynamic course: catalog
// source, coupon strip, earned-badge loop, common/latin rendering, per-plant CTA.
async function PlantBadgeContent({ course }: { course: Course }) {
    const articles = await getPlants();
    if (!articles || articles.length === 0) return <FeedLoadError />;

    return (
        <>
            {course.sponsor?.reward_fine_print && (
                <div
                    role="img"
                    aria-label={`Coupon — ${course.sponsor.reward_fine_print}`}
                    className="rounded-xl border-2 border-dashed border-rock-yellow bg-rock-yellow/10 px-5 py-4 mb-4 flex items-center gap-4"
                >
                    <span aria-hidden="true" className="text-3xl shrink-0">🎟️</span>
                    <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-widest text-rock-yellow/80 mb-0.5">
                            Earn this coupon
                        </p>
                        <p className="text-base font-black text-white tracking-tight leading-snug">
                            {course.sponsor.reward_fine_print}
                        </p>
                    </div>
                </div>
            )}

            <HowThisWorks text={course.dynamic?.how_it_works ?? "Pick a plant from the catalog and read its Arc Codex article. Answer five typed questions. Pass at 70%+ and you earn a Plant Merit Badge for that specific plant, with your name on it."} />

            <PlantBadgesClient
                backendUrl={process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:5007"}
                courseSlug={course.slug}
            />

            <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-5">
                {`Plant catalog · ${articles.length} plants`}
            </h2>

            <div className="space-y-3">
                {articles.map((article) => (
                    <Link
                        key={article.id}
                        href={`/course/${course.slug}/article/${article.id}`}
                        className="group block rounded-xl border border-white/10 bg-rock-card
                                   hover:border-rock-yellow/30 hover:bg-[#161616] transition-all p-5
                                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rock-yellow"
                    >
                        <div className="flex items-start justify-between gap-4 mb-2">
                            <p className="font-bold text-white group-hover:text-rock-yellow transition-colors leading-snug flex-1">
                                {article.common ? (
                                    <>
                                        <span>{article.common}</span>
                                        {article.latin && (
                                            <span className="font-normal italic text-slate-500 ml-2">{article.latin}</span>
                                        )}
                                    </>
                                ) : (
                                    article.title
                                )}
                            </p>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 text-[11px] text-slate-600">
                                {article.source && <span>{article.source}</span>}
                            </div>
                            <span aria-hidden="true" className="text-slate-600 group-hover:text-rock-yellow transition-colors text-xs font-bold shrink-0">
                                Earn Badge →
                            </span>
                        </div>
                    </Link>
                ))}
            </div>
        </>
    );
}

async function DynamicCourseContent({ course }: { course: Course }) {
    if (course.slug === "plant-badge") {
        return <PlantBadgeContent course={course} />;
    }
    return <GenericDynamicContent course={course} />;
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
    const isPlantBadge = course.slug === "plant-badge";

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
                    <p className="text-slate-400 leading-relaxed mb-4">{course.description}</p>
                    {course.sponsor && (
                        <div className="mt-3">
                            <SponsorPill sponsor={course.sponsor} />
                        </div>
                    )}
                </div>

                {/* Plant badge uses per-article badges (no count≥3 cert banner).
                    All other dynamic courses use the existing certificate flow. */}
                {!isPlantBadge && <CourseCertificateBanner backendUrl={backendUrl} courseSlug={course.slug} />}

                {/* Content: article browser or lesson list */}
                {isDynamic ? (
                    <DynamicCourseContent course={course} />
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
