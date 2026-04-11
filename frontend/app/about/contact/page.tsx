import Link from "next/link";
import UserMenu from "@/components/UserMenu";

export const metadata = {
    title: "Contact — School of Chat",
    description: "Get in touch with the School of Chat team.",
};

export default function ContactPage() {
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
                    >
                        About
                    </Link>
                    <UserMenu />
                </div>
            </nav>

            <main className="px-6 pt-20 pb-24 max-w-2xl mx-auto">

                <header className="mb-12">
                    <p className="text-xs font-black uppercase tracking-widest text-rock-yellow mb-4">
                        <Link href="/about" className="hover:underline focus-visible:outline-none focus-visible:underline">About</Link>
                        {" "}/{" "}Contact
                    </p>
                    <h1 className="text-4xl sm:text-5xl font-black text-white mb-4 leading-tight tracking-tighter">
                        Contact
                    </h1>
                    <p className="text-slate-400 leading-relaxed">
                        Questions, bug reports, course suggestions, feedback — all welcome.
                    </p>
                </header>

                <section aria-labelledby="contact-heading" className="space-y-4 mb-16">
                    <h2 id="contact-heading" className="text-xs font-black uppercase tracking-widest text-rock-yellow mb-4">
                        Get in Touch
                    </h2>

                    <a
                        href="mailto:rossnesbitt@gmail.com"
                        className="group flex items-center gap-5 rounded-xl border border-white/10 bg-rock-card
                                   hover:border-rock-yellow/30 hover:bg-[#161616] transition-all p-6
                                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rock-yellow"
                        aria-label="Send email to rossnesbitt@gmail.com"
                    >
                        <span aria-hidden="true" className="text-3xl shrink-0">✉️</span>
                        <div className="flex-1 min-w-0">
                            <p className="font-black text-white group-hover:text-rock-yellow transition-colors tracking-tight">
                                Email
                            </p>
                            <p className="text-sm font-mono text-slate-400 mt-0.5">
                                rossnesbitt@gmail.com
                            </p>
                        </div>
                        <span aria-hidden="true" className="text-slate-600 group-hover:text-rock-yellow transition-colors shrink-0">→</span>
                    </a>
                </section>

                <section aria-labelledby="what-to-send-heading" className="mb-16">
                    <h2 id="what-to-send-heading" className="text-xs font-black uppercase tracking-widest text-rock-yellow mb-4">
                        What to Include
                    </h2>
                    <div className="space-y-3 text-slate-400 leading-relaxed">
                        <p>
                            If you&rsquo;re reporting a bug or grading issue, the course slug and lesson number help.
                            If you&rsquo;re suggesting a new course, a rough outline of the topic and who it&rsquo;s for
                            is enough to get the conversation started.
                        </p>
                        <p>
                            Turnaround is typically within a few days. There&rsquo;s no support ticket system —
                            just a person reading email.
                        </p>
                    </div>
                </section>

                <div className="rounded-xl border border-white/10 bg-rock-card p-6 text-center">
                    <p className="text-slate-500 text-sm mb-3">Looking for something else?</p>
                    <div className="flex gap-4 justify-center flex-wrap text-sm">
                        <Link href="/about/terms" className="text-rock-yellow hover:underline focus-visible:outline-none focus-visible:underline">
                            Terms of Service
                        </Link>
                        <span aria-hidden="true" className="text-slate-700">·</span>
                        <Link href="/about/privacy" className="text-rock-yellow hover:underline focus-visible:outline-none focus-visible:underline">
                            Privacy Policy
                        </Link>
                        <span aria-hidden="true" className="text-slate-700">·</span>
                        <Link href="/" className="text-rock-yellow hover:underline focus-visible:outline-none focus-visible:underline">
                            Back to courses
                        </Link>
                    </div>
                </div>

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
