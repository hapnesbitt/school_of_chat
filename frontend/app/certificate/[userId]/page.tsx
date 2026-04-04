import { redirect } from "next/navigation";

/**
 * Old single-cert URL — redirect to home so links don't 404.
 * Per-course certificates live at /certificate/[userId]/[courseSlug].
 */
export default async function CertificateIndexPage() {
    redirect("/");
}
