import React from "react";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/** Lightweight markdown-to-JSX renderer for AI output */
export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = "" }) => {
  const lines = content.split("\n");

  const renderInline = (text: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    // Bold: **text** or __text__
    const regex = /(\*\*|__)(.+?)\1/g;
    let lastIndex = 0;
    let match;

    const tempText = text;
    while ((match = regex.exec(tempText)) !== null) {
      if (match.index > lastIndex) {
        parts.push(tempText.slice(lastIndex, match.index));
      }
      parts.push(
        <strong key={match.index} className="font-semibold text-foreground">
          {match[2]}
        </strong>
      );
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < tempText.length) {
      parts.push(tempText.slice(lastIndex));
    }
    return parts.length > 0 ? parts : [text];
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {lines.map((line, i) => {
        const trimmed = line.trim();

        // Empty line
        if (!trimmed) return <div key={i} className="h-2" />;

        // Headings
        if (trimmed.startsWith("### ")) {
          return (
            <h4 key={i} className="text-base font-semibold text-foreground mt-3 mb-1">
              {renderInline(trimmed.slice(4))}
            </h4>
          );
        }
        if (trimmed.startsWith("## ")) {
          return (
            <h3 key={i} className="text-lg font-bold text-foreground mt-4 mb-1">
              {renderInline(trimmed.slice(3))}
            </h3>
          );
        }
        if (trimmed.startsWith("# ")) {
          return (
            <h2 key={i} className="text-xl font-bold text-foreground mt-4 mb-2">
              {renderInline(trimmed.slice(2))}
            </h2>
          );
        }

        // Numbered list
        const numberedMatch = trimmed.match(/^(\d+)\.\s+(.+)/);
        if (numberedMatch) {
          return (
            <div key={i} className="flex gap-3 pl-1">
              <span className="text-primary font-semibold min-w-[1.5rem] text-right">{numberedMatch[1]}.</span>
              <span className="text-foreground/90">{renderInline(numberedMatch[2])}</span>
            </div>
          );
        }

        // Bullet list
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          return (
            <div key={i} className="flex gap-3 pl-1">
              <span className="text-primary mt-1.5 min-w-[0.5rem]">•</span>
              <span className="text-foreground/90">{renderInline(trimmed.slice(2))}</span>
            </div>
          );
        }

        // Horizontal rule
        if (trimmed === "---" || trimmed === "***") {
          return <hr key={i} className="border-border/50 my-3" />;
        }

        // Regular paragraph
        return (
          <p key={i} className="text-foreground/90 leading-relaxed">
            {renderInline(trimmed)}
          </p>
        );
      })}
    </div>
  );
};

/** Strip markdown formatting for plain-text email */
export const stripMarkdown = (text: string): string => {
  return text
    .replace(/#{1,6}\s+/g, "")       // headings
    .replace(/\*\*(.+?)\*\*/g, "$1")  // bold
    .replace(/__(.+?)__/g, "$1")      // bold alt
    .replace(/\*(.+?)\*/g, "$1")      // italic
    .replace(/_(.+?)_/g, "$1")        // italic alt
    .replace(/^[-*]\s+/gm, "• ")      // bullets
    .replace(/---/g, "")              // hr
    .trim();
};
