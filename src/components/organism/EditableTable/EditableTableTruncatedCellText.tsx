import * as React from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface TruncatedCellTextProps {
  text: string;
}

interface TruncatedCellTextState {
  open: boolean;
}

export class TruncatedCellText extends React.PureComponent<
  TruncatedCellTextProps,
  TruncatedCellTextState
> {
  state: TruncatedCellTextState = { open: false };

  private handleOpenChange = (open: boolean): void => {
    this.setState({ open });
  };

  private get normalizedText(): string {
    const { text } = this.props;
    if (typeof text !== "string") return "-";
    return text.trim().length > 0 ? text : "-";
  }

  private get previewText(): string {
    const normalized = this.normalizedText;
    if (normalized === "-") return normalized;
    const words = normalized.split(/\s+/).filter(Boolean);
    if (words.length <= 5) {
      return normalized;
    }
    return `${words.slice(0, 5).join(" ")}...`;
  }

  render(): React.ReactNode {
    const preview = this.previewText;
    const fullText = this.normalizedText;
    return (
      <Popover open={this.state.open} onOpenChange={this.handleOpenChange}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="w-full max-w-[320px] cursor-pointer text-left text-[14px] leading-relaxed text-foreground line-clamp-3 break-words whitespace-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A84FF]/60"
            aria-label="Mostra testo completo"
          >
            {preview}
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="max-w-2xl whitespace-pre-wrap break-words text-sm bg-white"
        >
          {fullText}
        </PopoverContent>
      </Popover>
    );
  }
}

