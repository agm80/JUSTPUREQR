import type { Plugin } from "vite";

/**
 * Performance-oriented HTML post-processing plugin.
 *
 *  1. Hoists the entry JS as `<link rel="modulepreload" crossorigin>` to the
 *     very top of `<head>` so the browser can begin fetching the main bundle
 *     in parallel with the rest of the head, shrinking the Critical Request
 *     Chain that Lighthouse reports.
 *
 *  2. Rewrites the auto-injected `<link rel="stylesheet" href="...">` for
 *     entry CSS into an asynchronous preload pattern:
 *       <link rel="preload" as="style" ... onload="this.rel='stylesheet'">
 *       <noscript><link rel="stylesheet" ...></noscript>
 *     This removes the render-blocking CSS request from the initial paint
 *     path. The inline critical CSS in index.html keeps the above-the-fold
 *     skeleton from flashing while the full stylesheet streams in.
 *
 * Only runs during `vite build` (not dev), and only on the html that Vite
 * already injected its tags into (`order: 'post'`).
 */
export function perfHtmlPlugin(): Plugin {
  return {
    name: "qr-generator:perf-html",
    apply: "build",
    transformIndexHtml: {
      order: "post",
      handler(html) {
        let out = html;

        // 1. Convert blocking <link rel="stylesheet" ...> tags injected by Vite
        //    into the async preload pattern. We rewrite ALL stylesheet links
        //    that point at hashed bundle assets — third-party / external
        //    stylesheets are not matched because we anchor on the typical
        //    Vite output path.
        const stylesheetRe =
          /<link\s+rel="stylesheet"([^>]*?)href="([^"]*\/assets\/[^"]+\.css)"([^>]*)>/g;
        out = out.replace(stylesheetRe, (_match, pre, href, post) => {
          const otherAttrs = `${pre}${post}`
            .replace(/\s*rel="[^"]*"/g, "")
            .replace(/\s+/g, " ")
            .trim();
          const attrs = otherAttrs ? ` ${otherAttrs}` : "";
          return (
            `<link rel="preload" as="style" href="${href}"${attrs} ` +
            `onload="this.onload=null;this.rel='stylesheet'">` +
            `\n    <noscript><link rel="stylesheet" href="${href}"${attrs}></noscript>`
          );
        });

        // 2. Find the entry module script Vite injected and add a
        //    `<link rel="modulepreload">` for it near the top of <head>.
        //    modulepreload is the correct preload mechanism for ES modules
        //    and is what Lighthouse expects for module entries.
        const entryScriptRe =
          /<script\s+type="module"\s+crossorigin\s+src="([^"]*\/assets\/[^"]+\.js)"\s*>\s*<\/script>/;
        const entryMatch = out.match(entryScriptRe);
        if (entryMatch) {
          const entryHref = entryMatch[1];
          const preloadTag = `<link rel="modulepreload" as="script" crossorigin href="${entryHref}">`;
          // Insert right after <head> so it is the very first hint the parser
          // sees (above even the resource hints we keep there for fonts).
          out = out.replace(
            /<head>\s*/,
            `<head>\n    ${preloadTag}\n    `,
          );
        }

        return out;
      },
    },
  };
}
