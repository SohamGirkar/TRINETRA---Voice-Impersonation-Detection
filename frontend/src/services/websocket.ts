import { TelemetryState } from '../types/telemetry';

type TelemetryListener = (data: Partial<TelemetryState>) => void;

class WebSocketService {
  private socket: WebSocket | null = null;
  private listeners: Set<TelemetryListener> = new Set();
  private isConnected: boolean = false;
  private reconnectTimer: number | null = null;

  public connect(url: string = 'ws://localhost:8000/ws/telemetry'): void {
    if (this.socket || this.isConnected) return;

    try {
      this.socket = new WebSocket(url);

      this.socket.onopen = () => {
        this.isConnected = true;
        console.log('[VoiceShield WS] Live telemetry connected.');
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.notifyListeners(data);
        } catch (e) {
          console.error('[VoiceShield WS] Error parsing telemetry frame:', e);
        }
      };

      this.socket.onclose = () => {
        this.isConnected = false;
        this.socket = null;
        // Mock fallback continues seamlessly
      };

      this.socket.onerror = () => {
        // Quiet fallback to mock mode
        this.isConnected = false;
      };
    } catch {
      this.isConnected = false;
    }
  }

  public subscribe(listener: TelemetryListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public notifyListeners(data: Partial<TelemetryState>): void {
    this.listeners.forEach(fn => fn(data));
  }

  public disconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.isConnected = false;
  }

  public getStatus(): boolean {
    return this.isConnected;
  }
}

export const wsService = new WebSocketService();
