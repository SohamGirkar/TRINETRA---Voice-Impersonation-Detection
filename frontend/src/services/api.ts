import { HISTORICAL_ANALYSES } from '../data/mockSessions';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL ?? 'http://localhost:8000';

export interface BackendPrediction {
  synthetic_probability: number;
  impersonation_risk_score: number;
  risk_level: string;
  confidence_score: number;
  recommended_action: string;
  evidence: string[];
}

export const apiService = {

  // Existing historical analyses
  async getSessions() {
    return HISTORICAL_ANALYSES;
  },


  // New: send audio to TRINETRA backend
  async analyzeAudio(
    file: File
  ): Promise<BackendPrediction> {

    const formData = new FormData();

    formData.append('file', file);

    let response: Response;
    try {
      response = await fetch(
        `${API_BASE_URL}/api/predict`,
        {
          method: 'POST',
          body: formData,
        }
      );
    } catch (networkError) {
      throw new Error(
        `Cannot reach the TRINETRA backend at ${API_BASE_URL}. ` +
        `Make sure the backend server is running (uvicorn app.main:app --reload).`
      );
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Backend error ${response.status}: ${errorText}`
      );
    }

    const data = await response.json();

    // Backend returns { success: true, result: { ...BackendPrediction } }
    return data.result as BackendPrediction;
  }

};