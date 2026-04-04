"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";

interface CertCheck {
    eligible: boolean;
    course_slug: string;
    passed_count: number;
    needed?: number;
}

export default function CourseCertificateBanner({
    backendUrl,
    courseSlug,
}: {
    backendUrl: string;
    courseSlug: string;
}) {
    const { data: session } = useSession();
    const [cert, setCert] = useState<CertCheck | null>(null);

    useEffect(() => {
        const userId = session?.user?.id;
        if (!userId) return;
        fetch(`${backendUrl}/api/certificate/${userId}/${courseSlug}`)
            .then(r => r.json())
            .then(setCert)
            .catch(() => {});
    }, [session?.user?.id, backendUrl, courseSlug]);

    if (!session || !cert) return null;

    if (cert.eligible) {
        return (
            <Link
                href={`/certificate/${session.user.id}/${courseSlug}`}
                className="flex items-center justify-between gap-4 rounded-xl border border-rock-yellow/30
                           bg-rock-yellow/5 px-5 py-4 hover:bg-rock-yellow/10 transition-all mb-8"
            >
                <div className="flex items-center gap-3">
                    <span className="text-2xl">🏆</span>
                    <div>
                        <p className="font-black text-rock-yellow text-sm">Certificate Earned</p>
                        <p className="text-xs text-slate-500">
                            You&apos;ve passed {cert.passed_count} lessons with 70+. Claim it.
                        </p>
                    </div>
                </div>
                <span className="text-rock-yellow text-sm font-bold shrink-0">View →</span>
            </Link>
        );
    }

    if (cert.passed_count > 0) {
        return (
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-rock-card
                            px-5 py-4 mb-8">
                <span className="text-xl">📋</span>
                <p className="text-xs text-slate-500">
                    <span className="text-slate-300 font-bold">{cert.passed_count}</span> lesson
                    {cert.passed_count !== 1 ? "s" : ""} passed with 70+
                    {" — "}
                    <span className="text-rock-yellow">{(cert.needed ?? 3) - cert.passed_count} more</span> for your certificate
                </p>
            </div>
        );
    }

    return null;
}
