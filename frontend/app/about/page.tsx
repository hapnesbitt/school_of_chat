import Link from "next/link";
import UserMenu from "@/components/UserMenu";

export const metadata = {
    title: "About — School of Chat",
    description: "What School of Chat is, who it's for, and how it works.",
};

const CARDS = [
    {
        href: "/about/contact",
        icon: "✉️",
        title: "Contact",
        description: "Questions, feedback, or just want to say something? Get in touch.",
        cta: "Get in touch →",
    },
    {
        href: "/about/terms",
        icon: "📄",
        title: "Terms of Service",
        description: "What you can expect from us, and what we expect from you.",
        cta: "Read the terms →",
    },
    {
        href: "/about/privacy",
        icon: "🔒",
        title: "Privacy Policy",
        description: "What we collect, what we don't, and why Ollama keeps your data local.",
        cta: "Read the policy →",
    },
] as const;

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-rock-bg text-slate-200">
            <nav aria-label="Site navigation" className="border-b border-white/5 px-6 py-4 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rock-yellow rounded">
                    <span aria-hidden="true" className="text-2xl">🎸</span>
                    <span className="font-black text-white text-lg tracking-tight">School of Chat</span>
                </Link>
                <div className="flex items-center gap-5">
                    <Link
                        href="/about"
                        className="text-sm font-bold text-rock-yellow uppercase tracking-widest focus-visible:outline-none focus-visible:underline"
                        aria-current="page"
                    >
                        About
                    </Link>
                    <UserMenu />
                </div>
            </nav>

            <main className="px-6 pt-20 pb-24 max-w-2xl mx-auto">

                {/* Hero */}
                <header className="mb-16">
                    <div aria-hidden="true" className="text-5xl mb-6">🎸</div>
                    <h1 className="text-4xl sm:text-5xl font-black text-white mb-5 leading-tight tracking-tighter">
                        About School of <span className="text-rock-yellow">Chat</span>
                    </h1>
                    <p className="text-lg text-slate-400 leading-relaxed">
                        School of Chat is a practice platform for workplace compliance training and technical certification prep.
                        You write real answers. A real AI grades them. No multiple choice, no clicker questions, no theory slides.
                    </p>
                </header>

                {/* Mission */}
                <section aria-labelledby="mission-heading" className="mb-12 space-y-5 text-slate-400 leading-relaxed">
                    <h2 id="mission-heading" className="text-xs font-black uppercase tracking-widest text-rock-yellow mb-4">
                        The Mission
                    </h2>
                    <p>
                        Most compliance training is built to be completed, not learned. You click through slides,
                        hit next, pass the quiz, and forget it by lunchtime. School of Chat is built on a different
                        assumption: that if you have to <em className="text-slate-300">explain</em> something in writing —
                        and get honest feedback on whether you actually understood it — you'll remember it.
                    </p>
                    <p>
                        Think of it like the School of Rock, but for workplace knowledge. Dewey Finn didn't hand
                        his students a multiple-choice test about chord theory. He put them on a stage and made
                        them play. School of Chat does the same thing with the stuff your employer actually needs you to know.
                    </p>
                    <p>
                        Every lesson is a challenge. You respond in your own words. The AI grades your answer against
                        a rubric and tells you what you got right, what you missed, and why. You get a score. You can
                        try again. You can earn a certificate.
                    </p>
                </section>

                {/* Who it's for */}
                <section aria-labelledby="who-heading" className="mb-12">
                    <h2 id="who-heading" className="text-xs font-black uppercase tracking-widest text-rock-yellow mb-4">
                        Who It&rsquo;s For
                    </h2>
                    <ul className="space-y-3 text-slate-400 leading-relaxed">
                        <li className="flex gap-3">
                            <span aria-hidden="true" className="text-rock-yellow font-black">—</span>
                            <span>
                                <span className="text-slate-200 font-bold">Employees preparing for mandatory training</span> — GDPR,
                                HIPAA, DEI, anti-bribery, GMP. Practice before the official course so you actually understand it,
                                not just survive it.
                            </span>
                        </li>
                        <li className="flex gap-3">
                            <span aria-hidden="true" className="text-rock-yellow font-black">—</span>
                            <span>
                                <span className="text-slate-200 font-bold">People prepping for real certifications</span> — Security+
                                and beyond. Written explanation practice for exams that require genuine understanding.
                            </span>
                        </li>
                        <li className="flex gap-3">
                            <span aria-hidden="true" className="text-rock-yellow font-black">—</span>
                            <span>
                                <span className="text-slate-200 font-bold">Curious learners</span> — who want to actually understand
                                prompt engineering, data privacy law, or cybersecurity, rather than just read about them.
                            </span>
                        </li>
                    </ul>
                </section>

                {/* How it works */}
                <section aria-labelledby="how-heading" className="mb-16">
                    <h2 id="how-heading" className="text-xs font-black uppercase tracking-widest text-rock-yellow mb-4">
                        How It Works
                    </h2>
                    <div className="space-y-3">
                        {[
                            ["Pick a course", "Ten courses across compliance, security, and technical skills. More added regularly."],
                            ["Read the challenge", "Each lesson gives you a scenario, question, or task that requires genuine thinking."],
                            ["Write your answer", "No word banks, no checkboxes. You explain it in your own words."],
                            ["Get graded", "Ollama grades your answer against a per-criterion rubric and gives written feedback."],
                            ["Earn a certificate", "Pass enough lessons in a course at 70%+ and you can generate a certificate."],
                        ].map(([step, desc]) => (
                            <div key={step} className="rounded-xl border border-white/10 bg-rock-card p-5 flex gap-4">
                                <span aria-hidden="true" className="text-rock-yellow font-black text-lg shrink-0">→</span>
                                <div>
                                    <p className="font-black text-white tracking-tight">{step}</p>
                                    <p className="text-sm text-slate-500 mt-0.5">{desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Sub-page cards */}
                <section aria-labelledby="links-heading">
                    <h2 id="links-heading" className="text-xs font-black uppercase tracking-widest text-rock-yellow mb-4">
                        More Info
                    </h2>
                    <div className="space-y-3">
                        {CARDS.map((card) => (
                            <Link
                                key={card.href}
                                href={card.href}
                                className="group block rounded-xl border border-white/10 bg-rock-card
                                           hover:border-rock-yellow/30 hover:bg-[#161616] transition-all p-5
                                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rock-yellow"
                            >
                                <div className="flex items-start gap-4">
                                    <span aria-hidden="true" className="text-2xl shrink-0 mt-0.5">{card.icon}</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-black text-white group-hover:text-rock-yellow transition-colors tracking-tight">
                                            {card.title}
                                        </p>
                                        <p className="text-sm text-slate-500 mt-0.5">{card.description}</p>
                                    </div>
                                    <span aria-hidden="true" className="text-slate-600 group-hover:text-rock-yellow transition-colors shrink-0 mt-0.5">→</span>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>

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
