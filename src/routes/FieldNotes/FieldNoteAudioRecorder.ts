export class AudioRecorderService {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: BlobPart[] = [];
  private stream: MediaStream | null = null;
  private readonly mimeType?: string;

  constructor(mimeType?: string) {
    this.mimeType = mimeType;
  }

  static getSupportedMimeType(): string | undefined {
    const candidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
      "audio/mpeg",
    ];
    if (!("MediaRecorder" in window)) {
      return undefined;
    }
    return candidates.find((type) => MediaRecorder.isTypeSupported(type));
  }

  static buildAudioFile(blob: Blob): File {
    const type = blob.type || "audio/webm";
    const extension = type.includes("mp4") ? "mp4" : "webm";
    return new File([blob], `voice-note-${Date.now()}.${extension}`, {
      type,
    });
  }

  async start(): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Audio recording is not supported in this browser.");
    }
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.chunks = [];
    this.mediaRecorder = new MediaRecorder(
      this.stream,
      this.mimeType ? { mimeType: this.mimeType } : undefined
    );
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        this.chunks.push(event.data);
      }
    };
    this.mediaRecorder.start();
  }

  stop(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error("No active recording found."));
        return;
      }
      const recorder = this.mediaRecorder;
      recorder.onerror = () => {
        this.cleanup();
        reject(new Error("Recording failed."));
      };
      recorder.onstop = () => {
        const type = recorder.mimeType || this.mimeType || "audio/webm";
        const blob = new Blob(this.chunks, { type });
        this.cleanup();
        resolve(blob);
      };
      recorder.stop();
    });
  }

  cancel(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      this.mediaRecorder.stop();
    }
    this.cleanup();
  }

  private cleanup(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
    }
    this.stream = null;
    this.mediaRecorder = null;
    this.chunks = [];
  }
}
