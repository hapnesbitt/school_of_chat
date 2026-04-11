import Link from "next/link";
import UserMenu from "@/components/UserMenu";

export const metadata = {
    title: "Privacy Policy — School of Chat",
    description: "Privacy policy for School of Chat. What we collect, what we don't, and how Ollama keeps your data local.",
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

export default function PrivacyPage() {
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
                        {" "}/{" "}Privacy Policy
                    </p>
                    <h1 className="text-4xl sm:text-5xl font-black text-white mb-4 leading-tight tracking-tighter">
                        Privacy Policy
                    </h1>
                    <p className="text-slate-500 text-sm">Last updated: April 2026</p>
                </header>

                <div className="space-y-4">

                    {/* Ollama callout — lead with the most important thing */}
                    <div className="rounded-xl border border-rock-yellow/20 bg-rock-card p-6 mb-2">
                        <div className="flex gap-4">
                            <span aria-hidden="true" className="text-2xl shrink-0">⚡</span>
                            <div>
                                <p className="font-black text-white tracking-tight mb-2">
                                    Grading happens locally on our server via Ollama
                                </p>
                                <p className="text-sm text-slate-400 leading-relaxed">
                                    Your answers are processed by a self-hosted Ollama instance — not sent to
                                    OpenAI, Anthropic, or any third-party AI service. The cloud model
                                    (used for Reading Comprehension and grading when available) runs on our
                                    own infrastructure. Your data does not leave our servers to be processed
                                    by external AI providers.
                                </p>
                            </div>
                        </div>
                    </div>

                    <Section id="collect-heading" icon="📊" title="What We Collect">
                        <p>
                            School of Chat collects the minimum data needed to operate the service.
                        </p>
                        <ul className="list-disc list-inside space-y-2 text-slate-500">
                            <li>
                                <span className="text-slate-300 font-semibold">Progress data:</span> Your lesson scores,
                                answers, and completion status — stored in Redis, keyed to your user ID.
                                Retained for 90 days.
                            </li>
                            <li>
                                <span className="text-slate-300 font-semibold">Certificate records:</span> The date a
                                certificate was issued for a course, linked to your user ID. Retained indefinitely
                                unless you request deletion.
                            </li>
                            <li>
                                <span className="text-slate-300 font-semibold">Display name:</span> If you set one
                                for your certificate, it is stored in Redis linked to your user ID.
                            </li>
                            <li>
                                <span className="text-slate-300 font-semibold">Authentication data:</span> If you sign
                                in with Google, we receive your name and email address from Google OAuth and use
                                them only to identify your session. We do not store your password.
                            </li>
                            <li>
                                <span className="text-slate-300 font-semibold">Server logs:</span> Standard web server
                                logs (IP address, request path, timestamp) retained for operational and security
                                purposes. Not linked to your identity.
                            </li>
                        </ul>
                    </Section>

                    <Section id="not-collect-heading" icon="🚫" title="What We Don't Collect">
                        <ul className="list-disc list-inside space-y-1 text-slate-500">
                            <li>We do not run advertising or analytics trackers</li>
                            <li>We do not use cookies beyond what is required for session authentication</li>
                            <li>We do not build profiles for marketing purposes</li>
                            <li>We do not collect payment information — School of Chat is free</li>
                            <li>We do not collect information about your activity on other websites</li>
                        </ul>
                    </Section>

                    <Section id="ai-heading" icon="🤖" title="AI Processing and Your Answers">
                        <p>
                            When you submit a lesson answer, it is sent to our Ollama instance for grading.
                            Ollama runs on our own hardware. Your answers are not forwarded to external AI
                            providers such as OpenAI or Anthropic.
                        </p>
                        <p>
                            The Reading Comprehension course uses a cloud model hosted on our own
                            infrastructure (not a third-party API) to generate questions and grade answers.
                            When the cloud model is unavailable, grading falls back to a smaller local model.
                        </p>
                        <p>
                            Your answers are never used to train AI models. They are processed for grading
                            and then stored in Redis for 90 days so you can review your results. After 90 days,
                            they expire automatically.
                        </p>
                        <p>
                            We do not sell, share, or otherwise transfer your answers to any third party.
                        </p>
                    </Section>

                    <Section id="auth-heading" icon="🔑" title="Authentication">
                        <p>
                            Sign-in is optional and handled via Google OAuth. When you sign in, Google
                            authenticates you and passes your name and email to our server to identify your
                            session. We never see or store your Google password.
                        </p>
                        <p>
                            You can use School of Chat without signing in. Without an account, progress is
                            stored in your browser session only and will be lost when you close the tab.
                        </p>
                        <p>
                            Google&rsquo;s authentication request is subject to Google&rsquo;s own privacy
                            policy.
                        </p>
                    </Section>

                    <Section id="sharing-heading" icon="🤝" title="Data Sharing">
                        <p>
                            We do not sell your data. We do not share your data with advertisers,
                            data brokers, or marketing platforms. We do not share your data with any
                            third party except as required by law.
                        </p>
                        <p>
                            If we are required by law to disclose data, we will comply with that
                            requirement and, where legally permitted, notify affected users.
                        </p>
                    </Section>

                    <Section id="deletion-heading" icon="🗑️" title="Data Deletion">
                        <p>
                            Progress data expires automatically after 90 days. Certificate records are retained
                            indefinitely so you can retrieve your certificate later, but can be deleted on request.
                        </p>
                        <p>
                            To request deletion of your data, email{" "}
                            <a href="mailto:rossnesbitt@gmail.com" className="text-rock-yellow hover:underline">
                                rossnesbitt@gmail.com
                            </a>{" "}
                            with the subject &ldquo;Data deletion request&rdquo; and your user ID or the email
                            address you signed in with.
                        </p>
                    </Section>

                    <Section id="changes-heading" icon="🔄" title="Changes to This Policy">
                        <p>
                            We may update this policy to reflect changes to the service or legal requirements.
                            Material changes will be reflected in the &ldquo;Last updated&rdquo; date above.
                            Continued use of School of Chat after a policy update constitutes acceptance.
                        </p>
                    </Section>

                    <div className="rounded-xl border border-white/10 bg-rock-card p-6 text-center mt-6">
                        <p className="text-slate-500 text-sm mb-3">Questions about your data?</p>
                        <div className="flex gap-4 justify-center flex-wrap text-sm">
                            <Link href="/about/contact" className="text-rock-yellow hover:underline focus-visible:outline-none focus-visible:underline">
                                Contact us
                            </Link>
                            <span aria-hidden="true" className="text-slate-700">·</span>
                            <Link href="/about/terms" className="text-rock-yellow hover:underline focus-visible:outline-none focus-visible:underline">
                                Terms of Service
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
