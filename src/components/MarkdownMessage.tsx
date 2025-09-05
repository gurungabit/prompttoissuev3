"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import * as shiki from "shiki";
import "../styles/markdown.css";
// icons not needed here; Chat contains message-level actions

// Code blocks render at full height; no internal scrolling

// Singleton highlighter (bundled) for browser without async plugins in react-markdown
let highlighterPromise: Promise<shiki.HighlighterGeneric<shiki.BundledLanguage, shiki.BundledTheme>> | null = null;
const SUPPORTED_LANGS = new Set<string>(Object.keys(shiki.bundledLanguages).map((k) => k.toLowerCase()));
const LANG_ALIASES: Record<string, string> = {
  yml: "yaml",
  shell: "bash",
  sh: "bash",
  md: "markdown",
  plaintext: "plaintext",
  plain: "plaintext",
  text: "plaintext",
  csharp: "csharp",
  "c#": "csharp",
  cpp: "cpp",
  "c++": "cpp",
};
const LANGS_TO_LOAD = [
  "ts",
  "tsx",
  "js",
  "jsx",
  "json",
  "bash",
  "shell",
  "python",
  "go",
  "rust",
  "md",
  "yaml",
  "toml",
  "html",
  "css",
  "plaintext",
] as const;
const LOADED_LANGS = new Set<string>(LANGS_TO_LOAD);

function resolveLang(input: string | undefined): { safe: shiki.BundledLanguage | "plaintext"; display: string; canon: string } {
  const raw = (input ?? "").toLowerCase();
  const canon = LANG_ALIASES[raw] ?? raw;
  if (SUPPORTED_LANGS.has(canon)) return { safe: canon as shiki.BundledLanguage, display: canon, canon };
  // Fallback for unknown/partial languages during streaming
  return { safe: "plaintext", display: raw || "plaintext", canon };
}
function getHighlighter() {
  if (!highlighterPromise) {
    const createBundled = shiki.createdBundledHighlighter({
      langs: shiki.bundledLanguages,
      themes: shiki.bundledThemes,
      engine: shiki.createJavaScriptRegexEngine,
    });
    highlighterPromise = createBundled({
      themes: ["github-light-default", "github-dark-default"],
      langs: LANGS_TO_LOAD as unknown as any,
    });
  }
  return highlighterPromise;
}

type MarkdownMessageProps = {
  content: string;
};

// Toolbar + wrapper around a code block (client-side Shiki highlight)
function CodeBlockWrapper({ children }: { children: React.ReactNode }) {
  const child = children as any;
  const raw = typeof child?.props?.children === "string"
    ? (child.props.children as string)
    : Array.isArray(child?.props?.children)
      ? (child.props.children.join("") as string)
      : "";
  const className = (child?.props?.className as string | undefined) ?? "";
  const match = className.match(/language-([\w-]+)/);
  const rawLang = match?.[1] ?? "plaintext";
  const { safe: safeLang, display: displayLang, canon } = resolveLang(rawLang);
  const highlightable = LOADED_LANGS.has(canon);

  const [lineCount, setLineCount] = useState<number>(0);
  const [copied, setCopied] = useState(false);
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    const count = raw.split("\n").length;
    setLineCount(count);
  }, [raw]);

  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    let mounted = true;
    if (!highlightable) {
      // If not highlightable (unknown or partial), render plain <pre>
      setHtml(null);
      return () => { mounted = false; };
    }
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(async () => {
      try {
        const highlighter = await getHighlighter();
        const themeAttr = document.documentElement.getAttribute("data-theme");
        const theme = themeAttr === "dark" ? "github-dark-default" : "github-light-default";
        let htmlOut = highlighter.codeToHtml(raw, { lang: safeLang as shiki.BundledLanguage, theme });
        htmlOut = htmlOut.replace(
          "<code>",
          '<code style="white-space: pre-wrap; word-break: break-word; overflow-wrap: anywhere;">',
        );
        if (mounted) setHtml(htmlOut);
      } catch {
        if (mounted) setHtml(null);
      }
    }, 80);
    return () => {
      mounted = false;
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [raw, safeLang, highlightable]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(raw);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  };

  return (
    <div className="group relative rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[color:var(--color-border)] text-[color:var(--color-muted)]">
        <div className="text-xs uppercase tracking-wider">
          {displayLang}
          {lineCount > 0 && <span className="ml-2 text-[color:var(--color-muted)]">{lineCount} lines</span>}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="px-2 py-1 text-xs rounded bg-[color:var(--color-card)] border border-[color:var(--color-border)] hover:bg-[color:var(--color-surface)] text-[color:var(--color-text)] cursor-pointer"
            aria-label={copied ? "Copied" : "Copy code"}
          >
            {copied ? "Copied" : "Copy"}
          </button>
          {/* Removed expand/collapse; scrolling inside the code area is sufficient */}
        </div>
      </div>

      {/* Code body */}
      <div className="relative">
        {html ? (
          <div className="!m-0 !rounded-none" dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <pre className="!m-0 !rounded-none"><code style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{raw}</code></pre>
        )}
      </div>
    </div>
  );
}

export function MarkdownMessage({ content }: MarkdownMessageProps) {
  const normalized = useMemo(() => (content ?? ""), [content]);

  const components: Components = {
    // Links open in new tab with security attrs
    a: ({ node, href, children, ...props }) => (
      <a
        href={href ?? "#"}
        target="_blank"
        rel="noopener noreferrer"
        className="underline text-[color:var(--color-primary)] hover:opacity-90"
        {...props}
      >
        {children}
      </a>
    ),
    // Responsive tables
    table: ({ children }) => (
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse border border-[color:var(--color-border)]">{children}</table>
      </div>
    ),
    th: ({ children }) => (
      <th className="border border-[color:var(--color-border)] px-2 py-1 text-left">{children}</th>
    ),
    td: ({ children }) => (
      <td className="border border-[color:var(--color-border)] px-2 py-1 align-top">{children}</td>
    ),
    // Inline and block code
    code: (rawProps) => {
      type CodePropsLike = React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        inline?: boolean;
        className?: string;
        children?: React.ReactNode;
      };
      const { inline, children, className, ...props } = rawProps as CodePropsLike;
      const lang = (className || "").match(/language-([\w-]+)/)?.[1]?.toLowerCase();
      const proseLangs = new Set(["markdown", "md", "mdx", "text", "plaintext", "plain"]);
      if (inline) {
        return (
          <code
            className="px-1.5 py-0.5 rounded bg-[color:var(--color-card)] text-[color:var(--color-text)] border border-[color:var(--color-border)]"
            {...props}
          >
            {children}
          </code>
        );
      }
      // If the code block is actually Markdown/plaintext prose, render it as Markdown
      if (lang && proseLangs.has(lang)) {
        const inner = Array.isArray(children) ? children.join("") : String(children ?? "");
        return (
          <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml components={components}>
            {inner}
          </ReactMarkdown>
        );
      }
      // Block code will be further highlighted via rehype-pretty-code; wrap with toolbar via custom pre
      return (
        <code className={className} {...props}>
          {children}
        </code>
      );
    },
    // Wrap highlighted blocks with our toolbar container
    pre: ({ children }) => <CodeBlockWrapper>{children}</CodeBlockWrapper>,
    // Images: constrain size
    img: ({ src, alt }) => (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src ?? ""}
        alt={alt ?? ""}
        className="max-w-full h-auto rounded border border-[color:var(--color-border)]"
        loading="lazy"
      />
    ),
  };

  return (
    <div className="markdown-body max-w-none text-[color:var(--color-text)]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        // Security: do not allow raw HTML
        skipHtml
        components={components}
      >
        {normalized}
      </ReactMarkdown>
    </div>
  );
}

export default MarkdownMessage;
