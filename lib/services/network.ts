import { lookup } from "node:dns/promises";
import { request } from "node:https";
import { isIP } from "node:net";
import { domainToASCII } from "node:url";
export function publicHostname(value: string) {
  if (/[/\\:@?#%\s]/.test(value.trim()))
    throw new Error("Enter a public domain name, without a protocol or path.");
  const host = domainToASCII(value.trim().toLowerCase().replace(/\.$/, ""));
  if (
    !host ||
    host.length > 253 ||
    !host.includes(".") ||
    isIP(host) ||
    host
      .split(".")
      .some((p) => !/^([a-z0-9]|[a-z0-9][a-z0-9-]{0,61}[a-z0-9])$/.test(p)) ||
    /\.(local|localhost|internal|test|invalid|example|onion|arpa)$/.test(host)
  )
    throw new Error("Enter a public domain name, without a protocol or path.");
  return host;
}
export function publicAddress(address: string) {
  const v = isIP(address);
  if (v === 4) {
    const [a, b] = address.split(".").map(Number);
    return !(
      a === 0 ||
      a === 10 ||
      a === 127 ||
      a >= 224 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && (b === 168 || b === 0 || b === 2)) ||
      (a === 198 && (b === 18 || b === 19 || b === 51)) ||
      (a === 203 && b === 0) ||
      (a === 100 && b >= 64 && b <= 127)
    );
  }
  if (v === 6) {
    const a = address.toLowerCase();
    return (
      /^[23][0-9a-f]{0,3}:/.test(a) &&
      !a.startsWith("2001:db8:") &&
      !/^2001:(?:0:|:|2:|1[0-9a-f]:|2[0-9a-f]:)/.test(a) &&
      !a.startsWith("2002:") &&
      !a.startsWith("3fff:")
    );
  }
  return false;
}
/** DNS is resolved once and the verified address is pinned for the TLS connection. Redirects never follow. */
export async function publicHttps(
  url: string,
  headers: Record<string, string> = {},
) {
  const target = new URL(url);
  const host = publicHostname(target.hostname);
  if (
    target.protocol !== "https:" ||
    (target.port && target.port !== "443") ||
    target.username ||
    target.password
  )
    throw new Error("Use a public HTTPS website.");
  const addresses = await lookup(host, { all: true });
  if (!addresses.length || addresses.some((a) => !publicAddress(a.address)))
    throw new Error("This domain does not resolve to a public website.");
  const chosen = addresses[0];
  return new Promise<{
    status: number;
    body: string;
    headers: Record<string, string | undefined>;
  }>((resolve, reject) => {
    const req = request(
      target,
      {
        headers,
        servername: host,
        lookup: (_host, options, callback) =>
          options.all
            ? callback(null, [chosen])
            : callback(null, chosen.address, chosen.family),
        timeout: 12000,
      },
      (response) => {
        let size = 0;
        const chunks: Buffer[] = [];
        response.on("data", (chunk) => {
          size += chunk.length;
          if (size > 2_000_000) {
            req.destroy(new Error("Website response is too large."));
            return;
          }
          chunks.push(chunk);
        });
        response.on("end", () =>
          resolve({
            status: response.statusCode || 500,
            body: Buffer.concat(chunks).toString("utf8"),
            headers: Object.fromEntries(
              Object.entries(response.headers).map(([k, v]) => [
                k,
                Array.isArray(v) ? v.join(",") : v,
              ]),
            ),
          }),
        );
        response.on("error", reject);
      },
    );
    req.on("timeout", () =>
      req.destroy(new Error("Website did not respond in time.")),
    );
    req.on("error", reject);
    req.end();
  });
}
