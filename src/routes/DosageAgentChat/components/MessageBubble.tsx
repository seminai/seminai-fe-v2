import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Wrench, Cpu } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { DosageAgentMessage } from "@/hooks/useDosageAgentChat";
import { getToolLabel } from "../constants";
import { DownloadableTable } from "./DownloadableTable";

export function MessageBubble({ message }: { message: DosageAgentMessage }) {
  const isUser = message.role === "user";
  const content =
    message.content || (isUser ? "" : "Sto elaborando la risposta...");

  return (
    <div
      className={cn(
        "flex w-full min-w-0",
        isUser ? "justify-end" : "justify-start",
      )}
    >
      <div
        className={cn(
          "w-full min-w-0 max-w-full sm:w-fit sm:max-w-[85%] rounded-lg px-3 py-2 text-sm shadow-sm",
          isUser
            ? "bg-emerald-600 text-white"
            : "bg-white border border-slate-200 text-slate-800",
        )}
      >
        {!isUser && message.toolCalls && message.toolCalls.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {message.toolCalls.map((tc, i) => (
              <Badge
                key={`${tc.name}-${i}`}
                variant="outline"
                className="text-[10px] bg-amber-50 text-amber-700 border-amber-200"
              >
                <Wrench className="h-2.5 w-2.5 mr-1" />
                {getToolLabel(tc.name)}
              </Badge>
            ))}
          </div>
        )}

        {isUser ? (
          <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">
            {content}
          </p>
        ) : (
          <div className="min-w-0 max-w-full [overflow-wrap:anywhere] overflow-x-auto">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={markdownComponents}
            >
              {content}
            </ReactMarkdown>
          </div>
        )}

        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="mt-2 border-t border-slate-200 pt-2 text-xs text-slate-600 space-y-1">
            <p className="font-semibold text-slate-700">Fonti</p>
            <ul className="space-y-1">
              {message.sources.map((source, index) => (
                <li key={`${source.url}-${index}`}>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-700 hover:underline break-all"
                  >
                    {source.title || source.url}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {!isUser && message.modelInfo && (
          <div className="mt-2 flex items-center gap-1.5 border-t border-slate-100 pt-2">
            <Badge
              variant="outline"
              className="text-[9px] gap-1 text-slate-500"
            >
              <Cpu className="h-2.5 w-2.5" />
              {message.modelInfo.modelName}
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
}

const markdownComponents = {
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 className="text-base font-bold mb-2 mt-3 first:mt-0 text-slate-900">{children}</h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="text-sm font-semibold mb-2 mt-3 first:mt-0 text-slate-800">{children}</h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="text-sm font-semibold mb-1.5 mt-2.5 first:mt-0 text-slate-800">{children}</h3>
  ),
  h4: ({ children }: { children?: React.ReactNode }) => (
    <h4 className="text-xs font-semibold mb-1 mt-2 first:mt-0 text-slate-700">{children}</h4>
  ),
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="mb-2 last:mb-0 text-slate-800 leading-relaxed break-words">{children}</p>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="list-disc pl-5 mb-2 space-y-0.5 text-slate-800 break-words">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="list-decimal pl-5 mb-2 space-y-0.5 text-slate-800 break-words">{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="text-slate-800 break-words pl-0.5">{children}</li>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold text-slate-900">{children}</strong>
  ),
  em: ({ children }: { children?: React.ReactNode }) => (
    <em className="italic text-slate-700">{children}</em>
  ),
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-emerald-700 hover:text-emerald-800 hover:underline break-all">
      {children}
    </a>
  ),
  code: ({ children, className }: { children?: React.ReactNode; className?: string }) => {
    const isInline = !className;
    return isInline ? (
      <code className="bg-slate-100 text-slate-900 px-1 py-0.5 rounded text-xs font-mono">{children}</code>
    ) : (
      <code className="block bg-slate-100 text-slate-900 p-2 rounded text-xs font-mono overflow-x-auto">{children}</code>
    );
  },
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="border-l-4 border-slate-300 pl-3 my-2 italic text-slate-600">{children}</blockquote>
  ),
  hr: () => <hr className="my-3 border-slate-200" />,
  table: ({ children }: { children?: React.ReactNode }) => (
    <DownloadableTable>{children}</DownloadableTable>
  ),
  thead: ({ children }: { children?: React.ReactNode }) => (
    <thead className="border-b border-slate-200 bg-slate-50/80">{children}</thead>
  ),
  tbody: ({ children }: { children?: React.ReactNode }) => <tbody>{children}</tbody>,
  tr: ({ children }: { children?: React.ReactNode }) => (
    <tr className="border-b border-slate-100 last:border-b-0">{children}</tr>
  ),
  th: ({ children }: { children?: React.ReactNode }) => (
    <th className="whitespace-normal break-words sm:whitespace-nowrap px-2 py-1.5 font-semibold text-slate-700 first:pl-0 last:pr-0">{children}</th>
  ),
  td: ({ children }: { children?: React.ReactNode }) => (
    <td className="whitespace-normal break-words sm:whitespace-nowrap px-2 py-1.5 first:pl-0 last:pr-0">{children}</td>
  ),
};
