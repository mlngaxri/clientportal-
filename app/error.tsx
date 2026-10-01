"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);
  return (
    <main className="route-state">
      <Link className="wordmark" href="/">
        fourthform
      </Link>
      <h1 ref={heading} tabIndex={-1}>We couldn’t open this page.</h1>
      <p>Try again to continue. Your saved work stays with your project.</p>
      <div>
        <button className="primary" onClick={reset}>
          Try again
        </button>
        <Link href="/">Back to Fourthform ↗</Link>
      </div>
    </main>
  );
}
