import { HISTORICAL_ANALYSES } from '../data/mockSessions';

const API_BASE_URL =
  (import.meta as any).env?.VITE_API_BASE_URL ??
  'http://localhost:8000';

export interface BackendPrediction {
  synthetic_probability: number;
  genuine_probability?: number;
  impersonation_risk_score: number;
  risk_level: string;
  classification?: string;
  confidence_score: number;
  recommended_action: string;
  decision_threshold?: number;
  evidence: string[];
  chunk_scores?: number[];
}

export const apiService = {

  async getSessions() {
    return HISTORICAL_ANALYSES;
  },

  async analyzeAudio(
    file: File
  ): Promise<BackendPrediction> {

    const formData = new FormData();

    formData.append(
      'file',
      file
    );

    let response: Response;

    try {

      response = await fetch(
        `${API_BASE_URL}/api/predict`,
        {
          method: 'POST',
          body: formData,
        }
      );

    } catch (error) {

      throw new Error(
        `Cannot reach TRINETRA backend at ${API_BASE_URL}. ` +
        `Make sure the backend is running.`
      );
    }

    if (!response.ok) {

      const errorText =
        await response.text();

      throw new Error(
        `Backend error ${response.status}: ${errorText}`
      );
    }

    const data =
      await response.json();

    return data.result as BackendPrediction;
  },

  async analyzeLiveChunk(
    blob: Blob
  ): Promise<BackendPrediction> {

    const file =
      new File(
        [blob],
        `live-${Date.now()}.webm`,
        {
          type: blob.type || 'audio/webm',
        }
      );

    return this.analyzeAudio(
      file
    );
  },
};