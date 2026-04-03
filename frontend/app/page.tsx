import Link from "next/link";
import UserMenu from "@/components/UserMenu";

interface Lesson {
    slug: string;
    number: number;
    title: string;
    tagline: string;
    difficulty: string;
}

async function getLessons(): Promise<Lesson[]> {
    const url = `${process.env.BACKEND_INTERNAL_URL ?? "http://localhost:5007"}/api/lessons`;
    try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) return [];
        return res.json();
    } catch {
        return [];
    }
}

const DIFF_STYLE: Record<string, string> = {
    beginner:     "text-rock-green border-rock-green/30 bg-rock-green/10",
    intermediate: "text-rock-yellow border-rock-yellow/30 bg-rock-yellow/10",
    advanced:     "text-rock-orange border-rock-orange/30 bg-rock-orange/10",
};

export default async function HomePage() {
    const lessons = await getLessons();

    return (
        <div className="min-h-screen bg-rock-bg text-slate-200">
            {/* ── Nav ─────────────────────────────────────────────────── */}
            <nav className="border-b border-white/5 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className="text-2xl">🎸</span>
                    <span className="font-black text-white text-lg tracking-tight">School of Chat</span>
                </div>
                <UserMenu />
            </nav>

            {/* ── Hero ────────────────────────────────────────────────── */}
            <div className="px-6 pt-20 pb-12 max-w-3xl mx-auto text-center">
                <div className="text-6xl mb-6">🎸</div>
                <h1 className="text-5xl sm:text-6xl font-black text-white mb-4 leading-tight tracking-tighter">
                    School of{" "}
                    <span className="text-rock-yellow">Chat</span>
                </h1>
                <p className="text-xl text-slate-400 mb-2">
                    Learn prompt engineering by actually doing it.
                </p>
                <p className="text-slate-500">
                    No multiple choice. No theory slides. Just you, a text box,<br/>
                    and an AI that doesn&apos;t grade on a curve.
                </p>
            </div>

            {/* ── Lessons ─────────────────────────────────────────────── */}
            <div className="px-6 pb-24 max-w-2xl mx-auto">
                <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-6">
                    The Curriculum
                </h2>

                {lessons.length === 0 ? (
                    <div className="rounded-xl border border-white/10 bg-rock-card p-8 text-center text-slate-500">
                        Backend not responding. Run{" "}
                        <code className="text-rock-yellow font-mono text-sm">./claude_stack.sh start gunicorn</code>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {lessons.map((lesson) => (
                            <Link
                                key={lesson.slug}
                                href={`/lesson/${lesson.slug}`}
                                className="group block rounded-xl border border-white/10 bg-rock-card
                                           hover:border-rock-yellow/30 hover:bg-[#161616] transition-all p-5"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <span className="text-2xl font-black text-white/20 group-hover:text-rock-yellow/40 transition-colors tabular-nums w-8">
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
                        ))}
                    </div>
                )}
            </div>

            {/* ── Footer ──────────────────────────────────────────────── */}
            <footer className="border-t border-white/5 py-8 text-center text-xs text-slate-600">
                School of Chat · powered by{" "}
                <span className="text-rock-yellow">Claude</span>
            </footer>
        </div>
    );
}
