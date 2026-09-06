import React, { useState } from 'react';
import { historyService, HistoryRecord } from '../services/historyService';
import { Search, X, ArrowRight, FileAudio } from 'lucide-react';

interface HistoryProps {
  onNavigateToAnalyze?: () => void;
}

export const History: React.FC<HistoryProps> = ({ onNavigateToAnalyze }) => {
  const [historyItems] = useState<HistoryRecord[]>(() => historyService.getHistory());
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<HistoryRecord | null>(null);

  const filtered = historyItems.filter((r) =>
    [r.callTitle, r.caller, r.result, r.summary]
      .join(' ')
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const riskColor = (score: number) =>
    score >= 65 ? 'var(--danger)' : score >= 35 ? 'var(--warn)' : 'var(--ok)';

  const badgeClass = (score: number) =>
    score >= 65 ? 'badge badge-danger' : score >= 35 ? 'badge badge-warn' : 'badge badge-ok';

  return (
    <div className="page-wrap">
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div>
          <h1 className="page-title" style={{ marginBottom: '4px' }}>
            Analysis history
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-2)' }}>
            Previous voice analyses and their results.
          </p>
        </div>

        {/* Search - only show if there are history items */}
        {historyItems.length > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--r-md)',
              padding: '7px 14px',
              width: '240px',
            }}
          >
            <Search size={13} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-1)',
                fontSize: '13px',
                outline: 'none',
                width: '100%',
                fontFamily: 'var(--font)',
              }}
            />
          </div>
        )}
      </div>

      {/* Empty State */}
      {historyItems.length === 0 ? (
        <div
          className="card-flat"
          style={{
            textAlign: 'center',
            padding: '64px 24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'var(--bg-raised)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-3)',
            }}
          >
            <FileAudio size={22} />
          </div>
          <h2 className="section-heading" style={{ fontSize: '18px', marginBottom: '2px' }}>
            No analyses yet
          </h2>
          <p style={{ color: 'var(--text-2)', fontSize: '13px', maxWidth: '420px', margin: '0 auto 10px' }}>
            Analyze a voice to see your results here.
          </p>
          {onNavigateToAnalyze && (
            <button className="btn btn-primary" onClick={onNavigateToAnalyze}>
              Analyze a voice
              <ArrowRight size={14} />
            </button>
          )}
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="card-flat"
          style={{
            textAlign: 'center',
            padding: '48px 24px',
            color: 'var(--text-3)',
            fontSize: '13px',
          }}
        >
          No matching analyses found for &quot;{search}&quot;.
        </div>
      ) : (
        /* Table */
        <div
          className="card-flat"
          style={{ padding: 0, overflowX: 'auto' }}
        >
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '13px',
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: '1px solid var(--border-faint)',
                  color: 'var(--text-3)',
                  fontSize: '11px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                {['Date', 'Audio Recording', 'Risk Score', 'Verdict', 'Action'].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: '12px 18px',
                      textAlign: h === 'Action' ? 'right' : 'left',
                      fontWeight: 600,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => setSelected(row)}
                  style={{
                    borderBottom: '1px solid var(--border-faint)',
                    cursor: 'pointer',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLTableRowElement).style.background = 'var(--bg-raised)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLTableRowElement).style.background = 'transparent';
                  }}
                >
                  <td style={{ padding: '13px 18px', color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                    {row.date}
                  </td>
                  <td style={{ padding: '13px 18px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-1)' }}>{row.callTitle}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>{row.caller}</div>
                  </td>
                  <td style={{ padding: '13px 18px' }}>
                    <span
                      className="font-mono"
                      style={{ fontWeight: 700, color: riskColor(row.riskScore) }}
                    >
                      {row.riskScore}%
                    </span>
                  </td>
                  <td style={{ padding: '13px 18px' }}>
                    <span className={badgeClass(row.riskScore)}>{row.result}</span>
                  </td>
                  <td style={{ padding: '13px 18px', textAlign: 'right' }}>
                    <button className="btn" style={{ padding: '4px 12px', fontSize: '12px' }}>
                      View <ArrowRight size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 200,
            padding: '20px',
          }}
          onClick={() => setSelected(null)}
        >
          <div
            className="card-flat"
            style={{
              width: '100%',
              maxWidth: '520px',
              background: 'var(--bg-surface)',
              padding: '24px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '4px' }}>{selected.date}</div>
                <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-1)' }}>{selected.callTitle}</h3>
                <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>{selected.caller}</div>
              </div>
              <button
                onClick={() => setSelected(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)' }}
              >
                <X size={17} />
              </button>
            </div>

            <div
              style={{
                background: 'var(--bg-raised)',
                border: '1px solid var(--border-faint)',
                borderRadius: 'var(--r-md)',
                padding: '14px 16px',
                marginBottom: '16px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-2)' }}>Risk assessment</span>
                <span
                  className="font-mono"
                  style={{ fontWeight: 800, color: riskColor(selected.riskScore) }}
                >
                  {selected.riskScore}% — {selected.result}
                </span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-1)', lineHeight: 1.55, margin: 0 }}>
                {selected.summary}
              </p>
              {selected.recommendation && (
                <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-faint)', fontSize: '12px', color: 'var(--text-2)' }}>
                  <strong style={{ color: 'var(--text-1)' }}>Recommendation: </strong>
                  {selected.recommendation}
                </div>
              )}
            </div>

            <div style={{ textAlign: 'right' }}>
              <button className="btn btn-primary" onClick={() => setSelected(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
