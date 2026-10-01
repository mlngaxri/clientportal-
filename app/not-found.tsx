import Link from "next/link";
export default function NotFound() {
  return <main className="route-state"><Link className="wordmark" href="/">fourthform</Link><p className="overline">404</p><h1>This page hasn’t taken form.</h1><p>The link may have moved. Return to Fourthform or open the portal preview.</p><div><Link className="primary" href="/">Back to Fourthform</Link><Link href="/preview">Client portal ↗</Link></div></main>;
}
