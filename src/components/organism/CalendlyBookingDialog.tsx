import { Component, ReactNode, createRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";

declare global {
  interface Window {
    Calendly?: {
      initInlineWidgets?: () => void;
    };
  }
}

class CalendlyWidgetManager {
  private static readonly scriptId = "calendly-widget-script";
  private static readonly scriptSrc =
    "https://assets.calendly.com/assets/external/widget.js";

  public static ensureScriptLoaded(): void {
    if (typeof document === "undefined") {
      return;
    }

    if (document.getElementById(CalendlyWidgetManager.scriptId)) {
      return;
    }

    const scriptElement = document.createElement("script");
    scriptElement.id = CalendlyWidgetManager.scriptId;
    scriptElement.src = CalendlyWidgetManager.scriptSrc;
    scriptElement.async = true;
    document.body.appendChild(scriptElement);
  }
}

interface CalendlyBookingDialogProps {
  trigger: ReactNode;
  dataUrl?: string;
  title?: string;
  description?: string;
  height?: number;
  contentClassName?: string;
}

interface CalendlyBookingDialogState {
  isOpen: boolean;
  isCalendlyLoading: boolean;
}

export default class CalendlyBookingDialog extends Component<
  CalendlyBookingDialogProps,
  CalendlyBookingDialogState
> {
  public static defaultProps: Partial<CalendlyBookingDialogProps> = {
    dataUrl: "https://calendly.com/get-seminai/30min",
    title: "Fissa un incontro con il team SeminAI",
    description:
      "Scegli il giorno e l'orario che preferisci per una demo guidata di 30 minuti.",
    height: 700,
    contentClassName: "sm:max-w-3xl max-w-3xl bg-white",
  };

  private calendlyIframePollId: number | null = null;
  private calendlyIframe?: HTMLIFrameElement;
  private readonly widgetContainerRef = createRef<HTMLDivElement>();

  public constructor(props: CalendlyBookingDialogProps) {
    super(props);
    this.state = {
      isOpen: false,
      isCalendlyLoading: false,
    };
  }

  public componentDidMount(): void {
    if (typeof window !== "undefined") {
      window.addEventListener("message", this.handleCalendlyMessage);
    }
  }

  public componentDidUpdate(
    _: CalendlyBookingDialogProps,
    prevState: CalendlyBookingDialogState
  ): void {
    if (!prevState.isOpen && this.state.isOpen) {
      CalendlyWidgetManager.ensureScriptLoaded();
      if (window.Calendly?.initInlineWidgets) {
        window.Calendly.initInlineWidgets();
      } else {
        const script = document.getElementById("calendly-widget-script");
        if (script) {
          script.addEventListener("load", () => {
            window.Calendly?.initInlineWidgets?.();
          }, { once: true });
        }
      }
      this.startCalendlyWatcher();
    }

    if (prevState.isOpen && !this.state.isOpen) {
      this.stopCalendlyWatcher();
    }
  }

  public componentWillUnmount(): void {
    if (typeof window !== "undefined") {
      window.removeEventListener("message", this.handleCalendlyMessage);
    }
    this.stopCalendlyWatcher();
  }

  private handleCalendlyMessage = (event: MessageEvent): void => {
    if (event.data?.event === "calendly.event_type_viewed") {
      this.setState({ isCalendlyLoading: false });
    }
  };

  public render() {
    const { trigger, title, description, dataUrl, height, contentClassName } =
      this.props;
    const { isOpen, isCalendlyLoading } = this.state;

    return (
      <Dialog open={isOpen} onOpenChange={this.handleOpenChange}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent className={contentClassName}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          <div
            className="w-full relative"
            style={{ minHeight: 320 }}
          >
            {isCalendlyLoading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-white">
                <Spinner
                  size={64}
                  speed="fast"
                  ariaLabel="Caricamento Calendly"
                  className="text-agri-green-600"
                />
              </div>
            )}
            <div
              ref={this.widgetContainerRef}
              className={`calendly-inline-widget transition-opacity duration-300 ${
                isCalendlyLoading ? "opacity-0" : "opacity-100"
              }`}
              data-url={dataUrl}
              style={{ minWidth: "320px", height: `${height ?? 700}px` }}
            />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  private handleOpenChange = (isOpen: boolean): void => {
    this.setState((prevState) => {
      if (isOpen === prevState.isOpen) {
        return null;
      }

      return {
        isOpen,
        isCalendlyLoading: isOpen,
      };
    });
  };

  private startCalendlyWatcher(): void {
    if (typeof window === "undefined") {
      return;
    }

    if (this.calendlyIframePollId !== null) {
      return;
    }

    this.calendlyIframePollId = window.setInterval(() => {
      const iframe = this.widgetContainerRef.current?.querySelector<HTMLIFrameElement>(
        "iframe"
      );

      if (!iframe) {
        return;
      }

      if (iframe.dataset.spinnerReady === "true") {
        this.setState({ isCalendlyLoading: false });
        this.stopCalendlyWatcher();
        return;
      }

      this.calendlyIframe = iframe;
      iframe.addEventListener("load", this.handleCalendlyLoaded);

      if (this.calendlyIframePollId !== null) {
        window.clearInterval(this.calendlyIframePollId);
        this.calendlyIframePollId = null;
      }
    }, 150);
  }

  private stopCalendlyWatcher(): void {
    if (typeof window !== "undefined" && this.calendlyIframePollId !== null) {
      window.clearInterval(this.calendlyIframePollId);
      this.calendlyIframePollId = null;
    }

    if (this.calendlyIframe) {
      this.calendlyIframe.removeEventListener("load", this.handleCalendlyLoaded);
      this.calendlyIframe = undefined;
    }

    this.widgetContainerRef.current?.querySelectorAll("iframe").forEach((iframe) => {
      iframe.removeEventListener("load", this.handleCalendlyLoaded);
    });
  }

  private handleCalendlyLoaded = (): void => {
    if (this.calendlyIframe) {
      this.calendlyIframe.dataset.spinnerReady = "true";
      this.calendlyIframe.removeEventListener("load", this.handleCalendlyLoaded);
      this.calendlyIframe = undefined;
    }

    this.setState({ isCalendlyLoading: false });
  };
}


