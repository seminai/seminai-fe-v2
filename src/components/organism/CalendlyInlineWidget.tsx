import { Component, createRef } from "react";
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

interface CalendlyInlineWidgetProps {
  dataUrl?: string;
  height?: number;
  className?: string;
}

interface CalendlyInlineWidgetState {
  isCalendlyLoading: boolean;
}

export default class CalendlyInlineWidget extends Component<
  CalendlyInlineWidgetProps,
  CalendlyInlineWidgetState
> {
  public static defaultProps: Partial<CalendlyInlineWidgetProps> = {
    dataUrl:
      "https://calendly.com/get-seminai/30min?hide_landing_page_details=1&hide_gdpr_banner=1",
    height: 700,
  };

  private calendlyIframePollId: number | null = null;
  private fallbackTimeout: number | null = null;
  private calendlyIframe?: HTMLIFrameElement;
  private readonly widgetContainerRef = createRef<HTMLDivElement>();

  public constructor(props: CalendlyInlineWidgetProps) {
    super(props);
    this.state = {
      isCalendlyLoading: true,
    };
  }

  public componentDidMount(): void {
    if (typeof window !== "undefined") {
      window.addEventListener("message", this.handleCalendlyMessage);
    }

    CalendlyWidgetManager.ensureScriptLoaded();
    if (window.Calendly?.initInlineWidgets) {
      window.Calendly.initInlineWidgets();
    } else {
      const script = document.getElementById("calendly-widget-script");
      if (script) {
        script.addEventListener(
          "load",
          () => {
            window.Calendly?.initInlineWidgets?.();
          },
          { once: true }
        );
      }
    }
    this.startCalendlyWatcher();

    // Fallback: se per qualche motivo gli eventi non arrivano, rimuoviamo lo spinner dopo 3 secondi
    this.fallbackTimeout = window.setTimeout(() => {
      if (this.state.isCalendlyLoading) {
        this.setState({ isCalendlyLoading: false });
      }
    }, 3000);
  }

  public componentWillUnmount(): void {
    if (typeof window !== "undefined") {
      window.removeEventListener("message", this.handleCalendlyMessage);
    }
    this.stopCalendlyWatcher();

    if (this.fallbackTimeout !== null) {
      window.clearTimeout(this.fallbackTimeout);
      this.fallbackTimeout = null;
    }
  }

  private handleCalendlyMessage = (event: MessageEvent): void => {
    // Wait for the actual calendar view to be ready, or at least the event type view
    if (
      event.data?.event === "calendly.event_type_viewed" ||
      event.data?.event === "calendly.date_and_time_selected" ||
      event.data?.event === "calendly.profile_page_viewed"
    ) {
      this.setState({ isCalendlyLoading: false });
    }
  };

  private startCalendlyWatcher(): void {
    if (typeof window === "undefined") {
      return;
    }

    if (this.calendlyIframePollId !== null) {
      return;
    }

    this.calendlyIframePollId = window.setInterval(() => {
      const iframe =
        this.widgetContainerRef.current?.querySelector<HTMLIFrameElement>(
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
      this.calendlyIframe.removeEventListener(
        "load",
        this.handleCalendlyLoaded
      );
      this.calendlyIframe = undefined;
    }

    this.widgetContainerRef.current
      ?.querySelectorAll("iframe")
      .forEach((iframe) => {
        iframe.removeEventListener("load", this.handleCalendlyLoaded);
      });
  }

  private handleCalendlyLoaded = (): void => {
    if (this.calendlyIframe) {
      this.calendlyIframe.dataset.spinnerReady = "true";
      this.calendlyIframe.removeEventListener(
        "load",
        this.handleCalendlyLoaded
      );
      this.calendlyIframe = undefined;
    }

    this.setState({ isCalendlyLoading: false });
  };

  public render() {
    const { dataUrl, height, className } = this.props;
    const { isCalendlyLoading } = this.state;

    return (
      <div
        className={`w-full relative ${className ?? ""}`}
        style={{ minHeight: 320 }}
      >
        {isCalendlyLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white rounded-2xl">
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
    );
  }
}
