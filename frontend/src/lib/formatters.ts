export function formatTimestamp(isoString?: string): string {
  const d = isoString ? new Date(isoString) : new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const ms = d.getMilliseconds().toString().padStart(3, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${ms}`;
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(mins)}:${pad(secs)}`;
}

export function formatDecibels(db: number): string {
  return `${db > 0 ? '+' : ''}${db.toFixed(1)} dB`;
}

export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

export function formatHz(hz: number): string {
  if (hz >= 1000) {
    return `${(hz / 1000).toFixed(1)} kHz`;
  }
  return `${Math.round(hz)} Hz`;
}
