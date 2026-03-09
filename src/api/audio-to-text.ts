import { authenticatedHttpClient } from "./http";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8081";

export interface AudioTranscriptionResponse {
  status: "success" | "error";
  data: {
    text: string;
    language: string;
    duration: number;
  };
}

export interface TranscribeAudioRequest {
  file: File;
}

class AudioToTextApiService {
  private baseUrl: string;

  constructor(baseUrl: string = BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async transcribeAudio(
    request: TranscribeAudioRequest,
  ): Promise<AudioTranscriptionResponse> {
    const formData = new FormData();
    formData.append("file", request.file);

    const response = await authenticatedHttpClient.request(
      `${this.baseUrl}/audio-to-text/transcribe`,
      {
        method: "POST",
        body: formData,
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "Audio transcription failed");
    }

    const jsonData = (await response.json()) as AudioTranscriptionResponse;
    return jsonData;
  }
}

export const audioToTextApiService = new AudioToTextApiService(BASE_URL);
