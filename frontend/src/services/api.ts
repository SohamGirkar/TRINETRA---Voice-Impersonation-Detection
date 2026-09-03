import { HISTORICAL_ANALYSES } from '../data/mockSessions';

const API_BASE_URL = 'http://10.198.62.207:8000';

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

    const response = await fetch(
      `${API_BASE_URL}/api/predict`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {

      const errorText = await response.text();

      throw new Error(
        `Backend error ${response.status}: ${errorText}`
      );
    }

    const data = await response.json();

    return data.result;
  }

};