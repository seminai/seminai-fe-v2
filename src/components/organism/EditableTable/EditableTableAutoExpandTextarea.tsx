import * as React from "react";
import { cn } from "@/lib/utils";

interface AutoExpandTextareaProps {
  value: string;
  placeholder?: string;
  isInvalid?: boolean;
  onValueChange: (nextValue: string) => void;
}

interface AutoExpandTextareaState {
  isFocused: boolean;
}

export class AutoExpandTextarea extends React.PureComponent<
  AutoExpandTextareaProps,
  AutoExpandTextareaState
> {
  state: AutoExpandTextareaState = { isFocused: false };
  private textareaRef = React.createRef<HTMLTextAreaElement>();
  private readonly MIN_HEIGHT = 40;

  componentDidMount(): void {
    this.resetHeight();
  }

  componentDidUpdate(
    prevProps: AutoExpandTextareaProps,
    prevState: AutoExpandTextareaState
  ): void {
    if (this.state.isFocused) {
      this.expandToContent();
      return;
    }
    if (
      prevState.isFocused !== this.state.isFocused ||
      prevProps.value !== this.props.value
    ) {
      this.resetHeight();
    }
  }

  private resetHeight(): void {
    const textarea = this.textareaRef.current;
    if (!textarea) return;
    textarea.style.height = `${this.MIN_HEIGHT}px`;
  }

  private expandToContent(): void {
    const textarea = this.textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.max(
      this.MIN_HEIGHT,
      textarea.scrollHeight
    )}px`;
  }

  private handleFocus = (
    event: React.FocusEvent<HTMLTextAreaElement>
  ): void => {
    this.setState({ isFocused: true }, () => this.expandToContent());
    event.currentTarget.select();
  };

  private handleBlur = (): void => {
    this.setState({ isFocused: false }, () => this.resetHeight());
  };

  private handleChange = (
    event: React.ChangeEvent<HTMLTextAreaElement>
  ): void => {
    this.props.onValueChange(event.target.value);
    if (this.state.isFocused) {
      this.expandToContent();
    }
  };

  render(): React.ReactNode {
    const { value, placeholder, isInvalid } = this.props;
    return (
      <textarea
        ref={this.textareaRef}
        data-slot="textarea"
        value={value}
        placeholder={placeholder}
        aria-invalid={isInvalid}
        onFocus={this.handleFocus}
        onBlur={this.handleBlur}
        onChange={this.handleChange}
        className={cn(
          "placeholder:text-foreground/40 dark:placeholder:text-foreground/50 selection:bg-primary selection:text-primary-foreground flex w-full min-w-0 rounded-xl bg-white/70 dark:bg-input/30 backdrop-blur supports-[backdrop-filter]:bg-white/60 px-3 py-2 text-base inset-shadow-xs transition-[background-color,border-color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          "border border-black/5 dark:border-white/10 hover:border-black/15 dark:hover:border-white/20",
          "focus-visible:ring-2 focus-visible:ring-[#0A84FF]/80 focus-visible:border-transparent",
          "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
          "min-h-[40px] resize-none overflow-hidden transition-[height] duration-200 ease-in-out",
          isInvalid && "ring-1 ring-red-200/50 border-red-200/60"
        )}
      />
    );
  }
}
