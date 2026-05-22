import type { JSX } from "react";

interface RichHtmlProps {
  html: string;
  as?: keyof JSX.IntrinsicElements;
  className?: string;
}

export function RichHtml({
  html,
  as: Tag = "span",
  className,
}: RichHtmlProps) {
  return (
    <Tag
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
