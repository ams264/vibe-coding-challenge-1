'use client';

import { useEffect, useState, useCallback } from 'react';
import styles from './page.module.css';

interface EventRow {
  EventID: number;
  EventName: string;
  EventDescription: string | null;
  EventCategoryID: number | null;
}

const CATEGORY_EMOJI: Record<number, string> = {
  1: '📅',
  2: '💬',
  3: '💥',
  4: '🎲',
};

function buildGrid(events: EventRow[]): (EventRow | null)[] {
  const grid: (EventRow | null)[] = [...events.slice(0, 24)];
  grid.splice(12, 0, null); // null = free space at centre
  return grid;
}

function checkBingo(marked: Set<number>): boolean {
  const lines = [
    // rows
    [0,1,2,3,4],[5,6,7,8,9],[10,11,12,13,14],[15,16,17,18,19],[20,21,22,23,24],
    // cols
    [0,5,10,15,20],[1,6,11,16,21],[2,7,12,17,22],[3,8,13,18,23],[4,9,14,19,24],
    // diagonals
    [0,6,12,18,24],[4,8,12,16,20],
  ];
  return lines.some((line) => line.every((i) => marked.has(i)));
}

export default function BingoPage() {
  const [grid, setGrid]         = useState<(EventRow | null)[]>([]);
  const [marked, setMarked]     = useState<Set<number>>(new Set([12]));
  const [loading, setLoading]   = useState(true);
  const [flipped, setFlipped]   = useState(false);
  const [gifUrl, setGifUrl]     = useState<string | null>(null);
  const [gifLoading, setGifLoading] = useState(false);
  const [gifPool, setGifPool]   = useState<string[]>([]);
  const [tooltip, setTooltip]   = useState<{ idx: number; text: string } | null>(null);

  // Pre-fetch the GIF pool once so wins are instant
  useEffect(() => {
    fetch('/api/celebration-gif')
      .then((r) => r.ok ? r.json() : { gifUrls: [] })
      .then(({ gifUrls }: { gifUrls: string[] }) => setGifPool(gifUrls));
  }, []);

  const fetchCard = useCallback(async () => {
    setLoading(true);
    setFlipped(false);
    setGifUrl(null);
    setMarked(new Set([12]));
    setTooltip(null);
    const res = await fetch('/api/events/random?count=24');
    if (res.ok) {
      const events: EventRow[] = await res.json();
      setGrid(buildGrid(events));
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchCard(); }, [fetchCard]);

  function toggle(idx: number) {
    if (idx === 12) return;
    setMarked((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);

      if (!flipped && checkBingo(next)) {
        triggerWin();
      }
      return next;
    });
  }

  async function triggerWin() {
    // Pick a random GIF from the pre-fetched pool immediately
    if (gifPool.length > 0) {
      const pick = gifPool[Math.floor(Math.random() * gifPool.length)];
      setGifUrl(pick);
    } else {
      // Pool not ready yet — fetch on demand
      setGifLoading(true);
      const res = await fetch('/api/celebration-gif');
      if (res.ok) {
        const { gifUrls }: { gifUrls: string[] } = await res.json();
        if (gifUrls.length > 0) {
          setGifPool(gifUrls);
          setGifUrl(gifUrls[Math.floor(Math.random() * gifUrls.length)]);
        }
      }
      setGifLoading(false);
    }

    // Small delay so the last cell's mark animation plays first
    await new Promise((r) => setTimeout(r, 350));
    setFlipped(true);
  }

  function handlePlayAgain() {
    fetchCard();
  }

  function handleFlipBack() {
    setFlipped(false);
  }

  const colHeaders = ['B', 'I', 'N', 'G', 'O'];

  return (
    <div className={styles.page}>
      <div className={styles.perspective}>
        <div className={[styles.flipper, flipped ? styles.flipped : ''].join(' ')}>

          {/* ── FRONT FACE ── */}
          <div className={styles.face}>
            <div className={styles.card}>
              <div className={styles.titleBar}>
                <span className={styles.titleEmoji}>🖥️</span>
                <h1 className={styles.title}>IT Town Hall Bingo</h1>
                <span className={styles.titleEmoji}>🎉</span>
              </div>
              <p className={styles.subtitle}>
                Mark each square when it happens. First to BINGO wins bragging rights
                (and probably has to present next quarter).
              </p>

              {loading ? (
                <div className={styles.loadingWrap}>
                  <div className={styles.spinner} />
                  <p>Shuffling the chaos…</p>
                </div>
              ) : (
                <div className={styles.gridWrap}>
                  <div className={styles.colHeaders}>
                    {colHeaders.map((h) => (
                      <div key={h} className={styles.colHeader}>{h}</div>
                    ))}
                  </div>
                  <div className={styles.grid}>
                    {grid.map((cell, idx) => {
                      const isFree   = idx === 12;
                      const isMarked = marked.has(idx);
                      return (
                        <button
                          key={idx}
                          className={[
                            styles.cell,
                            isFree    ? styles.cellFree   : '',
                            isMarked && !isFree ? styles.cellMarked : '',
                          ].join(' ')}
                          onClick={() => toggle(idx)}
                          onMouseEnter={() =>
                            cell?.EventDescription
                              ? setTooltip({ idx, text: cell.EventDescription })
                              : null
                          }
                          onMouseLeave={() => setTooltip(null)}
                        >
                          {isFree ? (
                            <span className={styles.freeSpace}>⭐<br />FREE</span>
                          ) : (
                            <>
                              <span className={styles.cellEmoji}>
                                {CATEGORY_EMOJI[cell?.EventCategoryID ?? 4]}
                              </span>
                              <span className={styles.cellText}>{cell?.EventName}</span>
                              {isMarked && <span className={styles.daub}>✓</span>}
                            </>
                          )}
                          {tooltip?.idx === idx && (
                            <span className={styles.tooltip}>{tooltip.text}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className={styles.actions}>
                <button className={styles.newCardBtn} onClick={fetchCard}>
                  🔀 New Card
                </button>
                <button
                  className={styles.resetBtn}
                  onClick={() => { setMarked(new Set([12])); }}
                >
                  ↺ Reset
                </button>
              </div>
              <p className={styles.footer}>
                💡 Hover a square for the full description · Click to mark · Get 5 in a row to win
              </p>
            </div>
          </div>

          {/* ── BACK FACE ── */}
          <div className={[styles.face, styles.faceBack].join(' ')}>
            <div className={styles.winCard}>
              <div className={styles.winStars}>🌟✨🎊✨🌟</div>
              <h2 className={styles.winTitle}>B I N G O !</h2>
              <p className={styles.winSub}>
                You survived the IT Town Hall!<br />
                <span className={styles.winSubSmall}>
                  Reward yourself with a very long lunch.
                </span>
              </p>

              <div className={styles.gifFrame}>
                {gifLoading && (
                  <div className={styles.gifSpinner}>
                    <div className={styles.spinner} />
                    <span>Loading your victory gif…</span>
                  </div>
                )}
                {!gifLoading && gifUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={gifUrl} alt="Celebration!" className={styles.gif} />
                )}
                {!gifLoading && !gifUrl && (
                  <div className={styles.gifFallback}>🎉🎉🎉</div>
                )}
              </div>

              <p className={styles.poweredBy}>GIF powered by GIPHY</p>

              <div className={styles.winActions}>
                <button className={styles.newCardBtn} onClick={handlePlayAgain}>
                  🔀 New Card
                </button>
                <button className={styles.resetBtn} onClick={handleFlipBack}>
                  ← Back to Board
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
