"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { ArrowLeft, Zap, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import UserMenu from "@/components/UserMenu";

interface RubricItem {
    criterion: string;
    points: number;
}

interface Lesson {
    slug: string;
    number: number;
    title: string;
    tagline: string;
    difficulty: string;
    challenge: string;
    instructions: string;
    rubric: RubricItem[];
}

interface GradeBreakdown {
    criterion: string;
    earned: number;
    max: number;
    comment: string;
}

interface GradeResult {
    total: number;
    max: number;
    breakdown: GradeBreakdown[];
    feedback: string;
}

interface RunResult {
    output: string;
    grade: GradeResult;
}

function ScoreRing({ score, max }: { score: number; max: number }) {
    const pct = max > 0 ? Math.round((score / max) * 100) : 0;
    const colour =
        pct >= 80 ? "text-rock-green" :
        pct >= 60 ? "text-rock-yellow" :
        pct >= 40 ? "text-rock-orange" :
        "text-rock-red";

    return (
        <div className="flex flex-col items-center">
            <div className={cn("text-5xl font-black tabular-nums", colour)}>{pct}</div>
            <div className="text-xs text-slate-500 mt-0.5">/ 100</div>
            <div className="text-xs text-slate-400 mt-1">{score} / {max} pts</div>
        </div>
    );
}

export default function LessonClient({ lesson, backendUrl }: { lesson: Lesson; backendUrl: string }) {
    const { data: session } = useSession();
    const [prompt, setPrompt] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<RunResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [showInstructions, setShowInstructions] = useState(false);

    const handleRun = async () => {
        if (!prompt.trim()) return;
        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const res = await fetch(`${backendUrl}/api/lesson/${lesson.slug}/run`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    prompt: prompt.trim(),
                    user_id: session?.user?.id ?? "anonymous",
                }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error ?? `HTTP ${res.status}`);
            }

            const data: RunResult = await res.json();
            setResult(data);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    const charsLeft = 2000 - prompt.length;

    return (
        <div className="min-h-screen bg-rock-bg text-slate-200">
            {/* ── Nav ─────────────────────────────────────────────────── */}
            <nav className="border-b border-white/5 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/" className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-sm">
                        <ArrowLeft className="h-4 w-4" />
                        Back
                    </Link>
                    <span className="text-white/10">|</span>
                    <span className="text-2xl">🎸</span>
                    <span className="font-black text-white text-sm hidden sm:block">School of Chat</span>
                </div>
                <UserMenu />
            </nav>

            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
                {/* ── Lesson Header ────────────────────────────────────── */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-3">
                        <span className="text-xs font-black uppercase tracking-widest text-rock-yellow/60">
                            Lesson {String(lesson.number).padStart(2, "0")}
                        </span>
                        <span className="text-white/10">·</span>
                        <span className="text-xs font-black uppercase tracking-widest text-slate-600">
                            {lesson.difficulty}
                        </span>
                    </div>
                    <h1 className="text-4xl font-black text-white mb-2 tracking-tighter">{lesson.title}</h1>
                    <p className="text-slate-400">{lesson.tagline}</p>
                </div>

                {/* ── Challenge ────────────────────────────────────────── */}
                <div className="rounded-xl border border-rock-yellow/20 bg-rock-yellow/5 p-5 mb-6">
                    <p className="text-xs font-black uppercase tracking-widest text-rock-yellow mb-2">Your Mission</p>
                    <p className="text-slate-200 leading-relaxed whitespace-pre-line">{lesson.challenge}</p>
                </div>

                {/* ── Instructions toggle ──────────────────────────────── */}
                <button
                    onClick={() => setShowInstructions(v => !v)}
                    className="text-xs font-bold text-slate-500 hover:text-slate-300 mb-4 transition-colors flex items-center gap-1.5"
                >
                    {showInstructions ? "▼" : "▶"} {showInstructions ? "Hide" : "Show"} hints
                </button>

                {showInstructions && (
                    <div className="rounded-xl border border-white/10 bg-rock-card p-5 mb-6 text-sm text-slate-400 whitespace-pre-line leading-relaxed">
                        {lesson.instructions}
                    </div>
                )}

                {/* ── Rubric preview ───────────────────────────────────── */}
                {lesson.rubric.length > 0 && (
                    <div className="rounded-xl border border-white/10 bg-rock-card p-5 mb-8">
                        <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3">Grading rubric</p>
                        <div className="space-y-1.5">
                            {lesson.rubric.map((r) => (
                                <div key={r.criterion} className="flex items-center justify-between text-sm">
                                    <span className="text-slate-400">{r.criterion}</span>
                                    <span className="text-slate-600 font-mono tabular-nums">{r.points} pts</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Prompt input ─────────────────────────────────────── */}
                <div className="mb-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-500 block mb-2">
                        Your Prompt
                    </label>
                    <textarea
                        value={prompt}
                        onChange={e => setPrompt(e.target.value)}
                        placeholder="Write your prompt here..."
                        disabled={loading}
                        rows={6}
                        maxLength={2000}
                        className="w-full rounded-xl border border-white/10 bg-rock-card text-slate-200
                                   placeholder-slate-600 font-mono text-sm p-4 resize-none
                                   hover:border-white/20 disabled:opacity-50 transition-colors"
                    />
                    <div className={cn(
                        "text-right text-xs mt-1 tabular-nums",
                        charsLeft < 200 ? "text-rock-orange" : "text-slate-600"
                    )}>
                        {charsLeft} chars remaining
                    </div>
                </div>

                {/* ── Run button ───────────────────────────────────────── */}
                <button
                    onClick={handleRun}
                    disabled={loading || !prompt.trim()}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl
                               font-black text-sm uppercase tracking-widest
                               bg-rock-yellow text-black hover:bg-amber-400
                               disabled:opacity-40 disabled:cursor-not-allowed
                               transition-all active:scale-[0.98]"
                >
                    {loading ? (
                        <><RefreshCw className="h-4 w-4 animate-spin" /> Running...</>
                    ) : (
                        <><Zap className="h-4 w-4" /> Jam</>
                    )}
                </button>

                {/* ── Error ────────────────────────────────────────────── */}
                {error && (
                    <div className="mt-6 rounded-xl border border-rock-red/30 bg-rock-red/10 p-4 text-sm text-red-400">
                        {error}
                    </div>
                )}

                {/* ── Result ───────────────────────────────────────────── */}
                {result && (
                    <div className="mt-8 space-y-6">
                        {/* Output */}
                        <div>
                            <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3">
                                Claude&apos;s Response
                            </p>
                            <div className="rounded-xl border border-white/10 bg-rock-card p-5 text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                                {result.output}
                            </div>
                        </div>

                        {/* Grade */}
                        {result.grade.max > 0 && (
                            <div className="rounded-xl border border-white/10 bg-rock-card p-5">
                                <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-5">
                                    Your Score
                                </p>

                                <div className="flex items-center gap-8 mb-6">
                                    <ScoreRing score={result.grade.total} max={result.grade.max} />
                                    <p className="text-sm text-slate-400 italic flex-1 leading-relaxed">
                                        &ldquo;{result.grade.feedback}&rdquo;
                                    </p>
                                </div>

                                {result.grade.breakdown.length > 0 && (
                                    <div className="space-y-3">
                                        {result.grade.breakdown.map((item) => {
                                            const pct = item.max > 0 ? (item.earned / item.max) * 100 : 0;
                                            const barColor =
                                                pct >= 80 ? "bg-rock-green" :
                                                pct >= 60 ? "bg-rock-yellow" :
                                                pct >= 40 ? "bg-rock-orange" :
                                                "bg-rock-red";
                                            return (
                                                <div key={item.criterion}>
                                                    <div className="flex items-center justify-between text-xs mb-1">
                                                        <span className="text-slate-400">{item.criterion}</span>
                                                        <span className="text-slate-500 font-mono tabular-nums">
                                                            {item.earned}/{item.max}
                                                        </span>
                                                    </div>
                                                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                        <div
                                                            className={cn("h-full rounded-full transition-all duration-700", barColor)}
                                                            style={{ width: `${pct}%` }}
                                                        />
                                                    </div>
                                                    {item.comment && (
                                                        <p className="text-[11px] text-slate-600 mt-1">{item.comment}</p>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Reflection prompt */}
                        <div className="rounded-xl border border-rock-purple/20 bg-rock-purple/5 p-5">
                            <p className="text-xs font-black uppercase tracking-widest text-rock-purple mb-2">
                                Reflect
                            </p>
                            <p className="text-sm text-slate-400 leading-relaxed">
                                Before you try again — what specifically would you change about your prompt?
                                Think about what the rubric rewarded and what it punished.
                            </p>
                            <button
                                onClick={() => { setResult(null); setError(null); }}
                                className="mt-4 text-xs font-bold text-rock-yellow hover:text-amber-300 transition-colors"
                            >
                                ↺ Try again with a different prompt
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
