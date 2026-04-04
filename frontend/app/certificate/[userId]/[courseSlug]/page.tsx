import { notFound } from "next/navigation";
import Link from "next/link";
import PrintButton from "@/components/PrintButton";
import { auth } from "@/lib/auth";

interface PassedLesson {
    slug: string;
    title: string;
    score: number;
    max: number;
    pct: number;
}

interface CertificateData {
    eligible: boolean;
    user_id?: string;
    course_slug: string;
    course_title: string;
    name?: string;
    issued_at?: string;
    passed?: PassedLesson[];
    passed_count: number;
    needed?: number;
}

async function getCertificate(userId: string, courseSlug: string): Promise<CertificateData> {
    const url = `${process.env.BACKEND_INTERNAL_URL ?? "http://localhost:5007"}/api/certificate/${userId}/${courseSlug}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) notFound();
    return res.json();
}

export default async function CertificatePage({
    params,
}: {
    params: Promise<{ userId: string; courseSlug: string }>;
}) {
    const { userId, courseSlug } = await params;
    const [cert, session] = await Promise.all([getCertificate(userId, courseSlug), auth()]);

    // Use live session name when viewer is the owner; fall back to Redis-cached name.
    const sessionName = session?.user?.id === userId ? (session.user.name ?? "") : "";

    if (sessionName && cert.eligible) {
        const backendUrl = process.env.BACKEND_INTERNAL_URL ?? "http://localhost:5007";
        fetch(`${backendUrl}/api/user/name/${userId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: sessionName }),
        }).catch(() => {});
    }

    if (!cert.eligible) {
        return (
            <div className="min-h-screen bg-rock-bg flex items-center justify-center px-6">
                <div className="max-w-md w-full text-center">
                    <div className="text-5xl mb-6">📋</div>
                    <h1 className="text-2xl font-black text-white mb-3">Not quite yet</h1>
                    <p className="text-slate-400 mb-1">
                        <span className="font-bold text-white">{cert.course_title}</span>
                    </p>
                    <p className="text-slate-400 mb-2">
                        You&apos;ve passed{" "}
                        <span className="text-rock-yellow font-bold">{cert.passed_count}</span>{" "}
                        lesson{cert.passed_count !== 1 ? "s" : ""} with 70+.
                    </p>
                    <p className="text-slate-500 mb-8">
                        Complete {(cert.needed ?? 3) - cert.passed_count} more to earn this certificate.
                    </p>
                    <Link
                        href={`/course/${courseSlug}`}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm
                                   bg-rock-yellow text-black hover:bg-amber-400 transition-all"
                    >
                        Back to course
                    </Link>
                </div>
            </div>
        );
    }

    const displayName = sessionName || cert.name || "Prompt Engineer";
    const [year, month, day] = (cert.issued_at ?? "").split("-");
    const dateStr = new Date(Number(year), Number(month) - 1, Number(day))
        .toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

    return (
        <div className="min-h-screen bg-rock-bg flex flex-col items-center justify-center px-6 py-16">
            <div className="w-full max-w-2xl">
                <div className="relative rounded-2xl border-2 border-rock-yellow/40 bg-[#0d0d0d] shadow-2xl overflow-hidden">
                    <div className="h-1.5 w-full bg-gradient-to-r from-rock-yellow via-rock-orange to-rock-red" />

                    <div className="px-10 py-12 text-center">
                        <div className="text-4xl mb-3">🎸</div>
                        <p className="text-xs font-black uppercase tracking-[0.3em] text-rock-yellow/70 mb-1">
                            School of Chat
                        </p>
                        <p className="text-[10px] uppercase tracking-widest text-slate-600 mb-10">
                            Certificate of Achievement
                        </p>

                        <p className="text-slate-400 text-sm mb-3">This certifies that</p>
                        <h1 className="text-4xl sm:text-5xl font-black text-white mb-3 tracking-tight">
                            {displayName}
                        </h1>
                        <p className="text-slate-400 text-sm mb-1">
                            has completed{" "}
                            <span className="text-rock-yellow font-bold">{cert.passed_count} lessons</span> in
                        </p>
                        <p className="text-xl font-black text-white mb-10">{cert.course_title}</p>

                        <div className="border border-white/10 rounded-xl p-5 mb-10 text-left space-y-3">
                            {(cert.passed ?? []).map((lesson) => (
                                <div key={lesson.slug} className="flex items-center justify-between">
                                    <span className="text-sm text-slate-300">{lesson.title}</span>
                                    <span className={`text-sm font-black tabular-nums ${
                                        lesson.pct >= 90 ? "text-rock-green" :
                                        lesson.pct >= 70 ? "text-rock-yellow" :
                                        "text-slate-400"
                                    }`}>
                                        {lesson.pct}%
                                    </span>
                                </div>
                            ))}
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="text-left">
                                <p className="text-[10px] uppercase tracking-widest text-slate-600 mb-1">Issued</p>
                                <p className="text-sm font-bold text-slate-300">{dateStr}</p>
                            </div>
                            <div className="h-16 w-16 rounded-full border-2 border-rock-yellow/40 flex items-center justify-center">
                                <span className="text-2xl">⚡</span>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] uppercase tracking-widest text-slate-600 mb-1">Verified by</p>
                                <p className="text-sm font-bold text-slate-300">Ollama</p>
                            </div>
                        </div>
                    </div>

                    <div className="h-1.5 w-full bg-gradient-to-r from-rock-red via-rock-orange to-rock-yellow" />
                </div>

                <div className="flex items-center justify-center gap-4 mt-8">
                    <Link href={`/course/${courseSlug}`} className="text-sm text-slate-500 hover:text-slate-300 transition-colors">
                        ← Back to course
                    </Link>
                    <span className="text-white/10">|</span>
                    <PrintButton />
                </div>
            </div>
        </div>
    );
}
