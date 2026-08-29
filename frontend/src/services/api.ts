import { HISTORICAL_ANALYSES } from '../data/mockSessions';

export const apiService = {
  async getSessions() {
    return HISTORICAL_ANALYSES;
  }
};
