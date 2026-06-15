/**
 * PostHog reverse-proxy helper for e.gothiclockbreaker.com
 *
 * Merge `serveRobotsTxt` at the top of your existing PostHog Cloudflare Worker
 * (Workers & Pages → e.gothiclockbreaker.com route). Do not deploy this file
 * standalone — it would break analytics ingestion.
 *
 * After deploy, verify:
 *   curl -s https://e.gothiclockbreaker.com/robots.txt
 * → User-agent: *\nDisallow: /
 */

const ROBOTS_BODY = "User-agent: *\nDisallow: /\n";

/**
 * @param {Request} request
 * @returns {Response | null} robots.txt response, or null to continue proxying
 */
export function serveRobotsTxt(request) {
  const { pathname } = new URL(request.url);
  if (pathname !== "/robots.txt") return null;
  return new Response(ROBOTS_BODY, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}

// --- Example integration (paste into your PostHog worker fetch handler) ---
//
// import { serveRobotsTxt } from "./e-subdomain-robots-snippet.mjs";
//
// export default {
//   async fetch(request, env, ctx) {
//     const robots = serveRobotsTxt(request);
//     if (robots) return robots;
//     // ... existing PostHog reverse-proxy logic ...
//   },
// };
