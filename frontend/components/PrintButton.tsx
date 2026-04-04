"use client";

export default function PrintButton() {
    return (
        <button
            onClick={() => window.print()}
            className="text-sm text-rock-yellow hover:text-amber-300 transition-colors"
        >
            Print / Save as PDF
        </button>
    );
}
