"use client";

import Link from "next/link";

export function CodingSection() {
  return (
    <div className="card">
      <h3>Coding Challenges</h3>
      <p>Practice coding problems and improve your programming skills.</p>
      <Link
        className="btn primary"
        href="/coding"
        style={{ marginTop: 12, display: "inline-block" }}
      >
        Start Coding Questions
      </Link>
    </div>
  );
}
