import Link from "next/link";
import UserMenu from "@/components/UserMenu";

interface Course {
    slug: string;
    title: string;
    tagline: string;
    description: string;
    icon: string;
    lesson_count: number;
}

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

export default async function HomePage() {
    const courses = await getCourses();

    return (
        <div className="min-h-screen bg-rock-bg text-slate-200">
            <nav className="border-b border-white/5 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className="text-2xl">🎸</span>
                    <span className="font-black text-white text-lg tracking-tight">School of Chat</span>
                </div>
                <UserMenu />
            </nav>

            {/* Hero */}
            <div className="px-6 pt-20 pb-12 max-w-3xl mx-auto text-center">
                <div className="text-6xl mb-6">🎸</div>
                <h1 className="text-5xl sm:text-6xl font-black text-white mb-4 leading-tight tracking-tighter">
                    School of <span className="text-rock-yellow">Chat</span>
                </h1>
                <p className="text-xl text-slate-400 mb-2">
                    Typed answers. Real AI. Actual grading.
                </p>
                <p className="text-slate-500">
                    No multiple choice. No theory slides. Pick a course and start.
                </p>
            </div>

            {/* Course grid */}
            <div className="px-6 pb-24 max-w-2xl mx-auto">
                <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-6">
                    Courses
                </h2>

                {courses.length === 0 ? (
                    <div className="rounded-xl border border-white/10 bg-rock-card p-8 text-center text-slate-500">
                        Backend not responding. Run{" "}
                        <code className="text-rock-yellow font-mono text-sm">./claude_stack.sh start gunicorn</code>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {courses.map((course) => (
                            <Link
                                key={course.slug}
                                href={`/course/${course.slug}`}
                                className="group block rounded-xl border border-white/10 bg-rock-card
                                           hover:border-rock-yellow/30 hover:bg-[#161616] transition-all p-6"
                            >
                                <div className="flex items-start gap-5">
                                    <span className="text-3xl shrink-0 mt-0.5">{course.icon}</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-black text-white text-lg group-hover:text-rock-yellow transition-colors tracking-tight">
                                            {course.title}
                                        </p>
                                        <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                                            {course.tagline}
                                        </p>
                                        <p className="text-[11px] text-slate-600 mt-3 uppercase tracking-widest font-bold">
                                            {course.lesson_count} lessons · certificate available
                                        </p>
                                    </div>
                                    <span className="text-slate-600 group-hover:text-rock-yellow transition-colors shrink-0 mt-1">→</span>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            <footer className="border-t border-white/5 py-8 text-center text-xs text-slate-600">
                School of Chat · powered by <span className="text-rock-yellow">Ollama</span>
            </footer>
        </div>
    );
}
