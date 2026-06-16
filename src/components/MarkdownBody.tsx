import DOMPurify from "dompurify";
import { marked } from "marked";

interface MarkdownBodyProps {
  children: string;
  className?: string;
  style?: React.CSSProperties;
}

export function MarkdownBody({ children, className, style }: MarkdownBodyProps) {
  const html = DOMPurify.sanitize(marked.parse(children, { async: false }) as string);
  return (
    <div
      className={`bp-markdown${className ? ` ${className}` : ""}`}
      style={style}
      // Content is sanitized by DOMPurify immediately above
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
