"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { ArrowLeft, BookOpen, Zap, Send, CheckCircle, Circle, ChevronDown, ChevronUp, RefreshCw, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import UserMenu from "@/components/UserMenu";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Article {
    id: string;
    title: string;
    source: string;
    category: string;
    published_at: string;
    text: string;
    word_count: number;
}

interface Question {
    question: string;
    criterion: string;
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

type Phase = "reading" | "generating" | "answers" | "grading" | "done";

// ---------------------------------------------------------------------------
// Shared sub-components
// ---------------------------------------------------------------------------

function ScoreNumber({ score, max }: { score: number; max: number }) {
    const pct = max > 0 ? Math.round((score / max) * 100) : 0;
    const col = pct >= 80 ? "text-rock-green" : pct >= 70 ? "text-rock-yellow" : pct >= 50 ? "text-rock-orange" : "text-rock-red";
    return (
        <div className="text-center">
            <div className={cn("text-6xl font-black tabular-nums", col)} aria-label={`Score: ${pct} percent (${score} of ${max} points)`}>
                {pct}
            </div>
            <div aria-hidden="true" className="text-slate-500 text-sm mt-1">{score} / {max} pts</div>
        </div>
    );
}

function CriterionRow({ item }: { item: JobCriterion }) {
    const done   = item.status === "complete";
    const pct    = done && item.points > 0 ? ((item.earned ?? 0) / item.points) * 100 : 0;
    const barCol = pct >= 80 ? "bg-rock-green" : pct >= 60 ? "bg-rock-yellow" : pct >= 40 ? "bg-rock-orange" : "bg-rock-red";
    return (
        <div className={cn("rounded-xl border p-4 transition-all duration-500", done ? "border-white/10 bg-rock-card" : "border-white/5 bg-[#0d0d0d]")}>
            <div className="flex items-center gap-3 mb-2">
                {done
                    ? <CheckCircle aria-hidden="true" className="h-4 w-4 text-rock-green shrink-0" />
                    : <Circle aria-hidden="true" className="h-4 w-4 text-white/15 shrink-0 animate-pulse" />
                }
                <span className={cn("text-sm font-bold flex-1", done ? "text-slate-200" : "text-slate-600")}>
                    {item.criterion}
                    {done ? <span className="sr-only"> — graded</span> : <span className="sr-only"> — pending</span>}
                </span>
                {done && (
                    <span className={cn("text-sm font-black tabular-nums shrink-0", pct >= 80 ? "text-rock-green" : pct >= 60 ? "text-rock-yellow" : "text-rock-red")}>
                        <span className="sr-only">Score: </span>{item.earned}/{item.points}
                    </span>
                )}
            </div>
            {done && (
                <>
                    <div
                        role="progressbar"
                        aria-valuenow={Math.round(pct)}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${item.criterion}: ${Math.round(pct)}%`}
                        className="h-1.5 bg-white/5 rounded-full overflow-hidden ml-7 mb-2"
                    >
                        <div aria-hidden="true" className={cn("h-full rounded-full transition-all duration-700", barCol)} style={{ width: `${pct}%` }} />
                    </div>
                    {item.comment && <p className="text-[11px] text-slate-500 ml-7 leading-relaxed">{item.comment}</p>}
                </>
            )}
        </div>
    );
}

function ArticleMetadata({ article }: { article: Article }) {
    return (
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mb-4">
            {article.category && (
                <span className="px-2 py-0.5 rounded-full bg-rock-yellow/10 text-rock-yellow/80 font-bold uppercase tracking-wider border border-rock-yellow/20">
                    {article.category}
                </span>
            )}
            {article.source && <span>{article.source}</span>}
            {article.published_at && <span aria-hidden="true">·</span>}
            {article.published_at && <span>{article.published_at.slice(0, 10)}</span>}
            {article.word_count > 0 && (
                <>
                    <span aria-hidden="true">·</span>
                    <span>{article.word_count} words</span>
                </>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function ArticleTestClient({ article, backendUrl }: { article: Article; backendUrl: string }) {
    const { data: session } = useSession();
    const router            = useRouter();

    const [phase, setPhase]             = useState<Phase>("reading");
    const [questions, setQuestions]     = useState<Question[]>([]);
    const [answers, setAnswers]         = useState<string[]>(["", "", "", "", ""]);
    const [job, setJob]                 = useState<Job | null>(null);
    const [jobId, setJobId]             = useState<string | null>(null);
    const [error, setError]             = useState<string | null>(null);
    const [articleOpen, setArticleOpen] = useState(false);
    const [redirecting, setRedirecting] = useState(false);

    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const userId  = session?.user?.id ?? "anonymous";

    const stopPolling = useCallback(() => {
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    }, []);

    // ── Polling ───────────────────────────────────────────────────��──────────

    useEffect(() => {
        if (!jobId || phase !== "grading") return;
        const poll = async () => {
            try {
                const res  = await fetch(`${backendUrl}/api/job/${jobId}`);
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

    // ── Auto-redirect on pass ─────────────────────────────────────────────

    useEffect(() => {
        if (phase !== "done" || !job) return;
        const pct = job.total_possible > 0 ? Math.round((job.total_earned / job.total_possible) * 100) : 0;
        if (pct >= 70 && userId !== "anonymous") {
            setRedirecting(true);
            const t = setTimeout(() => router.push(`/certificate/${userId}/reading-comprehension`), 3500);
            return () => clearTimeout(t);
        }
    }, [phase, job, userId, router]);

    // ── Handlers ──────────────────────────────────────────────────────────

    const handleGenerate = async () => {
        setError(null);
        setPhase("generating");
        try {
            const res = await fetch(`${backendUrl}/api/dynamic/questions/${article.id}`, { method: "POST" });
            if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `HTTP ${res.status}`);
            const data = await res.json();
            setQuestions(data.questions);
            setPhase("answers");
            window.scrollTo({ top: 0, behavior: "smooth" });
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to generate questions — try again.");
            setPhase("reading");
        }
    };

    const handleSubmit = async () => {
        if (answers.some(a => !a.trim())) { setError("Answer all 5 questions before submitting."); return; }
        setError(null);
        try {
            const res = await fetch(`${backendUrl}/api/dynamic/submit`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ article_id: article.id, questions, answers: answers.map(a => a.trim()), user_id: userId }),
            });
            if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `HTTP ${res.status}`);
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
        setPhase("reading");
        setQuestions([]);
        setAnswers(["", "", "", "", ""]);
        setJob(null);
        setJobId(null);
        setError(null);
        setRedirecting(false);
        setArticleOpen(false);
    };

    // ── Nav ───────────────────────────────────────────────────────────────

    const Nav = () => (
        <nav aria-label="Site navigation" className="border-b border-white/5 px-6 py-4 flex items-center justify-between sticky top-0 bg-rock-bg/90 backdrop-blur z-10">
            <div className="flex items-center gap-4">
                <Link
                    href="/course/reading-comprehension"
                    className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-sm
                               focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rock-yellow rounded"
                >
                    <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                    Back
                </Link>
                <span aria-hidden="true" className="text-white/10">|</span>
                <span aria-hidden="true" className="text-xl">📰</span>
                <span className="font-black text-white text-sm hidden sm:block">Reading Comprehension</span>
            </div>
            <UserMenu />
        </nav>
    );

    // ── PHASE: generating ─────────────────────────────────────────────────

    if (phase === "generating") {
        return (
            <div className="min-h-screen bg-rock-bg text-slate-200">
                <Nav />
                <main className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-600 mb-2">{article.source}</p>
                    <h1 className="text-2xl font-black text-white mb-8 tracking-tight">{article.title}</h1>
                    <div role="status" aria-live="polite" className="text-center py-10">
                        <div aria-hidden="true" className="text-4xl mb-4">📰</div>
                        <p className="text-white font-black text-lg mb-2">Generating questions…</p>
                        <p className="text-slate-500 text-sm mb-8">Ollama is reading the article and crafting 5 comprehension questions.</p>
                        <div className="space-y-3">
                            {[1,2,3,4,5].map(n => (
                                <div key={n} className="rounded-xl border border-white/5 bg-[#0d0d0d] p-5 animate-pulse">
                                    <div className="h-3 bg-white/10 rounded w-3/4 mb-2" />
                                    <div className="h-3 bg-white/5 rounded w-1/2" />
                                </div>
                            ))}
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    // ── PHASE: grading ────────────────────────────────────────────────────

    if (phase === "grading") {
        const done  = job?.complete_count ?? 0;
        const pct   = Math.round((done / 5) * 100);
        return (
            <div className="min-h-screen bg-rock-bg text-slate-200">
                <Nav />
                <main className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
                    <div className="text-center mb-10">
                        <div aria-hidden="true" className="text-4xl mb-4">⚡</div>
                        <h1 className="text-2xl font-black text-white mb-1">Grading in progress</h1>
                        <p className="text-slate-500 text-sm">{article.title}</p>
                    </div>
                    <div className="mb-8">
                        <div className="flex justify-between text-xs text-slate-500 mb-2">
                            <span id="grading-progress-label">{done} of 5 questions graded</span>
                            <span aria-hidden="true" className="tabular-nums">{pct}%</span>
                        </div>
                        <div
                            role="progressbar"
                            aria-valuenow={pct}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-labelledby="grading-progress-label"
                            className="h-2 bg-white/5 rounded-full overflow-hidden"
                        >
                            <div aria-hidden="true" className="h-full bg-rock-yellow rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                        </div>
                    </div>
                    <div aria-live="polite" aria-label="Grading results" className="space-y-3">
                        {(job?.criteria ?? questions.map(q => ({
                            criterion: q.criterion,
                            points: 20,
                            status: "pending" as CriterionStatus,
                            earned: null,
                            comment: null,
                        }))).map((item, i) => <CriterionRow key={i} item={item} />)}
                    </div>
                </main>
            </div>
        );
    }

    // ── PHASE: done ───────────────────────────────────────────────────────

    if (phase === "done" && job) {
        const scorePct = job.total_possible > 0 ? Math.round((job.total_earned / job.total_possible) * 100) : 0;
        const passed   = scorePct >= 70;
        return (
            <div className="min-h-screen bg-rock-bg text-slate-200">
                <Nav />
                <main className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
                    <p className="text-xs text-slate-600 mb-2 uppercase tracking-widest font-bold">{article.source}</p>
                    <h1 className="text-xl font-black text-white mb-8 tracking-tight">{article.title}</h1>

                    <div className="rounded-xl border border-white/10 bg-rock-card p-8 mb-6 text-center">
                        <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-6">Comprehension Score</h2>
                        <ScoreNumber score={job.total_earned} max={job.total_possible} />
                        {passed ? (
                            <div role="status" className="mt-6 rounded-lg bg-rock-green/10 border border-rock-green/30 px-4 py-3">
                                <p className="text-rock-green font-black text-sm">Article passed ✓</p>
                            </div>
                        ) : (
                            <div role="status" className="mt-6 rounded-lg bg-white/5 border border-white/10 px-4 py-3">
                                <p className="text-slate-400 text-sm">Score 70 or above to count toward your certificate.</p>
                            </div>
                        )}
                    </div>

                    <div className="space-y-3 mb-8">
                        {job.criteria.map((item, i) => <CriterionRow key={i} item={item} />)}
                    </div>

                    {passed && userId !== "anonymous" && (
                        <div className="rounded-xl border border-rock-yellow/30 bg-rock-yellow/5 p-6 text-center mb-6">
                            <p className="text-rock-yellow font-black text-lg mb-1">
                                <span aria-hidden="true">🏆 </span>Article passed!
                            </p>
                            <p role="status" aria-live="polite" className="text-slate-400 text-sm mb-4">
                                {redirecting ? "Checking your certificate…" : "Pass 3 articles at 70+ to earn your certificate."}
                            </p>
                            {redirecting ? (
                                <div role="status" aria-label="Redirecting to certificate page">
                                    <RefreshCw aria-hidden="true" className="h-5 w-5 text-rock-yellow animate-spin mx-auto" />
                                    <span className="sr-only">Loading certificate…</span>
                                </div>
                            ) : (
                                <Link
                                    href={`/certificate/${userId}/reading-comprehension`}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-black text-sm
                                               bg-rock-yellow text-black hover:bg-amber-400 transition-all
                                               focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rock-yellow"
                                >
                                    Check certificate →
                                </Link>
                            )}
                        </div>
                    )}

                    <div className="flex gap-3">
                        <button
                            onClick={handleReset}
                            aria-label="Try this article again"
                            className="flex-1 py-3 rounded-xl border border-white/10 text-slate-400 hover:text-white
                                       hover:border-white/20 font-bold text-sm transition-all
                                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rock-yellow"
                        >
                            ↺ Try again
                        </button>
                        <Link
                            href="/course/reading-comprehension"
                            className="flex-1 py-3 rounded-xl border border-rock-yellow/30 text-rock-yellow hover:bg-rock-yellow/10
                                       font-bold text-sm transition-all text-center
                                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rock-yellow"
                        >
                            Browse more articles →
                        </Link>
                    </div>
                </main>
            </div>
        );
    }

    // ── PHASE: answers ────────────────────────────────────────────────────

    if (phase === "answers") {
        return (
            <div className="min-h-screen bg-rock-bg text-slate-200">
                <Nav />
                <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
                    {/* Collapsible article reference */}
                    <div className="rounded-xl border border-white/10 bg-rock-card mb-8 overflow-hidden">
                        <button
                            onClick={() => setArticleOpen(v => !v)}
                            aria-expanded={articleOpen}
                            aria-controls="article-reference"
                            className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/5 transition-colors
                                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rock-yellow"
                        >
                            <div className="flex items-center gap-3">
                                <BookOpen aria-hidden="true" className="h-4 w-4 text-slate-500" />
                                <span className="text-sm font-bold text-slate-400">Article reference</span>
                                <span className="text-xs text-slate-600 hidden sm:block truncate max-w-[300px]">{article.title}</span>
                            </div>
                            {articleOpen
                                ? <ChevronUp aria-hidden="true" className="h-4 w-4 text-slate-500 shrink-0" />
                                : <ChevronDown aria-hidden="true" className="h-4 w-4 text-slate-500 shrink-0" />
                            }
                        </button>
                        {articleOpen && (
                            <div id="article-reference" role="region" aria-label="Article text for reference">
                                <div className="px-5 pb-2 border-t border-white/5">
                                    <ArticleMetadata article={article} />
                                </div>
                                <div className="px-5 pb-5 max-h-80 overflow-y-auto text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                                    {article.text}
                                </div>
                            </div>
                        )}
                    </div>

                    {error && (
                        <div role="alert" className="mb-6 rounded-xl border border-rock-red/30 bg-rock-red/10 p-4 text-sm text-red-400 flex items-start gap-2">
                            <AlertCircle aria-hidden="true" className="h-4 w-4 shrink-0 mt-0.5" />
                            {error}
                        </div>
                    )}

                    <section aria-labelledby="questions-heading">
                        <h1 id="questions-heading" className="text-2xl font-black text-white mb-1 tracking-tight">Answer all 5 questions</h1>
                        <p className="text-slate-500 text-sm mb-8">Base your answers on the article. Open it above if you need to refer back.</p>

                        <div className="space-y-5">
                            {questions.map((q, i) => {
                                const inputId    = `article-answer-${i}`;
                                const questionId = `article-question-${i}`;
                                const answered   = Boolean(answers[i]?.trim());
                                return (
                                    <div key={i} className="rounded-xl border border-white/10 bg-rock-card p-5">
                                        <div className="flex items-start justify-between gap-4 mb-3">
                                            <p id={questionId} className="text-xs font-black uppercase tracking-widest text-rock-yellow/70">
                                                Question {i + 1} · 20 pts
                                            </p>
                                            <span aria-hidden="true" className={cn("text-[10px] font-black uppercase shrink-0", answered ? "text-rock-green" : "text-slate-600")}>
                                                {answered ? "✓" : "—"}
                                            </span>
                                        </div>
                                        <p className="text-sm font-bold text-slate-200 mb-3">{q.question}</p>
                                        <label htmlFor={inputId} className="sr-only">
                                            Answer for question {i + 1}
                                        </label>
                                        <textarea
                                            id={inputId}
                                            aria-describedby={questionId}
                                            value={answers[i]}
                                            onChange={e => setAnswers(prev => { const n = [...prev]; n[i] = e.target.value; return n; })}
                                            placeholder="Your answer…"
                                            rows={3}
                                            maxLength={1000}
                                            className="w-full rounded-lg border border-white/10 bg-black/30 text-slate-200
                                                       placeholder-slate-700 text-sm p-3 resize-none hover:border-white/20 transition-colors
                                                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rock-yellow"
                                        />
                                        <div aria-hidden="true" className="text-right text-[10px] text-slate-700 mt-1 tabular-nums">
                                            {1000 - (answers[i]?.length ?? 0)}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <button
                            onClick={handleSubmit}
                            disabled={answers.some(a => !a.trim())}
                            aria-disabled={answers.some(a => !a.trim())}
                            className="mt-8 w-full flex items-center justify-center gap-2 py-3.5 rounded-xl
                                       font-black text-sm uppercase tracking-widest
                                       bg-rock-yellow text-black hover:bg-amber-400
                                       disabled:opacity-40 disabled:cursor-not-allowed
                                       transition-all active:scale-[0.98]
                                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rock-yellow"
                        >
                            <Send aria-hidden="true" className="h-4 w-4" />
                            Submit for grading
                        </button>
                        <p className="text-center text-[11px] text-slate-600 mt-3">
                            Each question is graded independently — results appear as they come in.
                        </p>
                    </section>
                </main>
            </div>
        );
    }

    // ── PHASE: reading (default) ──────────────────────────────────────────

    return (
        <div className="min-h-screen bg-rock-bg text-slate-200">
            <Nav />
            <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
                <ArticleMetadata article={article} />
                <h1 className="text-3xl sm:text-4xl font-black text-white mb-6 tracking-tight leading-tight">
                    {article.title}
                </h1>

                {error && (
                    <div role="alert" className="mb-6 rounded-xl border border-rock-red/30 bg-rock-red/10 p-4 text-sm text-red-400 flex items-start gap-2">
                        <AlertCircle aria-hidden="true" className="h-4 w-4 shrink-0 mt-0.5" />
                        {error}
                    </div>
                )}

                {/* Article text */}
                <div
                    role="region"
                    aria-label="Article text"
                    className="rounded-xl border border-white/10 bg-rock-card p-6 mb-8 text-slate-300 text-sm leading-relaxed whitespace-pre-wrap max-h-[60vh] overflow-y-auto"
                >
                    {article.text}
                </div>

                <div className="rounded-xl border border-rock-yellow/20 bg-rock-yellow/5 p-5 mb-6">
                    <div className="flex items-start gap-3">
                        <Zap aria-hidden="true" className="h-4 w-4 text-rock-yellow mt-0.5 shrink-0" />
                        <div>
                            <p className="text-sm font-black text-rock-yellow mb-1">How it works</p>
                            <p className="text-xs text-slate-400 leading-relaxed">
                                Once you click Generate, Ollama reads this article and crafts 5 comprehension questions.
                                Your answers are graded against the article content — general knowledge won&apos;t be enough.
                                Score 70+ to count toward your certificate.
                            </p>
                        </div>
                    </div>
                </div>

                <button
                    onClick={handleGenerate}
                    className="w-full flex items-center justify-center gap-2 py-4 rounded-xl
                               font-black text-sm uppercase tracking-widest
                               bg-rock-yellow text-black hover:bg-amber-400
                               transition-all active:scale-[0.98]
                               focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rock-yellow"
                >
                    <Zap aria-hidden="true" className="h-4 w-4" />
                    I&apos;ve read it — Generate Questions
                </button>
                <p className="text-center text-[11px] text-slate-600 mt-3">
                    Questions are cached — you&apos;ll always get the same 5 for this article.
                </p>
            </main>
        </div>
    );
}
