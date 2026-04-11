import Link from "next/link";

export interface Course {
    slug: string;
    title: string;
    tagline: string;
    description: string;
    icon: string;
    tier: number;
    lesson_type: string;
    lesson_count: number;
}

export default function CourseCard({ course }: { course: Course }) {
    const meta = course.lesson_type === "dynamic"
        ? "Browse articles · certificate available · requires cloud AI"
        : `${course.lesson_count} lessons · certificate available`;

    return (
        <Link
            href={`/course/${course.slug}`}
            className="group block rounded-xl border border-white/10 bg-rock-card
                       hover:border-rock-yellow/30 hover:bg-[#161616] transition-all p-6
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rock-yellow"
        >
            <div className="flex items-start gap-5">
                <span aria-hidden="true" className="text-3xl shrink-0 mt-0.5">{course.icon}</span>
                <div className="flex-1 min-w-0">
                    <p className="font-black text-white text-lg group-hover:text-rock-yellow transition-colors tracking-tight">
                        {course.title}
                    </p>
                    <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                        {course.tagline}
                    </p>
                    <p className="text-[11px] text-slate-600 mt-3 uppercase tracking-widest font-bold">
                        {meta}
                    </p>
                </div>
                <span aria-hidden="true" className="text-slate-600 group-hover:text-rock-yellow transition-colors shrink-0 mt-1">→</span>
            </div>
        </Link>
    );
}
