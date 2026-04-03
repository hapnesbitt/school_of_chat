"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import Image from "next/image";
import { LogIn, LogOut, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

export default function UserMenu() {
    const { data: session, status } = useSession();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
        document.addEventListener("mousedown", handler);
        document.addEventListener("keydown", esc);
        return () => { document.removeEventListener("mousedown", handler); document.removeEventListener("keydown", esc); };
    }, [open]);

    if (status === "loading") {
        return <div className="h-8 w-24 rounded-lg bg-white/5 animate-pulse" />;
    }

    if (status === "unauthenticated") {
        return (
            <button
                onClick={() => signIn("google")}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold
                           bg-rock-yellow/10 text-rock-yellow border border-rock-yellow/30
                           hover:bg-rock-yellow/20 transition-all"
            >
                <LogIn className="h-4 w-4" />
                Sign in
            </button>
        );
    }

    const user = session!.user;

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setOpen(v => !v)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
            >
                {user.image ? (
                    <Image src={user.image} alt="" width={28} height={28} className="rounded-full ring-1 ring-white/10" />
                ) : (
                    <div className="h-7 w-7 rounded-full bg-rock-yellow/20 flex items-center justify-center text-xs font-bold text-rock-yellow">
                        {(user.name ?? user.email ?? "?")[0].toUpperCase()}
                    </div>
                )}
                <span className="text-sm text-slate-300 max-w-[120px] truncate">{user.name ?? user.email}</span>
                <ChevronDown className={cn("h-3.5 w-3.5 text-slate-500 transition-transform", open && "rotate-180")} />
            </button>

            {open && (
                <div className="absolute right-0 mt-1 w-48 rounded-xl border border-white/10 bg-[#111]/95 backdrop-blur shadow-xl z-50">
                    <div className="px-3 py-2 border-b border-white/10">
                        <p className="text-xs text-slate-400 truncate">{user.email}</p>
                    </div>
                    <div className="p-1">
                        <button
                            onClick={() => signOut({ redirect: false }).then(() => setOpen(false))}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-400
                                       hover:text-white hover:bg-white/5 transition-colors"
                        >
                            <LogOut className="h-4 w-4" />
                            Sign out
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
