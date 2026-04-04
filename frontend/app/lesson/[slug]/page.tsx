import { notFound } from "next/navigation";
import LessonClient from "./LessonClient";

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
    lesson_type: string;
    course_slug: string;
    challenge: string;
    instructions: string;
    rubric: RubricItem[];
    max_tokens: number;
}

async function getLesson(slug: string): Promise<Lesson | null> {
    const url = `${process.env.BACKEND_INTERNAL_URL ?? "http://localhost:5007"}/api/lesson/${slug}`;
    try {
        const res = await fetch(url, { cache: "no-store" });
        if (res.status === 404) return null;
        if (!res.ok) return null;
        return res.json();
    } catch {
        return null;
    }
}

export default async function LessonPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const lesson = await getLesson(slug);
    if (!lesson) notFound();

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:5007";

    return <LessonClient lesson={lesson} backendUrl={backendUrl} />;
}
