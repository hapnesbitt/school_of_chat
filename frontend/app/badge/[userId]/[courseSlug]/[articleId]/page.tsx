import { notFound } from "next/navigation";
import Link from "next/link";
import PrintButton from "@/components/PrintButton";
import { auth } from "@/lib/auth";

interface Sponsor {
    name: string;
    url?: string;
    tagline?: string;
    reward_fine_print?: string;
}

interface BadgeData {
    eligible: boolean;
    user_id?: string;
    course_slug: string;
    course_title: string;
    article_id: string;
    article_title?: string;
    score?: number;
    pct?: number;
    name?: string;
    issued_at?: string;
    sponsor?: Sponsor | null;
    common?: string;
    latin?: string;
}

async function getBadge(userId: string, courseSlug: string, articleId: string): Promise<BadgeData> {
    const url = `${process.env.BACKEND_INTERNAL_URL ?? "http://localhost:5007"}/api/badge/${userId}/${courseSlug}/${articleId}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) notFound();
    return res.json();
}

export default async function BadgePage({
    params,
}: {
    params: Promise<{ userId: string; courseSlug: string; articleId: string }>;
}) {
    const { userId, courseSlug, articleId } = await params;
    const [badge, session] = await Promise.all([getBadge(userId, courseSlug, articleId), auth()]);

    // Live name when viewer is the owner; cache it back so non-owner viewers also see it.
    const sessionName = session?.user?.id === userId ? (session.user.name ?? "") : "";
    if (sessionName && badge.eligible) {
        const backendUrl = process.env.BACKEND_INTERNAL_URL ?? "http://localhost:5007";
        fetch(`${backendUrl}/api/user/name/${userId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: sessionName }),
        }).catch(() => {});
    }

    // Per-course visual + label config. Plant-badge keeps its botanical
    // styling and "Plant Merit Badge" header; every other dynamic course
    // gets a neutral label derived from the course title returned by the API.
    const isPlantBadge = courseSlug === "plant-badge";
    const headerIcon   = isPlantBadge ? "🌱" : (badge.course_slug === "cyber-security-daily" ? "🛡️" : "🎓");
    const headerLabel  = isPlantBadge ? "Plant Merit Badge" : (badge.course_title || "Comprehension Badge");
    const fallbackName = isPlantBadge ? "Plant Apprentice" : "Scholar";
    const courseLabel  = badge.course_title || "this course";
    const backLabel    = isPlantBadge ? "Back to plant catalog" : `Back to ${courseLabel}`;

    if (!badge.eligible) {
        return (
            <div className="min-h-screen bg-rock-bg flex items-center justify-center px-6">
                <main className="max-w-md w-full text-center">
                    <div aria-hidden="true" className="text-5xl mb-6">{headerIcon}</div>
                    <h1 className="text-2xl font-black text-white mb-3">Not earned yet</h1>
                    <p className="text-slate-400 mb-2">
                        {isPlantBadge
                            ? <>This Plant Merit Badge isn&apos;t in the bag yet — pass this plant&apos;s quiz at 70%+ to earn it.</>
                            : <>This badge isn&apos;t earned yet — pass this article&apos;s quiz at 70%+ to earn it.</>}
                    </p>
                    <Link
                        href={`/course/${courseSlug}`}
                        className="inline-flex items-center gap-2 px-5 py-2.5 mt-6 rounded-lg font-bold text-sm
                                   bg-rock-yellow text-black hover:bg-amber-400 transition-all
                                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rock-yellow"
                    >
                        {backLabel}
                    </Link>
                </main>
            </div>
        );
    }

    const displayName = sessionName || badge.name || fallbackName;
    const [y, m, d] = (badge.issued_at ?? "").split("-");
    const dateStr   = y && m && d
        ? new Date(Number(y), Number(m) - 1, Number(d))
            .toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
        : "";
    // Plant badge uses the botanical common/latin display; every other
    // course shows the article title.
    const plantCommon = badge.common ?? badge.article_title ?? "Plant";
    const plantLatin  = badge.latin ?? "";
    const subjectTitle = isPlantBadge ? plantCommon : (badge.article_title || courseLabel);

    return (
        <div className="min-h-screen bg-rock-bg flex flex-col items-center justify-center px-6 py-16">
            <main className="w-full max-w-2xl">
                <article aria-label={`${headerLabel} — ${subjectTitle} — for ${displayName}`}>
                    <div className="relative rounded-2xl border-2 border-rock-green/40 bg-[#0d0d0d] shadow-2xl overflow-hidden">
                        <div aria-hidden="true" className="h-1.5 w-full bg-gradient-to-r from-rock-green via-rock-yellow to-rock-green" />

                        <div className="px-10 py-12 text-center">
                            <div aria-hidden="true" className="text-5xl mb-3">{headerIcon}</div>
                            <p className="text-xs font-black uppercase tracking-[0.3em] text-rock-green/80 mb-1">
                                School of Chat
                            </p>
                            <p className="text-[10px] uppercase tracking-widest text-slate-600 mb-10">
                                {headerLabel}
                            </p>

                            <p className="text-slate-400 text-sm mb-3">Awarded to</p>
                            <h1 className="text-4xl sm:text-5xl font-black text-white mb-6 tracking-tight">
                                {displayName}
                            </h1>

                            <p className="text-slate-400 text-sm mb-1">for demonstrating comprehension of</p>
                            <p className="text-2xl sm:text-3xl font-black text-rock-yellow mb-1">{subjectTitle}</p>
                            {isPlantBadge && plantLatin && (
                                <p className="text-sm italic text-slate-400 mb-8">{plantLatin}</p>
                            )}

                            <div className="border border-white/10 rounded-xl p-5 mb-10 flex items-center justify-between">
                                <div className="text-left">
                                    <p className="text-[10px] uppercase tracking-widest text-slate-600 mb-1">Passed at</p>
                                    <p className="text-sm font-black tabular-nums">
                                        <span className={
                                            (badge.pct ?? 0) >= 90 ? "text-rock-green" :
                                            (badge.pct ?? 0) >= 70 ? "text-rock-yellow" :
                                            "text-slate-400"
                                        }>
                                            {badge.pct}%
                                        </span>
                                        <span className="text-slate-500 text-xs ml-2">({badge.score}/100)</span>
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] uppercase tracking-widest text-slate-600 mb-1">Issued</p>
                                    <p className="text-sm font-bold text-slate-300">
                                        <time dateTime={badge.issued_at}>{dateStr}</time>
                                    </p>
                                </div>
                            </div>

                            {isPlantBadge && badge.sponsor?.reward_fine_print && (
                                <div
                                    role="img"
                                    aria-label={`Coupon — ${badge.sponsor.reward_fine_print}`}
                                    className="rounded-xl border-2 border-dashed border-rock-yellow bg-rock-yellow/10 px-5 py-4 mb-6 text-center"
                                >
                                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-rock-yellow/80 mb-1">
                                        🎟️ Coupon — show this at checkout
                                    </p>
                                    <p className="text-lg sm:text-xl font-black text-white tracking-tight leading-snug">
                                        {badge.sponsor.reward_fine_print}
                                    </p>
                                </div>
                            )}

                            {badge.sponsor && (
                                <div className="border-t border-white/10 pt-6 mt-2">
                                    <p className="text-[10px] uppercase tracking-widest text-slate-600 mb-2">Sponsored by</p>
                                    {badge.sponsor.url ? (
                                        <a
                                            href={badge.sponsor.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-lg font-black text-rock-yellow hover:text-amber-300 transition-colors
                                                       focus-visible:outline-none focus-visible:underline"
                                        >
                                            {badge.sponsor.name}
                                        </a>
                                    ) : (
                                        <p className="text-lg font-black text-rock-yellow">{badge.sponsor.name}</p>
                                    )}
                                    {badge.sponsor.tagline && (
                                        <p className="text-xs text-slate-500 mt-1">{badge.sponsor.tagline}</p>
                                    )}
                                    {/* reward_fine_print is rendered prominently in the
                                        coupon strip above; not repeated here. */}
                                </div>
                            )}
                        </div>

                        <div aria-hidden="true" className="h-1.5 w-full bg-gradient-to-r from-rock-green via-rock-yellow to-rock-green" />
                    </div>
                </article>

                <div className="flex items-center justify-center gap-4 mt-8">
                    <Link
                        href={`/course/${courseSlug}`}
                        className="text-sm text-slate-500 hover:text-slate-300 transition-colors
                                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rock-yellow rounded"
                    >
                        ← {backLabel}
                    </Link>
                    <span aria-hidden="true" className="text-white/10">|</span>
                    <PrintButton />
                </div>
            </main>
        </div>
    );
}
