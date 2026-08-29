import React, { useEffect, useRef } from 'react';
import { RiskLevel } from '../../types/telemetry';
import { RISK_COLORS } from '../../lib/theme';

interface CanvasFallbackCoreProps {
  riskScore: number;
  riskClass: RiskLevel;
  frequencyBands: number[];
}

export const CanvasFallbackCore: React.FC<CanvasFallbackCoreProps> = ({
  riskScore,
  riskClass,
  frequencyBands
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const config = RISK_COLORS[riskClass];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    const render = () => {
      time += 0.03;
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;
      const baseRadius = Math.min(width, height) * 0.28;

      ctx.clearRect(0, 0, width, height);

      // Draw background ambient glow
      const grad = ctx.createRadialGradient(centerX, centerY, 10, centerX, centerY, baseRadius * 1.6);
      grad.addColorStop(0, config.bg);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Draw outer rings
      ctx.strokeStyle = config.border;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius * 1.25, 0, Math.PI * 2);
      ctx.stroke();

      // Draw audio-deformed polygon
      const points = 64;
      ctx.beginPath();
      for (let i = 0; i <= points; i++) {
        const theta = (i / points) * Math.PI * 2;
        const bandIdx = i % (frequencyBands.length || 32);
        const energy = frequencyBands[bandIdx] || 0.2;
        
        const wave = Math.sin(theta * 6 + time * 3) * 8 * energy;
        const jitter = (riskScore > 65 && i % 3 === 0) ? (Math.random() - 0.5) * 16 * (riskScore / 100) : 0;
        const r = baseRadius + wave + jitter;

        const x = centerX + Math.cos(theta) * r;
        const y = centerY + Math.sin(theta) * r;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = config.primary;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Inner core circle
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius * 0.65, 0, Math.PI * 2);
      ctx.fillStyle = config.bg;
      ctx.fill();
      ctx.strokeStyle = config.primary;
      ctx.lineWidth = 1;
      ctx.stroke();

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [riskScore, riskClass, frequencyBands, config]);

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <canvas
        ref={canvasRef}
        width={360}
        height={320}
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
    </div>
  );
};
