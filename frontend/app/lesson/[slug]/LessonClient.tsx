"use client";

/**
 * LessonClient — handles two lesson types:
 *
 *  prompt   → write prompt → run → reflect on 5 criteria → submit for grading
 *  knowledge→ answer 5 questions directly → submit for grading (no run step)
 *
 * Phases:
 *  prompt   → running → reflect → grading → done   (lesson_type: prompt)
 *  answers  →                     grading → done   (lesson_type: knowledge)
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { ArrowLeft, Zap, RefreshCw, Send, CheckCircle, Circle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import UserMenu from "@/components/UserMenu";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RubricItem {
    criterion: string;
    points: number;
    question: string;
}

interface Lesson {
    slug: string;
    number: number;
    title: string;
    tagline: string;
    difficulty: string;
    lesson_type: string;   // "prompt" | "knowledge"
    course_slug: string;
    challenge: string;
    instructions: string;
    rubric: RubricItem[];
}

type CriterionStatus = "pending" | "complete";

interface JobCriterion {
    criterion: string;
    points: number;
    status: CriterionStatus;
    earned: number | null;
    comment: string | null;
}

interface Job {
    job_id: string;
    status: "grading" | "complete";
    criteria: JobCriterion[];
    total_earned: number;
    total_possible: number;
    complete_count: number;
}

type Phase = "prompt" | "running" | "reflect" | "answers" | "grading" | "done";

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ScoreNumber({ score, max }: { score: number; max: number }) {
    const pct = max > 0 ? Math.round((score / max) * 100) : 0;
    const col =
        pct >= 80 ? "text-rock-green"  :
        pct >= 70 ? "text-rock-yellow" :
        pct >= 50 ? "text-rock-orange" :
        "text-rock-red";
    return (
        <div className="text-center">
            <div className={cn("text-6xl font-black tabular-nums", col)}>{pct}</div>
            <div className="text-slate-500 text-sm mt-1">{score} / {max} pts</div>
        </div>
    );
}

function CriterionRow({ item }: { item: JobCriterion }) {
    const done   = item.status === "complete";
    const pct    = done && item.points > 0 ? ((item.earned ?? 0) / item.points) * 100 : 0;
    const barCol =
        pct >= 80 ? "bg-rock-green"  :
        pct >= 60 ? "bg-rock-yellow" :
        pct >= 40 ? "bg-rock-orange" :
        "bg-rock-red";

    return (
        <div className={cn(
            "rounded-xl border p-4 transition-all duration-500",
            done ? "border-white/10 bg-rock-card" : "border-white/5 bg-[#0d0d0d]",
        )}>
            <div className="flex items-center gap-3 mb-2">
                {done
                    ? <CheckCircle className="h-4 w-4 text-rock-green shrink-0" />
                    : <Circle className="h-4 w-4 text-white/15 shrink-0 animate-pulse" />
                }
                <span className={cn("text-sm font-bold flex-1", done ? "text-slate-200" : "text-slate-600")}>
                    {item.criterion}
                </span>
                {done && (
                    <span className={cn(
                        "text-sm font-black tabular-nums shrink-0",
                        pct >= 80 ? "text-rock-green"  :
                        pct >= 60 ? "text-rock-yellow" :
                        "text-rock-red",
                    )}>
                        {item.earned}/{item.points}
                    </span>
                )}
            </div>
            {done && (
                <>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden ml-7 mb-2">
                        <div
                            className={cn("h-full rounded-full transition-all duration-700", barCol)}
                            style={{ width: `${pct}%` }}
                        />
                    </div>
                    {item.comment && (
                        <p className="text-[11px] text-slate-500 ml-7 leading-relaxed">{item.comment}</p>
                    )}
                </>
            )}
        </div>
    );
}

function AnswerBoxes({
    rubric,
    answers,
    setAnswers,
    sectionLabel,
}: {
    rubric: RubricItem[];
    answers: string[];
    setAnswers: (fn: (prev: string[]) => string[]) => void;
    sectionLabel: string;
}) {
    return (
        <div className="space-y-5">
            <div className="flex items-center gap-2 mb-1">
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">{sectionLabel}</p>
            </div>
            {rubric.map((rb, i) => (
                <div key={rb.criterion} className="rounded-xl border border-white/10 bg-rock-card p-5">
                    <div className="flex items-start justify-between gap-4 mb-3">
                        <div>
                            <p className="text-xs font-black uppercase tracking-widest text-rock-yellow/70 mb-1">
                                Question {i + 1} · {rb.points} pts
                            </p>
                            <p className="text-sm font-bold text-slate-200">{rb.criterion}</p>
                        </div>
                        <span className={cn(
                            "text-[10px] font-black uppercase shrink-0 mt-1",
                            answers[i]?.trim() ? "text-rock-green" : "text-slate-600",
                        )}>
                            {answers[i]?.trim() ? "✓" : "—"}
                        </span>
                    </div>
                    <p className="text-xs text-slate-500 mb-3 leading-relaxed">{rb.question}</p>
                    <textarea
                        value={answers[i] ?? ""}
                        onChange={e => setAnswers(prev => {
                            const next = [...prev];
                            next[i] = e.target.value;
                            return next;
                        })}
                        placeholder="Your answer…"
                        rows={3}
                        maxLength={1000}
                        className="w-full rounded-lg border border-white/10 bg-black/30 text-slate-200
                                   placeholder-slate-700 text-sm p-3 resize-none hover:border-white/20 transition-colors"
                    />
                    <div className="text-right text-[10px] text-slate-700 mt-1 tabular-nums">
                        {1000 - (answers[i]?.length ?? 0)}
                    </div>
                </div>
            ))}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function LessonClient({ lesson, backendUrl }: { lesson: Lesson; backendUrl: string }) {
    const { data: session } = useSession();
    const router = useRouter();

    const isKnowledge = lesson.lesson_type === "knowledge";

    const [phase, setPhase]             = useState<Phase>(isKnowledge ? "answers" : "prompt");
    const [prompt, setPrompt]           = useState("");
    const [output, setOutput]           = useState("");
    const [answers, setAnswers]         = useState<string[]>(lesson.rubric.map(() => ""));
    const [error, setError]             = useState<string | null>(null);
    const [showHints, setShowHints]     = useState(false);
    const [job, setJob]                 = useState<Job | null>(null);
    const [jobId, setJobId]             = useState<string | null>(null);
    const [redirecting, setRedirecting] = useState(false);

    const pollRef    = useRef<ReturnType<typeof setInterval> | null>(null);
    const reflectRef = useRef<HTMLDivElement>(null);
    const userId     = session?.user?.id ?? "anonymous";

    // ── Polling ─────────────────────────────────────────────────────────────

    const stopPolling = useCallback(() => {
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    }, []);

    useEffect(() => {
        if (!jobId || phase !== "grading") return;
        const poll = async () => {
            try {
                const res = await fetch(`${backendUrl}/api/job/${jobId}`);
                if (!res.ok) return;
                const data: Job = await res.json();
                setJob(data);
                if (data.status === "complete") { stopPolling(); setPhase("done"); }
            } catch { /* transient */ }
        };
        poll();
        pollRef.current = setInterval(poll, 2000);
        return stopPolling;
    }, [jobId, phase, backendUrl, stopPolling]);

    // ── Auto-redirect on pass ────────────────────────────────────────────────

    useEffect(() => {
        if (phase !== "done" || !job) return;
        const pct = job.total_possible > 0
            ? Math.round((job.total_earned / job.total_possible) * 100) : 0;
        if (pct >= 70 && userId !== "anonymous" && lesson.course_slug) {
            setRedirecting(true);
            const t = setTimeout(() => {
                router.push(`/certificate/${userId}/${lesson.course_slug}`);
            }, 3500);
            return () => clearTimeout(t);
        }
    }, [phase, job, userId, lesson.course_slug, router]);

    // ── Handlers ─────────────────────────────────────────────────────────────

    const handleRun = async () => {
        if (!prompt.trim()) return;
        setError(null);
        setPhase("running");
        try {
            const res = await fetch(`${backendUrl}/api/lesson/${lesson.slug}/run`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: prompt.trim() }),
            });
            if (!res.ok) {
                const e = await res.json().catch(() => ({}));
                throw new Error(e.error ?? `HTTP ${res.status}`);
            }
            const data = await res.json();
            setOutput(data.output);
            setPhase("reflect");
            setTimeout(() => reflectRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Something went wrong");
            setPhase("prompt");
        }
    };

    const handleSubmit = async () => {
        if (answers.some(a => !a.trim())) {
            setError("Answer all questions before submitting.");
            return;
        }
        setError(null);
        try {
            const res = await fetch(`${backendUrl}/api/lesson/${lesson.slug}/submit`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    prompt: prompt.trim(),
                    output,
                    answers: answers.map(a => a.trim()),
                    user_id: userId,
                }),
            });
            if (!res.ok) {
                const e = await res.json().catch(() => ({}));
                throw new Error(e.error ?? `HTTP ${res.status}`);
            }
            const { job_id } = await res.json();
            setJobId(job_id);
            setPhase("grading");
            window.scrollTo({ top: 0, behavior: "smooth" });
        } catch (e) {
            setError(e instanceof Error ? e.message : "Submission failed — try again.");
        }
    };

    const handleReset = () => {
        stopPolling();
        setPhase(isKnowledge ? "answers" : "prompt");
        setOutput("");
        setAnswers(lesson.rubric.map(() => ""));
        setJob(null);
        setJobId(null);
        setError(null);
        setRedirecting(false);
    };

    // ── Shared nav + header ──────────────────────────────────────────────────

    const backHref = lesson.course_slug ? `/course/${lesson.course_slug}` : "/";

    const Nav = () => (
        <nav className="border-b border-white/5 px-6 py-4 flex items-center justify-between sticky top-0 bg-rock-bg/90 backdrop-blur z-10">
            <div className="flex items-center gap-4">
                <Link href={backHref} className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-sm">
                    <ArrowLeft className="h-4 w-4" />
                    Back
                </Link>
                <span className="text-white/10">|</span>
                <span className="text-2xl">🎸</span>
                <span className="font-black text-white text-sm hidden sm:block">School of Chat</span>
            </div>
            <UserMenu />
        </nav>
    );

    const Header = () => (
        <div className="mb-8">
            <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-black uppercase tracking-widest text-rock-yellow/60">
                    Lesson {String(lesson.number).padStart(2, "0")}
                </span>
                <span className="text-white/10">·</span>
                <span className="text-xs font-black uppercase tracking-widest text-slate-600">
                    {lesson.difficulty}
                </span>
                {isKnowledge && (
                    <>
                        <span className="text-white/10">·</span>
                        <span className="text-xs font-black uppercase tracking-widest text-rock-blue/60">
                            Knowledge
                        </span>
                    </>
                )}
            </div>
            <h1 className="text-4xl font-black text-white mb-2 tracking-tighter">{lesson.title}</h1>
            <p className="text-slate-400">{lesson.tagline}</p>
        </div>
    );

    // ── PHASE: grading ───────────────────────────────────────────────────────

    if (phase === "grading") {
        const done  = job?.complete_count ?? 0;
        const total = lesson.rubric.length;
        const pct   = total > 0 ? Math.round((done / total) * 100) : 0;

        return (
            <div className="min-h-screen bg-rock-bg text-slate-200">
                <Nav />
                <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
                    <div className="text-center mb-10">
                        <div className="text-4xl mb-4">⚡</div>
                        <h2 className="text-2xl font-black text-white mb-2">Grading in progress</h2>
                        <p className="text-slate-500 text-sm">Don&apos;t close this window.</p>
                    </div>
                    <div className="mb-8">
                        <div className="flex justify-between text-xs text-slate-500 mb-2">
                            <span>{done} of {total} criteria graded</span>
                            <span className="tabular-nums">{pct}%</span>
                        </div>
                        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-rock-yellow rounded-full transition-all duration-500"
                                style={{ width: `${pct}%` }}
                            />
                        </div>
                    </div>
                    <div className="space-y-3">
                        {(job?.criteria ?? lesson.rubric.map(rb => ({
                            criterion: rb.criterion,
                            points: rb.points,
                            status: "pending" as CriterionStatus,
                            earned: null,
                            comment: null,
                        }))).map((item, i) => (
                            <CriterionRow key={i} item={item} />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // ── PHASE: done ──────────────────────────────────────────────────────────

    if (phase === "done" && job) {
        const scorePct = job.total_possible > 0
            ? Math.round((job.total_earned / job.total_possible) * 100) : 0;
        const passed = scorePct >= 70;

        return (
            <div className="min-h-screen bg-rock-bg text-slate-200">
                <Nav />
                <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
                    <Header />
                    <div className="rounded-xl border border-white/10 bg-rock-card p-8 mb-6 text-center">
                        <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-6">Final Score</p>
                        <ScoreNumber score={job.total_earned} max={job.total_possible} />
                        {passed ? (
                            <div className="mt-6 rounded-lg bg-rock-green/10 border border-rock-green/30 px-4 py-3">
                                <p className="text-rock-green font-black text-sm">Lesson passed ✓</p>
                            </div>
                        ) : (
                            <div className="mt-6 rounded-lg bg-white/5 border border-white/10 px-4 py-3">
                                <p className="text-slate-400 text-sm">Score 70 or above to pass.</p>
                            </div>
                        )}
                    </div>

                    <div className="space-y-3 mb-8">
                        {job.criteria.map((item, i) => <CriterionRow key={i} item={item} />)}
                    </div>

                    {passed && userId !== "anonymous" && lesson.course_slug && (
                        <div className="rounded-xl border border-rock-yellow/30 bg-rock-yellow/5 p-6 text-center mb-6">
                            <p className="text-rock-yellow font-black text-lg mb-1">🏆 Lesson passed!</p>
                            <p className="text-slate-400 text-sm mb-4">
                                {redirecting
                                    ? "Checking your certificate…"
                                    : "Pass 3 lessons at 70+ to earn your course certificate."}
                            </p>
                            {redirecting ? (
                                <RefreshCw className="h-5 w-5 text-rock-yellow animate-spin mx-auto" />
                            ) : (
                                <Link
                                    href={`/certificate/${userId}/${lesson.course_slug}`}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-black text-sm
                                               bg-rock-yellow text-black hover:bg-amber-400 transition-all"
                                >
                                    Check certificate →
                                </Link>
                            )}
                        </div>
                    )}

                    <button
                        onClick={handleReset}
                        className="w-full py-3 rounded-xl border border-white/10 text-slate-400 hover:text-white
                                   hover:border-white/20 font-bold text-sm transition-all"
                    >
                        ↺ Try again
                    </button>
                </div>
            </div>
        );
    }

    // ── PHASES: prompt / running / reflect / answers ─────────────────────────

    return (
        <div className="min-h-screen bg-rock-bg text-slate-200">
            <Nav />
            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
                <Header />

                {/* Mission */}
                <div className="rounded-xl border border-rock-yellow/20 bg-rock-yellow/5 p-5 mb-6">
                    <p className="text-xs font-black uppercase tracking-widest text-rock-yellow mb-2">
                        {isKnowledge ? "The Question" : "Your Mission"}
                    </p>
                    <p className="text-slate-200 leading-relaxed whitespace-pre-line">{lesson.challenge}</p>
                </div>

                {/* Hints */}
                <button
                    onClick={() => setShowHints(v => !v)}
                    className="text-xs font-bold text-slate-500 hover:text-slate-300 mb-4 transition-colors flex items-center gap-1.5"
                >
                    {showHints ? "▼" : "▶"} {showHints ? "Hide" : "Show"} background notes
                </button>
                {showHints && (
                    <div className="rounded-xl border border-white/10 bg-rock-card p-5 mb-6 text-sm text-slate-400 whitespace-pre-line leading-relaxed">
                        {lesson.instructions}
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="mb-6 rounded-xl border border-rock-red/30 bg-rock-red/10 p-4 text-sm text-red-400 flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                        {error}
                    </div>
                )}

                {/* ── Knowledge: jump straight to answer boxes ──────────── */}
                {isKnowledge && (
                    <>
                        <AnswerBoxes
                            rubric={lesson.rubric}
                            answers={answers}
                            setAnswers={setAnswers}
                            sectionLabel="Answer each question"
                        />
                        <button
                            onClick={handleSubmit}
                            disabled={answers.some(a => !a.trim())}
                            className="mt-8 w-full flex items-center justify-center gap-2 py-3.5 rounded-xl
                                       font-black text-sm uppercase tracking-widest
                                       bg-rock-yellow text-black hover:bg-amber-400
                                       disabled:opacity-40 disabled:cursor-not-allowed
                                       transition-all active:scale-[0.98]"
                        >
                            <Send className="h-4 w-4" />
                            Submit for grading
                        </button>
                        <p className="text-center text-[11px] text-slate-600 mt-3">
                            Each question is graded independently — results appear as they come in.
                        </p>
                    </>
                )}

                {/* ── Prompt-type: write prompt → run → reflect ─────────── */}
                {!isKnowledge && (
                    <>
                        {/* Step 1: write prompt */}
                        <div className="mb-2">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="h-5 w-5 rounded-full bg-rock-yellow/20 text-rock-yellow text-xs font-black flex items-center justify-center">1</span>
                                <label className="text-xs font-black uppercase tracking-widest text-slate-400">
                                    Write your prompt
                                </label>
                            </div>
                            <textarea
                                value={prompt}
                                onChange={e => setPrompt(e.target.value)}
                                placeholder="Write your prompt here…"
                                disabled={phase === "running" || phase === "reflect"}
                                rows={6}
                                maxLength={2000}
                                className="w-full rounded-xl border border-white/10 bg-rock-card text-slate-200
                                           placeholder-slate-600 font-mono text-sm p-4 resize-none
                                           hover:border-white/20 disabled:opacity-60 transition-colors"
                            />
                            <div className={cn(
                                "text-right text-xs mt-1 tabular-nums",
                                (2000 - prompt.length) < 200 ? "text-rock-orange" : "text-slate-600",
                            )}>
                                {2000 - prompt.length} chars remaining
                            </div>
                        </div>

                        {phase !== "reflect" && (
                            <button
                                onClick={handleRun}
                                disabled={phase === "running" || !prompt.trim()}
                                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl
                                           font-black text-sm uppercase tracking-widest mb-6
                                           bg-rock-yellow text-black hover:bg-amber-400
                                           disabled:opacity-40 disabled:cursor-not-allowed
                                           transition-all active:scale-[0.98]"
                            >
                                {phase === "running"
                                    ? <><RefreshCw className="h-4 w-4 animate-spin" /> Running…</>
                                    : <><Zap className="h-4 w-4" /> Run it</>
                                }
                            </button>
                        )}

                        {/* Step 2: output + reflections */}
                        {phase === "reflect" && (
                            <div ref={reflectRef}>
                                <div className="mb-8">
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="h-5 w-5 rounded-full bg-rock-yellow/20 text-rock-yellow text-xs font-black flex items-center justify-center">2</span>
                                        <p className="text-xs font-black uppercase tracking-widest text-slate-400">AI&apos;s response</p>
                                        <button
                                            onClick={() => { setPhase("prompt"); setOutput(""); }}
                                            className="ml-auto text-xs text-slate-600 hover:text-slate-400 transition-colors"
                                        >
                                            ↺ Re-run
                                        </button>
                                    </div>
                                    <div className="rounded-xl border border-white/10 bg-rock-card p-5 text-sm text-slate-300 leading-relaxed whitespace-pre-wrap font-mono">
                                        {output}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 mb-1">
                                    <span className="h-5 w-5 rounded-full bg-rock-yellow/20 text-rock-yellow text-xs font-black flex items-center justify-center">3</span>
                                </div>
                                <AnswerBoxes
                                    rubric={lesson.rubric}
                                    answers={answers}
                                    setAnswers={setAnswers}
                                    sectionLabel="Reflect — answer all 5"
                                />

                                <button
                                    onClick={handleSubmit}
                                    disabled={answers.some(a => !a.trim())}
                                    className="mt-8 w-full flex items-center justify-center gap-2 py-3.5 rounded-xl
                                               font-black text-sm uppercase tracking-widest
                                               bg-rock-yellow text-black hover:bg-amber-400
                                               disabled:opacity-40 disabled:cursor-not-allowed
                                               transition-all active:scale-[0.98]"
                                >
                                    <Send className="h-4 w-4" />
                                    Submit for grading
                                </button>
                                <p className="text-center text-[11px] text-slate-600 mt-3">
                                    Each criterion is graded independently — results appear as they come in.
                                </p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
