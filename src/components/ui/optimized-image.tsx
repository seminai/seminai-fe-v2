import { Component, createRef, RefObject } from "react";
import { cn } from "@/lib/utils";

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
  placeholder?: "blur" | "skeleton";
  containerClassName?: string;
}

interface OptimizedImageState {
  isLoaded: boolean;
  isInView: boolean;
  hasError: boolean;
}

/**
 * OptimizedImage component with lazy loading, placeholder, and priority support.
 * 
 * Features:
 * - Lazy loading for images below the fold
 * - Priority loading for critical images (hero, above-the-fold)
 * - Blur or skeleton placeholder during loading
 * - Smooth fade-in animation on load
 * - Error handling with fallback
 */
export class OptimizedImage extends Component<OptimizedImageProps, OptimizedImageState> {
  private readonly imageRef: RefObject<HTMLImageElement | null>;
  private readonly containerRef: RefObject<HTMLDivElement | null>;
  private observer: IntersectionObserver | null = null;

  public static defaultProps: Partial<OptimizedImageProps> = {
    priority: false,
    placeholder: "blur",
  };

  public constructor(props: OptimizedImageProps) {
    super(props);
    this.state = {
      isLoaded: false,
      isInView: props.priority ?? false,
      hasError: false,
    };
    this.imageRef = createRef<HTMLImageElement>();
    this.containerRef = createRef<HTMLDivElement>();
  }

  public componentDidMount(): void {
    if (this.props.priority) {
      this.preloadImage();
    } else {
      this.setupIntersectionObserver();
    }
  }

  public componentWillUnmount(): void {
    this.cleanupObserver();
  }

  private preloadImage(): void {
    const img = new Image();
    img.src = this.props.src;
    img.onload = () => this.handleImageLoad();
    img.onerror = () => this.handleImageError();
  }

  private setupIntersectionObserver(): void {
    if (!("IntersectionObserver" in window)) {
      // Fallback for browsers without IntersectionObserver
      this.setState({ isInView: true });
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.setState({ isInView: true });
            this.cleanupObserver();
          }
        });
      },
      {
        rootMargin: "200px", // Start loading 200px before entering viewport
        threshold: 0.01,
      }
    );

    if (this.containerRef.current) {
      this.observer.observe(this.containerRef.current);
    }
  }

  private cleanupObserver(): void {
    if (this.observer && this.containerRef.current) {
      this.observer.unobserve(this.containerRef.current);
      this.observer.disconnect();
      this.observer = null;
    }
  }

  private handleImageLoad = (): void => {
    this.setState({ isLoaded: true });
  };

  private handleImageError = (): void => {
    this.setState({ hasError: true, isLoaded: true });
  };

  private renderPlaceholder(): React.ReactNode {
    const { placeholder } = this.props;
    const { isLoaded } = this.state;

    if (isLoaded) return null;

    if (placeholder === "skeleton") {
      return (
        <div
          className={cn(
            "absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200",
            "animate-pulse rounded-inherit"
          )}
        />
      );
    }

    // Default: blur placeholder
    return (
      <div
        className={cn(
          "absolute inset-0 bg-gray-100",
          "animate-pulse rounded-inherit"
        )}
        style={{
          backdropFilter: "blur(20px)",
        }}
      />
    );
  }

  public render(): React.ReactNode {
    const { src, alt, className, priority, containerClassName } = this.props;
    const { isLoaded, isInView, hasError } = this.state;

    return (
      <div
        ref={this.containerRef}
        className={cn("relative overflow-hidden", containerClassName)}
      >
        {this.renderPlaceholder()}
        
        {isInView && !hasError && (
          <img
            ref={this.imageRef}
            src={src}
            alt={alt}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            decoding={priority ? "sync" : "async"}
            onLoad={this.handleImageLoad}
            onError={this.handleImageError}
            className={cn(
              className,
              "transition-opacity duration-500 ease-in-out",
              isLoaded ? "opacity-100" : "opacity-0"
            )}
          />
        )}

        {hasError && (
          <div
            className={cn(
              "absolute inset-0 flex items-center justify-center",
              "bg-gray-100 text-gray-400"
            )}
          >
            <svg
              className="w-12 h-12"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}
      </div>
    );
  }
}

export default OptimizedImage;

