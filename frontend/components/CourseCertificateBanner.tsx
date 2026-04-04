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
                aria-label={`Certificate earned — view your certificate for this course`}
                className="flex items-center justify-between gap-4 rounded-xl border border-rock-yellow/30
                           bg-rock-yellow/5 px-5 py-4 hover:bg-rock-yellow/10 transition-all mb-8
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rock-yellow"
            >
                <div className="flex items-center gap-3">
                    <span aria-hidden="true" className="text-2xl">🏆</span>
                    <div>
                        <p className="font-black text-rock-yellow text-sm">Certificate Earned</p>
                        <p className="text-xs text-slate-500">
                            You&apos;ve passed {cert.passed_count} lessons with 70+. Claim it.
                        </p>
                    </div>
                </div>
                <span aria-hidden="true" className="text-rock-yellow text-sm font-bold shrink-0">View →</span>
            </Link>
        );
    }

    if (cert.passed_count > 0) {
        const remaining = (cert.needed ?? 3) - cert.passed_count;
        return (
            <div
                role="status"
                aria-label={`Progress: ${cert.passed_count} lesson${cert.passed_count !== 1 ? "s" : ""} passed, ${remaining} more needed for certificate`}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-rock-card
                            px-5 py-4 mb-8"
            >
                <span aria-hidden="true" className="text-xl">📋</span>
                <p className="text-xs text-slate-500">
                    <span className="text-slate-300 font-bold">{cert.passed_count}</span> lesson
                    {cert.passed_count !== 1 ? "s" : ""} passed with 70+
                    {" — "}
                    <span className="text-rock-yellow">{remaining} more</span> for your certificate
                </p>
            </div>
        );
    }

    return null;
}
