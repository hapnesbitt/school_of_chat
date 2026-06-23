import Link from "next/link";
import UserMenu from "@/components/UserMenu";
import CourseCard from "@/components/CourseCard";
import type { Course } from "@/components/CourseCard";

// Custom override of the generic /category/[slug] template. Next.js routes
// pick the more-specific static segment, so this file owns get-certified
// without affecting any other category. The page is shaped for a sales-
// pitch demo to a store owner — the in-store loop (scan → quiz → coupon)
// is the visible payoff, with the standard course card below for the
// catalog.

// The demo plant the "Try the demo →" CTA targets. Agastache foeniculum —
// recognisable pollinator favourite, 618-word article, makes a strong
// five-question quiz.
const DEMO_PLANT_ID    = "438d88c46b1c4c761e3c68e99778a8d0";
const DEMO_PLANT_LABEL = "Agastache foeniculum";
const DEMO_PLANT_URL   = `https://soc.arc-codex.com/course/plant-badge/article/${DEMO_PLANT_ID}`;

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

export const metadata = {
    title: "Get Certified — Scan, quiz, earn a coupon · School of Chat",
    description:
        "An in-store engagement loop for nurseries: customers scan a tag above a plant, " +
        "take a five-question quiz on the actual plant, and earn a coupon to show at checkout. " +
        "Hosted by Plantorium.",
};

// Inline SVG that LOOKS like a QR code without being one. For the demo
// mockup only — not a scannable code. Keeps the page self-contained
// (no image asset hunt) and makes the shelf-tag concept obvious.
function FakeQR({ size = 96 }: { size?: number }) {
    const cells = 9;
    // Deterministic pattern so it looks the same on every render and across
    // SSR / hydration — not random.
    const filled = new Set([
        "0,0","0,1","0,2","1,0","1,2","2,0","2,1","2,2",         // top-left finder
        "0,6","0,7","0,8","1,6","1,8","2,6","2,7","2,8",         // top-right finder
        "6,0","6,1","6,2","7,0","7,2","8,0","8,1","8,2",         // bottom-left finder
        "3,3","3,5","4,4","5,3","5,5","4,6","6,4","5,7","7,5",   // scatter
        "3,1","4,2","2,4","5,1","7,3","6,6","3,7","7,7",
    ]);
    const cellSize = size / cells;
    const rects = [];
    for (let y = 0; y < cells; y++) {
        for (let x = 0; x < cells; x++) {
            if (filled.has(`${y},${x}`)) {
                rects.push(
                    <rect
                        key={`${y}-${x}`}
                        x={x * cellSize}
                        y={y * cellSize}
                        width={cellSize}
                        height={cellSize}
                        fill="#0d0d0d"
                    />
                );
            }
        }
    }
    return (
        <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            role="img"
            aria-label="Illustrative QR code (mockup — not scannable)"
            className="rounded-sm bg-white p-1"
        >
            {rects}
        </svg>
    );
}

export default async function GetCertifiedDemoPage() {
    const allCourses = await getCourses();
    const plantBadge = allCourses.find((c) => c.slug === "plant-badge");

    return (
        <div className="min-h-screen bg-rock-bg text-slate-200">
            {/* ── Top nav (mirrors every other category page) ───────────── */}
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

            <main className="px-6 pt-14 pb-24 max-w-3xl mx-auto">

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

                {/* ── HERO ─────────────────────────────────────────────── */}
                <header className="mb-12">
                    <div className="inline-flex items-center gap-2 rounded-full border border-rock-yellow/30 bg-rock-yellow/10 px-3 py-1 mb-5">
                        <span aria-hidden="true" className="text-xs">🤝</span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-rock-yellow">
                            Hosted by Plantorium · family-grown nursery
                        </span>
                    </div>
                    <div aria-hidden="true" className="text-5xl mb-4">🌱</div>
                    <h1 className="text-4xl sm:text-5xl font-black text-white mb-4 leading-tight tracking-tighter">
                        Plant a quiz.<br className="hidden sm:block" /> Reap a coupon.
                    </h1>
                    <p className="text-lg text-slate-400 leading-relaxed max-w-prose">
                        Turn the shelf above every plant into an engagement loop. Customers scan a tag,
                        take a five-question quiz on that actual plant, and walk to the counter with a
                        coupon they earned by paying attention. A fun reward — not a credential.
                    </p>
                </header>

                {/* ── 3-STEP IN-STORE FLOW ─────────────────────────────── */}
                <section aria-labelledby="how-instore-heading" className="mb-12">
                    <h2 id="how-instore-heading" className="text-xs font-black uppercase tracking-widest text-slate-500 mb-5">
                        How it works in the store
                    </h2>
                    <ol className="grid sm:grid-cols-3 gap-3 list-none">
                        <li className="rounded-xl border border-white/10 bg-rock-card p-5">
                            <div aria-hidden="true" className="text-3xl mb-3">📱</div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-rock-yellow mb-1">Step 1</p>
                            <p className="font-bold text-white leading-snug mb-1">Scan the tag</p>
                            <p className="text-sm text-slate-500 leading-relaxed">
                                Each plant has a printed tag above it with a QR code linking to its quiz.
                            </p>
                        </li>
                        <li className="rounded-xl border border-white/10 bg-rock-card p-5">
                            <div aria-hidden="true" className="text-3xl mb-3">📖</div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-rock-yellow mb-1">Step 2</p>
                            <p className="font-bold text-white leading-snug mb-1">Read &amp; take the quiz</p>
                            <p className="text-sm text-slate-500 leading-relaxed">
                                Five typed questions on that specific plant. The grader has the article —
                                guesses don&apos;t pass.
                            </p>
                        </li>
                        <li className="rounded-xl border border-white/10 bg-rock-card p-5">
                            <div aria-hidden="true" className="text-3xl mb-3">🎟️</div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-rock-yellow mb-1">Step 3</p>
                            <p className="font-bold text-white leading-snug mb-1">Earn the coupon</p>
                            <p className="text-sm text-slate-500 leading-relaxed">
                                Pass at 70%+ → earn a Plant Merit Badge with the coupon on it. Show it at checkout.
                            </p>
                        </li>
                    </ol>
                </section>

                {/* ── SHELF-TAG MOCKUP ─────────────────────────────────── */}
                <section aria-labelledby="shelf-tag-heading" className="mb-12">
                    <h2 id="shelf-tag-heading" className="text-xs font-black uppercase tracking-widest text-slate-500 mb-5">
                        What goes on the shelf
                    </h2>
                    <div className="rounded-2xl border-2 border-rock-green/40 bg-[#0d0d0d] p-6 sm:p-7">
                        <p className="text-[10px] font-black uppercase tracking-widest text-rock-green/80 mb-4">
                            Mockup — printed shelf tag, ~5×7&quot;
                        </p>
                        <div className="rounded-xl border border-white/10 bg-rock-bg/60 p-5 sm:p-6 flex flex-col sm:flex-row items-center gap-5">
                            <div className="shrink-0">
                                <FakeQR size={112} />
                            </div>
                            <div className="flex-1 min-w-0 text-center sm:text-left">
                                <p className="text-[10px] font-black uppercase tracking-widest text-rock-yellow mb-1">
                                    Plantorium · Scan to quiz
                                </p>
                                <p className="text-2xl font-black text-white mb-1 leading-tight tracking-tight">
                                    Agastache
                                </p>
                                <p className="text-sm italic text-slate-400 mb-3">{DEMO_PLANT_LABEL}</p>
                                <p className="text-xs text-slate-500 leading-relaxed mb-3">
                                    Take the 5-question quiz on this plant.<br />
                                    Pass at 70% to earn your coupon.
                                </p>
                                <code className="text-[10px] text-slate-600 font-mono break-all">
                                    {DEMO_PLANT_URL}
                                </code>
                            </div>
                        </div>
                        <p className="text-[11px] text-slate-600 italic mt-4 leading-relaxed">
                            Illustration only — the QR shown is decorative. Real shelf tags would print a
                            working QR pointing at each plant&apos;s quiz URL.
                        </p>
                    </div>
                </section>

                {/* ── TRY THE DEMO CTA ─────────────────────────────────── */}
                <section aria-labelledby="try-demo-heading" className="mb-12">
                    <h2 id="try-demo-heading" className="text-xs font-black uppercase tracking-widest text-slate-500 mb-5">
                        Try it yourself
                    </h2>
                    <a
                        href={DEMO_PLANT_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group block rounded-xl border-2 border-rock-yellow bg-rock-yellow/10
                                   hover:bg-rock-yellow/15 transition-all p-6 sm:p-7
                                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rock-yellow"
                        aria-label="Try the Agastache demo quiz (opens in a new tab)"
                    >
                        <div className="flex items-center justify-between gap-5">
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-black uppercase tracking-widest text-rock-yellow/80 mb-2">
                                    Live demo
                                </p>
                                <p className="text-xl font-black text-white mb-1 tracking-tight">
                                    Take the Agastache quiz →
                                </p>
                                <p className="text-sm text-slate-400 leading-relaxed">
                                    The exact page a customer lands on after scanning the tag.
                                    Read the article, answer five questions, see the badge + coupon.
                                </p>
                            </div>
                            <span aria-hidden="true" className="text-3xl text-rock-yellow group-hover:translate-x-1 transition-transform shrink-0">
                                →
                            </span>
                        </div>
                    </a>
                </section>

                {/* ── COUPON MOCKUP ────────────────────────────────────── */}
                <section aria-labelledby="coupon-heading" className="mb-12">
                    <h2 id="coupon-heading" className="text-xs font-black uppercase tracking-widest text-slate-500 mb-5">
                        What the customer earns
                    </h2>
                    <div
                        role="img"
                        aria-label="Coupon mockup — Buy two get one free"
                        className="relative rounded-2xl border-2 border-dashed border-rock-yellow bg-gradient-to-br from-rock-yellow/10 via-rock-yellow/5 to-transparent p-8 text-center overflow-hidden"
                    >
                        <div aria-hidden="true" className="absolute -top-2 -left-2 text-4xl rotate-12 select-none">🎟️</div>
                        <div aria-hidden="true" className="absolute -bottom-2 -right-2 text-4xl -rotate-12 select-none">🎟️</div>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-rock-yellow/80 mb-2">
                            Plantorium · Customer Coupon
                        </p>
                        <p className="text-3xl sm:text-4xl font-black text-white mb-2 tracking-tight">
                            Buy two, get one free
                        </p>
                        <p className="text-sm text-slate-400">
                            Show your Plant Merit Badge at checkout.
                        </p>
                    </div>
                </section>

                {/* ── STANDARD COURSE LIST ─────────────────────────────── */}
                <section aria-labelledby="catalog-heading">
                    <h2 id="catalog-heading" className="text-xs font-black uppercase tracking-widest text-slate-500 mb-5">
                        Browse all plant articles
                    </h2>
                    {plantBadge ? (
                        <CourseCard course={plantBadge} />
                    ) : (
                        <div role="status" className="rounded-xl border border-white/10 bg-rock-card p-8 text-center text-slate-500">
                            Backend not responding. Run{" "}
                            <code className="text-rock-yellow font-mono text-sm">./claude_stack.sh start gunicorn</code>
                        </div>
                    )}
                </section>

            </main>

            <footer className="border-t border-white/5 py-8 text-center text-xs text-slate-600">
                School of Chat · powered by <span className="text-rock-yellow">Ollama</span>
                <span aria-hidden="true" className="mx-3">·</span>
                <a
                    href="https://plantorium.arc-codex.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 hover:text-slate-400 transition-colors focus-visible:outline-none focus-visible:text-rock-yellow"
                    aria-label="Plantorium — family-grown nursery (opens in a new tab)"
                >
                    <span aria-hidden="true">🌱</span>
                    Plantorium
                </a>
                <span aria-hidden="true" className="mx-3">·</span>
                <a
                    href="https://arc-codex.com"
                    className="inline-flex items-center gap-1 hover:text-slate-400 transition-colors focus-visible:outline-none focus-visible:text-rock-yellow"
                    aria-label="Arc Codex"
                >
                    <span aria-hidden="true">📰</span>
                    Arc Codex
                </a>
            </footer>
        </div>
    );
}
