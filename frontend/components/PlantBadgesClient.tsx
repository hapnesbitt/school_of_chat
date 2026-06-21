"use client";

// Earned-badges section on the plant-badge course page. Reads the badges
// the logged-in user has earned (one per plant article passed at 70%+) and
// renders them as chips. Unobtrusive when there are no badges yet.

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";

interface BadgeSummary {
    article_id: string;
    title: string;
    score: number;
    pct: number;
    common?: string;
    latin?: string;
}

interface BadgesResponse {
    course_slug: string;
    course_title: string;
    badges: BadgeSummary[];
    count: number;
}

export default function PlantBadgesClient({
    backendUrl,
    courseSlug,
}: {
    backendUrl: string;
    courseSlug: string;
}) {
    const { data: session } = useSession();
    const [data, setData] = useState<BadgesResponse | null>(null);

    useEffect(() => {
        const userId = session?.user?.id;
        if (!userId) return;
        fetch(`${backendUrl}/api/badges/${userId}/${courseSlug}`)
            .then((r) => (r.ok ? r.json() : null))
            .then(setData)
            .catch(() => {});
    }, [session?.user?.id, backendUrl, courseSlug]);

    // Signed-out users: no banner. The "How this works" copy above already
    // explains the badge mechanic; we don't need a sign-in nag here.
    if (!session?.user?.id || !data) return null;

    if (data.count === 0) {
        return (
            <div className="rounded-xl border border-white/10 bg-rock-card/60 px-5 py-4 mb-8">
                <p className="text-xs text-slate-500 leading-relaxed">
                    🌱 No badges yet. Pass any plant&apos;s quiz at 70%+ to earn its merit badge.
                </p>
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-rock-yellow/30 bg-rock-yellow/5 px-5 py-4 mb-8">
            <div className="flex items-center justify-between gap-3 mb-3">
                <p className="text-xs text-rock-yellow font-black uppercase tracking-widest">
                    🌱 {data.count} merit {data.count === 1 ? "badge" : "badges"} earned
                </p>
            </div>
            <ul className="flex flex-wrap gap-2">
                {data.badges.map((b) => (
                    <li key={b.article_id}>
                        <Link
                            href={`/badge/${session.user!.id}/${courseSlug}/${b.article_id}`}
                            className="inline-flex items-center gap-2 rounded-full border border-rock-yellow/30
                                       bg-rock-yellow/10 hover:bg-rock-yellow/20 hover:border-rock-yellow/50 transition-colors
                                       px-3 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rock-yellow"
                            aria-label={`View ${b.common ?? b.title} badge`}
                        >
                            <span className="font-black text-rock-yellow">
                                {b.common ?? b.title}
                            </span>
                            <span className="text-slate-500">{b.pct}%</span>
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    );
}
