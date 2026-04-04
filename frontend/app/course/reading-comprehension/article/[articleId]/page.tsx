import { notFound } from "next/navigation";
import ArticleTestClient from "@/components/ArticleTestClient";

interface Article {
    id: string;
    title: string;
    source: string;
    category: string;
    published_at: string;
    text: string;
    word_count: number;
}

async function getArticle(articleId: string): Promise<Article | null> {
    const url = `${process.env.BACKEND_INTERNAL_URL ?? "http://localhost:5007"}/api/dynamic/article/${articleId}`;
    try {
        const res = await fetch(url, { cache: "no-store" });
        if (res.status === 404) return null;
        if (!res.ok) return null;
        return res.json();
    } catch {
        return null;
    }
}

export default async function ArticlePage({
    params,
}: {
    params: Promise<{ articleId: string }>;
}) {
    const { articleId } = await params;
    const article = await getArticle(articleId);
    if (!article) notFound();

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:5007";

    return <ArticleTestClient article={article} backendUrl={backendUrl} />;
}
