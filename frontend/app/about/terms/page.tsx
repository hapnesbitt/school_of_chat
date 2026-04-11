import Link from "next/link";
import UserMenu from "@/components/UserMenu";

export const metadata = {
    title: "Terms of Service — School of Chat",
    description: "Terms of Service for School of Chat.",
};

function Section({ id, icon, title, children }: {
    id: string;
    icon: string;
    title: string;
    children: React.ReactNode;
}) {
    return (
        <section aria-labelledby={id} className="rounded-xl border border-white/10 bg-rock-card p-7">
            <div className="flex items-center gap-3 mb-5">
                <span aria-hidden="true" className="text-2xl">{icon}</span>
                <h2 id={id} className="font-black text-white text-lg tracking-tight">{title}</h2>
            </div>
            <div className="space-y-3 text-slate-400 leading-relaxed text-sm">
                {children}
            </div>
        </section>
    );
}

export default function TermsPage() {
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
                        {" "}/{" "}Terms of Service
                    </p>
                    <h1 className="text-4xl sm:text-5xl font-black text-white mb-4 leading-tight tracking-tighter">
                        Terms of Service
                    </h1>
                    <p className="text-slate-500 text-sm">Last updated: April 2026</p>
                </header>

                <div className="space-y-4">

                    <Section id="use-heading" icon="🎸" title="Using School of Chat">
                        <p>
                            School of Chat is a free practice platform for workplace compliance training and
                            certification prep. By using it, you agree to these terms.
                        </p>
                        <p>
                            You may use School of Chat for personal learning, professional development, and
                            exam preparation. You may not use it to cheat on actual employer compliance
                            assessments or certifications by representing AI-graded practice results as
                            official completions.
                        </p>
                    </Section>

                    <Section id="accounts-heading" icon="👤" title="Accounts">
                        <p>
                            Sign-in is optional. You can browse courses and start lessons without an account.
                            Signing in via Google enables progress tracking and certificate generation.
                            We never store your password — authentication is handled entirely by Google OAuth.
                        </p>
                        <p>
                            You are responsible for activity on your account. If you believe your account has
                            been compromised, revoke access through your Google account settings.
                        </p>
                    </Section>

                    <Section id="content-heading" icon="📝" title="Your Answers and Content">
                        <p>
                            The answers you write are yours. We use them only to grade your lesson and to
                            store your progress. We do not use your answers to train AI models. We do not
                            sell or share your answers with third parties.
                        </p>
                        <p>
                            Please don&rsquo;t submit personal information, confidential business data, or
                            anything you wouldn&rsquo;t want processed by a local AI model. School of Chat
                            is a practice environment — treat it like one.
                        </p>
                    </Section>

                    <Section id="conduct-heading" icon="🚫" title="Prohibited Conduct">
                        <p>Don&rsquo;t use School of Chat to:</p>
                        <ul className="list-disc list-inside space-y-1 text-slate-500">
                            <li>Submit malicious content designed to break the grading system</li>
                            <li>Attempt to extract or reverse-engineer lesson rubrics through systematic probing</li>
                            <li>Automate lesson submissions at scale</li>
                            <li>Misrepresent practice certificates as official compliance completions</li>
                        </ul>
                    </Section>

                    <Section id="availability-heading" icon="⚡" title="Availability and Accuracy">
                        <p>
                            School of Chat is provided as-is. Grading is performed by a local AI model (Ollama)
                            and is not perfect. The AI can make mistakes. Scores are useful signals, not
                            authoritative assessments. If a grade seems wrong, it might be.
                        </p>
                        <p>
                            We make no guarantee of uptime or availability. The service may be slow when the
                            cloud AI model is unavailable and grading falls back to a smaller local model.
                            Dynamic courses (Reading Comprehension) require cloud AI and may be unavailable
                            during outages.
                        </p>
                        <p>
                            School of Chat is not a substitute for official employer compliance training or
                            accredited certification programmes. Certificates generated here have no legal
                            standing and are not recognised by certification bodies.
                        </p>
                    </Section>

                    <Section id="ip-heading" icon="©️" title="Intellectual Property">
                        <p>
                            Course content, lesson text, and rubrics are the property of School of Chat.
                            You may use them for personal study. You may not reproduce, republish, or resell
                            course content without permission.
                        </p>
                        <p>
                            The answers you write belong to you. By submitting them, you grant School of Chat
                            a limited licence to process and store them for the purpose of grading and
                            progress tracking.
                        </p>
                    </Section>

                    <Section id="liability-heading" icon="⚖️" title="Liability">
                        <p>
                            School of Chat is provided for educational purposes only. We are not liable for
                            losses arising from reliance on scores, course content, or certificates generated
                            by this platform. Use your own judgement. Verify important information independently.
                        </p>
                    </Section>

                    <Section id="changes-heading" icon="🔄" title="Changes to These Terms">
                        <p>
                            We may update these terms at any time. Material changes will be reflected in
                            the &ldquo;Last updated&rdquo; date above. Continued use of School of Chat
                            after changes are posted constitutes acceptance.
                        </p>
                    </Section>

                    <div className="rounded-xl border border-white/10 bg-rock-card p-6 text-center mt-6">
                        <p className="text-slate-500 text-sm mb-3">Questions about these terms?</p>
                        <div className="flex gap-4 justify-center flex-wrap text-sm">
                            <Link href="/about/contact" className="text-rock-yellow hover:underline focus-visible:outline-none focus-visible:underline">
                                Contact us
                            </Link>
                            <span aria-hidden="true" className="text-slate-700">·</span>
                            <Link href="/about/privacy" className="text-rock-yellow hover:underline focus-visible:outline-none focus-visible:underline">
                                Privacy Policy
                            </Link>
                        </div>
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
