"use client";

import React, { useState, useRef, useEffect } from "react";
import { TourOverviewRenderer } from "@/components/TourOverviewRenderer";

interface MarkdownEditorProps {
  name: string;
  defaultValue?: string;
  value?: string;
  onChange?: (val: string) => void;
  label?: React.ReactNode;
  placeholder?: string;
  rows?: number;
  className?: string;
  helperText?: React.ReactNode;
}

export function MarkdownEditor({
  name,
  defaultValue = "",
  value: controlledValue,
  onChange,
  label,
  placeholder,
  rows = 8,
  className = "",
  helperText,
}: MarkdownEditorProps) {
  const [mode, setMode] = useState<"write" | "preview">("write");
  const [content, setContent] = useState<string>(controlledValue ?? defaultValue ?? "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (controlledValue !== undefined) {
      setContent(controlledValue);
    }
  }, [controlledValue]);

  useEffect(() => {
    if (defaultValue !== undefined && controlledValue === undefined) {
      setContent(defaultValue);
    }
  }, [defaultValue, controlledValue]);

  function handleTextChange(newVal: string) {
    setContent(newVal);
    if (onChange) onChange(newVal);
  }

  function applyFormat(type: "bold" | "italic" | "h2" | "h3" | "ul" | "ol" | "quote" | "code") {
    const ta = textareaRef.current;
    if (!ta) return;

    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = content.slice(start, end);
    let replacement = "";
    let cursorOffset = 0;

    switch (type) {
      case "bold":
        replacement = selected ? `**${selected}**` : "**bold text**";
        cursorOffset = selected ? replacement.length : 2;
        break;
      case "italic":
        replacement = selected ? `*${selected}*` : "*italic text*";
        cursorOffset = selected ? replacement.length : 1;
        break;
      case "h2":
        replacement = selected ? `## ${selected}` : "## Heading 2\n";
        cursorOffset = replacement.length;
        break;
      case "h3":
        replacement = selected ? `### ${selected}` : "### Heading 3\n";
        cursorOffset = replacement.length;
        break;
      case "ul":
        if (selected) {
          replacement = selected
            .split("\n")
            .map((line) => (line.startsWith("- ") ? line : `- ${line}`))
            .join("\n");
        } else {
          replacement = "- List item\n";
        }
        cursorOffset = replacement.length;
        break;
      case "ol":
        if (selected) {
          replacement = selected
            .split("\n")
            .map((line, idx) => `${idx + 1}. ${line}`)
            .join("\n");
        } else {
          replacement = "1. First item\n";
        }
        cursorOffset = replacement.length;
        break;
      case "quote":
        if (selected) {
          replacement = selected
            .split("\n")
            .map((line) => `> ${line}`)
            .join("\n");
        } else {
          replacement = "> Quote text\n";
        }
        cursorOffset = replacement.length;
        break;
      case "code":
        replacement = selected ? `\`\`\`\n${selected}\n\`\`\`` : "```\ncode snippet\n```";
        cursorOffset = replacement.length;
        break;
    }

    const nextContent = content.slice(0, start) + replacement + content.slice(end);
    handleTextChange(nextContent);

    // Maintain focus and set selection position
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + cursorOffset, start + cursorOffset);
    }, 0);
  }

  // Safe inline formatter converting **bold**, *italic*, `code` to React nodes
  function renderInline(text: string): React.ReactNode {
    if (!text) return null;
    const parts: React.ReactNode[] = [];
    const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let key = 0;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }
      const token = match[0];
      if (token.startsWith("**") && token.endsWith("**")) {
        parts.push(
          <strong key={key++} className="font-bold text-slate-900">
            {token.slice(2, -2)}
          </strong>
        );
      } else if (token.startsWith("*") && token.endsWith("*")) {
        parts.push(
          <em key={key++} className="italic text-slate-800">
            {token.slice(1, -1)}
          </em>
        );
      } else if (token.startsWith("`") && token.endsWith("`")) {
        parts.push(
          <code
            key={key++}
            className="rounded bg-slate-100 px-1 py-0.5 text-xs font-mono text-emerald-700"
          >
            {token.slice(1, -1)}
          </code>
        );
      } else {
        parts.push(token);
      }
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }
    return parts.length > 0 ? parts : text;
  }

  // Live markdown renderer for preview mode - delegates to shared TourOverviewRenderer
  function renderMarkdownPreview(raw: string) {
    if (!raw || !raw.trim()) {
      return (
        <div className="py-8 text-center">
          <p className="text-slate-400 italic text-xs sm:text-sm">
            Nothing to preview yet. Switch back to Write mode to enter tour overview content.
          </p>
        </div>
      );
    }

    return <TourOverviewRenderer content={raw} />;
  }

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {/* Header with Title and Mode Switcher [Write] [Preview] */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-slate-800 text-xs font-semibold">
          {label || <span>Detailed Overview *</span>}
        </div>

        {/* Top-right Tab Switcher */}
        <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-100/90 p-0.5 shadow-2xs">
          <button
            type="button"
            onClick={() => setMode("write")}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition cursor-pointer ${
              mode === "write"
                ? "bg-white text-slate-900 shadow-xs font-semibold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
            <span>Write</span>
          </button>
          <button
            type="button"
            onClick={() => setMode("preview")}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition cursor-pointer ${
              mode === "preview"
                ? "bg-white text-emerald-800 shadow-xs font-semibold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <span>Preview</span>
          </button>
        </div>
      </div>

      {/* Main Editor Wrapper */}
      <div className="rounded-xl border border-slate-300 bg-white shadow-xs overflow-hidden focus-within:border-emerald-600 focus-within:ring-1 focus-within:ring-emerald-600 transition">
        {/* Formatting Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-1 border-b border-slate-200 bg-slate-50/80 px-2.5 py-1.5 text-xs text-slate-700">
          <div className="flex items-center gap-1">
            {/* Bold */}
            <button
              type="button"
              onClick={() => applyFormat("bold")}
              title="Bold (**text**)"
              className="flex h-7 w-7 items-center justify-center rounded hover:bg-slate-200/80 font-bold text-slate-800 transition cursor-pointer text-xs"
            >
              B
            </button>

            {/* Italic */}
            <button
              type="button"
              onClick={() => applyFormat("italic")}
              title="Italic (*text*)"
              className="flex h-7 w-7 items-center justify-center rounded hover:bg-slate-200/80 italic font-serif text-slate-800 transition cursor-pointer text-xs"
            >
              I
            </button>

            <span className="mx-1 h-4 w-px bg-slate-300" />

            {/* Heading 2 */}
            <button
              type="button"
              onClick={() => applyFormat("h2")}
              title="Heading 2 (## Title)"
              className="flex h-7 px-1.5 items-center justify-center rounded hover:bg-slate-200/80 font-semibold text-slate-800 transition cursor-pointer text-[11px]"
            >
              H₂
            </button>

            {/* Heading 3 */}
            <button
              type="button"
              onClick={() => applyFormat("h3")}
              title="Heading 3 (### Title)"
              className="flex h-7 px-1.5 items-center justify-center rounded hover:bg-slate-200/80 font-semibold text-slate-800 transition cursor-pointer text-[11px]"
            >
              H₃
            </button>

            <span className="mx-1 h-4 w-px bg-slate-300" />

            {/* Bullet List */}
            <button
              type="button"
              onClick={() => applyFormat("ul")}
              title="Bulleted List (- item)"
              className="flex h-7 w-7 items-center justify-center rounded hover:bg-slate-200/80 text-slate-800 transition cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" strokeWidth="3.5" />
                <line x1="3" y1="12" x2="3.01" y2="12" strokeWidth="3.5" />
                <line x1="3" y1="18" x2="3.01" y2="18" strokeWidth="3.5" />
              </svg>
            </button>

            {/* Numbered List */}
            <button
              type="button"
              onClick={() => applyFormat("ol")}
              title="Numbered List (1. item)"
              className="flex h-7 w-7 items-center justify-center rounded hover:bg-slate-200/80 text-slate-800 transition cursor-pointer font-sans text-[11px] font-bold"
            >
              1.
            </button>

            {/* Blockquote */}
            <button
              type="button"
              onClick={() => applyFormat("quote")}
              title="Blockquote (> quote)"
              className="flex h-7 w-7 items-center justify-center rounded hover:bg-slate-200/80 text-slate-800 transition cursor-pointer font-serif font-bold text-sm"
            >
              ”
            </button>

            {/* Code */}
            <button
              type="button"
              onClick={() => applyFormat("code")}
              title="Code Block (```code```)"
              className="flex h-7 px-1.5 items-center justify-center rounded hover:bg-slate-200/80 text-slate-800 transition cursor-pointer font-mono text-[11px]"
            >
              &lt;/&gt;
            </button>
          </div>

          <span className="hidden sm:inline-block text-[11px] text-slate-400 font-normal">
            Supports Markdown &amp; Linebreaks
          </span>
        </div>

        {/* Content Area: Write Textarea OR Live Preview Container */}
        {mode === "write" ? (
          <textarea
            ref={textareaRef}
            name={name}
            rows={rows}
            value={content}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder={
              placeholder ||
              "প্রথম দিন: সকালে নাস্তা শেষে চান্দের গাড়িতে...\n\nদ্বিতীয় দিন: সারাদিন পাহাড়ে ভ্রমণ...\n\n- হোটেল চেক-ইন\n- কংলাক পাহাড় ভ্রমণ"
            }
            className="w-full resize-y bg-white p-3 font-mono text-xs sm:text-sm text-slate-900 outline-none leading-relaxed min-h-[160px]"
          />
        ) : (
          <div className="min-h-[160px] max-h-[360px] overflow-y-auto bg-slate-50/50 p-4 text-xs sm:text-sm text-slate-900">
            {renderMarkdownPreview(content)}
            {/* Always keep a hidden input with the exact name so form submit works seamlessly in preview mode */}
            <input type="hidden" name={name} value={content} />
          </div>
        )}
      </div>

      {/* Helper footnote */}
      {helperText !== undefined ? (
        helperText
      ) : (
        <span className="text-[11px] font-normal text-slate-500">
          Enter key separates paragraphs. Day headings (e.g. প্রথম দিন:, দ্বিতীয় দিন:) and bullet points (- / •) are automatically styled on the public tour page.
        </span>
      )}
    </div>
  );
}
