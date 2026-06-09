"use client";

import ReactMarkdown from "react-markdown";

interface MarkdownRendererProps {
  content: string;
  className?: string;
  compact?: boolean;
}

/**
 * Cyberpunk-themed markdown renderer for ORB.
 * Wraps react-markdown with custom styling matching the monospace military aesthetic.
 */
export default function MarkdownRenderer({
  content,
  className = "",
  compact = false,
}: MarkdownRendererProps) {
  return (
    <div className={`orb-markdown ${compact ? "orb-markdown-compact" : ""} ${className}`}>
      <ReactMarkdown
        components={{
          h1: ({ children }) => (
            <h1 className="text-[11px] font-extrabold text-white uppercase tracking-widest border-b border-white/20 pb-1 mb-2 mt-3 first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-[10px] font-extrabold text-white uppercase tracking-wider border-b border-white/10 pb-0.5 mb-1.5 mt-2.5 first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-[9.5px] font-bold text-white uppercase tracking-wide mb-1 mt-2 first:mt-0">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-[9px] font-bold text-neutral-200 uppercase tracking-wide mb-0.5 mt-1.5 first:mt-0">
              {children}
            </h4>
          ),
          p: ({ children }) => (
            <p className="text-[8.5px] text-neutral-200 leading-relaxed mb-1.5 last:mb-0">
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="flex flex-col gap-0.5 mb-1.5 ml-1">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="flex flex-col gap-0.5 mb-1.5 ml-1 list-decimal list-inside">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="text-[8.5px] text-neutral-200 leading-relaxed flex gap-1">
              <span className="text-white/50 shrink-0 mt-[1px]">▸</span>
              <span className="flex-1">{children}</span>
            </li>
          ),
          strong: ({ children }) => (
            <strong className="text-white font-extrabold">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="text-neutral-400 italic">{children}</em>
          ),
          code: ({ children, className: codeClassName }) => {
            // Check if inline or block code
            const isBlock = codeClassName?.startsWith("language-");
            if (isBlock) {
              return (
                <code className="block bg-black/60 border border-white/10 p-2 text-[8px] font-mono text-neutral-300 overflow-x-auto my-1.5">
                  {children}
                </code>
              );
            }
            return (
              <code className="bg-white/10 border border-white/5 px-1 py-0.5 text-[8px] font-mono text-white">
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="bg-black/60 border border-white/10 p-2 text-[8px] font-mono text-neutral-300 overflow-x-auto my-1.5 rounded-none">
              {children}
            </pre>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-white/30 pl-2.5 my-1.5 text-neutral-400 italic text-[8px]">
              {children}
            </blockquote>
          ),
          hr: () => (
            <hr className="border-white/10 my-2" />
          ),
          a: ({ children, href }) => (
            <a
              href={href}
              className="text-white underline underline-offset-2 hover:text-neutral-300 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-1.5">
              <table className="w-full text-[8px] border border-white/10">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-white/10 text-white font-bold uppercase">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-white/5">{children}</tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-white/5 transition-colors">
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className="px-2 py-1 text-left text-[7.5px] tracking-wider border-b border-white/10">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-2 py-1 text-neutral-300 border-b border-white/5">
              {children}
            </td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
