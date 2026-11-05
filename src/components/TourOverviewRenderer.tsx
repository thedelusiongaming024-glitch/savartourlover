"use client";

import React from "react";

interface TourOverviewRendererProps {
  content: string;
  className?: string;
}

// Format **bold**, *italic*, `code`, and [links](url) safely into React nodes
export function renderInlineMarkdown(text: string): React.ReactNode {
  if (!text) return null;
  const parts: React.ReactNode[] = [];
  // Match bold (**text**), italic (*text*), code (`text`), markdown links [text](url)
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[([^\]]+)\]\(([^)]+)\))/g;
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
          className="rounded bg-emerald-50 px-1 py-0.5 text-xs font-mono text-emerald-800 font-semibold"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith("[") && match[2] && match[3]) {
      parts.push(
        <a
          key={key++}
          href={match[3]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-emerald-700 underline hover:text-emerald-900"
        >
          {match[2]}
        </a>
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

// Explicit Day pattern for Bengali and English itineraries
const explicitDayPattern = /^((?:(?:প্রথম|দ্বিতীয়|দ্বিতীয়|তৃতীয়|তৃতীয়|চতুর্থ|পঞ্চম|ষষ্ঠ|সপ্তম|অষ্টম|নবম|দশম|একাদশ|দ্বাদশ|\d+|[০-৯]+)\s*(?:ম|য়|য়|র্থ|ষ্ঠ|তম|st|nd|rd|th)?\s*দিন|দিন\s*[-–—]?\s*(?:\d+|[০-৯]+|প্রথম|দ্বিতীয়|দ্বিতীয়|তৃতীয়|তৃতীয়|১ম|২য়|২য়|৩য়|৩য়)|Day\s*[-–—]?\s*(?:\d+|[০-৯]+|one|two|three|four|five|six|seven|eight|nine|ten)|(?:1st|2nd|3rd|[0-9]+th)\s*Day|শেষ\s*দিন|পরের\s*দিন|সকালে|সন্ধ্যায়|রাতে|দুপুরে)[^:\n–—]*[:–—\-])\s*(.*)$/is;

// Generic Day pattern: any line with "দিন" or "day" ending in colon/dash (up to 50 chars header)
const genericDayPattern = /^([^:\n–—]{1,50}?(?:দিন|day)[^:\n–—]{0,30}[:–—\-])\s*(.*)$/is;

// Pattern that identifies a line as the start of a Day Card
const blockStartRegex = /^(?:##\s|###\s|>|(?:(?:প্রথম|দ্বিতীয়|দ্বিতীয়|তৃতীয়|তৃতীয়|চতুর্থ|পঞ্চম|ষষ্ঠ|সপ্তম|অষ্টম|নবম|দশম|একাদশ|দ্বাদশ|\d+|[০-৯]+)\s*(?:ম|য়|য়|র্থ|ষ্ঠ|তম|st|nd|rd|th)?\s*দিন|দিন\s*[-–—]?\s*(?:\d+|[০-৯]+|প্রথম|দ্বিতীয়|দ্বিতীয়|তৃতীয়|তৃতীয়|১ম|২য়|২য়|৩য়|৩য়)|Day\s*[-–—]?\s*(?:\d+|[০-৯]+|one|two|three|four|five|six|seven|eight|nine|ten)|(?:1st|2nd|3rd|[0-9]+th)\s*Day|শেষ\s*দিন|পরের\s*দিন|সকালে|সন্ধ্যায়|রাতে|দুপুরে)[^:\n–—]*[:–—\-])/i;

function splitIntoBlocks(raw: string): string[] {
  if (!raw || !raw.trim()) return [];

  const text = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  const lines = text.split("\n");
  const blocks: string[] = [];
  let currentBlockLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Empty line signals end of block
    if (!trimmedLine) {
      if (currentBlockLines.length > 0) {
        blocks.push(currentBlockLines.join("\n"));
        currentBlockLines = [];
      }
      continue;
    }

    // If line starts a new Day header or heading, split into a new block
    if (currentBlockLines.length > 0 && blockStartRegex.test(trimmedLine)) {
      blocks.push(currentBlockLines.join("\n"));
      currentBlockLines = [line];
      continue;
    }

    currentBlockLines.push(line);
  }

  if (currentBlockLines.length > 0) {
    blocks.push(currentBlockLines.join("\n"));
  }

  return blocks;
}

export function TourOverviewRenderer({ content, className = "" }: TourOverviewRendererProps) {
  if (!content || !content.trim()) {
    return null;
  }

  const blocks = splitIntoBlocks(content);

  return (
    <div className={`space-y-3.5 sm:space-y-4 ${className}`}>
      {blocks.map((block, pIdx) => {
        const trimmed = block.trim();
        if (!trimmed) return null;

        // Heading 2 (##)
        if (trimmed.startsWith("## ")) {
          return (
            <h2
              key={pIdx}
              className="text-base sm:text-xl font-bold font-display text-emerald-950 border-b border-emerald-100/90 pb-1.5 mt-3 mb-2"
            >
              {renderInlineMarkdown(trimmed.slice(3))}
            </h2>
          );
        }

        // Heading 3 (###)
        if (trimmed.startsWith("### ")) {
          return (
            <h3
              key={pIdx}
              className="text-sm sm:text-lg font-bold font-display text-emerald-900 mt-2.5 mb-1.5"
            >
              {renderInlineMarkdown(trimmed.slice(4))}
            </h3>
          );
        }

        // Blockquote (>)
        if (trimmed.startsWith("> ")) {
          const quoteText = trimmed
            .split("\n")
            .map((l) => l.replace(/^>\s*/, ""))
            .join("\n");
          return (
            <blockquote
              key={pIdx}
              className="border-l-4 border-emerald-500 bg-emerald-50/70 pl-3.5 sm:pl-4 py-2 italic text-slate-700 text-xs sm:text-sm md:text-base rounded-r-xl my-2 whitespace-pre-wrap"
            >
              {renderInlineMarkdown(quoteText)}
            </blockquote>
          );
        }

        // Bullet list (- or * followed by whitespace)
        const lines = trimmed.split("\n");
        const isAllBullets = lines.every((l) => /^(?:[-•·✔✓➢—–]|\*(?!\*))\s+/.test(l.trim()));
        if (isAllBullets) {
          return (
            <ul key={pIdx} className="list-disc pl-5 space-y-1.5 my-2 text-xs sm:text-sm md:text-base text-slate-800">
              {lines.map((l, lIdx) => (
                <li key={lIdx}>
                  {renderInlineMarkdown(l.trim().replace(/^(?:[-•·✔✓➢—–]|\*(?!\*))\s+/, ""))}
                </li>
              ))}
            </ul>
          );
        }

        // Numbered list (1. 2.)
        const isAllNumbered = lines.every((l) => /^(?:\d+|[০-৯]+)\.\s+/.test(l.trim()));
        if (isAllNumbered) {
          return (
            <ol key={pIdx} className="list-decimal pl-5 space-y-1.5 my-2 text-xs sm:text-sm md:text-base text-slate-800">
              {lines.map((l, lIdx) => (
                <li key={lIdx}>
                  {renderInlineMarkdown(l.trim().replace(/^(?:\d+|[০-৯]+)\.\s+/, ""))}
                </li>
              ))}
            </ol>
          );
        }

        // Day Heading highlight (e.g. প্রথম দিন:, দ্বিতীয় দিন:, Day 1:)
        const dayMatch = explicitDayPattern.exec(trimmed) || genericDayPattern.exec(trimmed);
        if (dayMatch) {
          const header = dayMatch[1].trim();
          const rest = dayMatch[2].trim();

          return (
            <div
              key={pIdx}
              className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 sm:p-4 shadow-2xs hover:border-emerald-300 transition"
            >
              <div className="font-bold text-emerald-900 text-xs sm:text-sm md:text-base flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                <span className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-md bg-emerald-600/15 text-emerald-800 text-[11px] sm:text-xs">
                  📅
                </span>
                <span>{header}</span>
              </div>
              {rest && (
                <div className="text-xs sm:text-sm md:text-base text-slate-700 leading-relaxed pl-6 sm:pl-8 whitespace-pre-wrap">
                  {renderInlineMarkdown(rest)}
                </div>
              )}
            </div>
          );
        }

        // Normal paragraph with line breaks preserved (e.g. **Tour:** or plain text)
        return (
          <p
            key={pIdx}
            className="text-xs sm:text-sm md:text-base text-slate-800 leading-relaxed whitespace-pre-wrap"
          >
            {renderInlineMarkdown(trimmed)}
          </p>
        );
      })}
    </div>
  );
}
