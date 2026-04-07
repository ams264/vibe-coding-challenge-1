'use client';

import { useEffect, useState, useRef } from 'react';
import styles from './page.module.css';

// ── GIFs ─────────────────────────────────────────────────────────────────────

const CELEBRATION_GIFS = [
  'https://media.giphy.com/media/uTuLngvL9p0Xe/giphy.gif',
  'https://media.giphy.com/media/huJmPXfeir5JlpPAx0/giphy.gif',
  'https://media.giphy.com/media/YsUOjrLvdULDICfqoq/giphy.gif',
  'https://media.giphy.com/media/VKNWnzqsQplba/giphy.gif',
  'https://media.giphy.com/media/fUQ4rhUZJYiQsas6WD/giphy.gif',
  'https://media.giphy.com/media/l41lIYgYI6TwHLRde/giphy.gif',
  'https://media.giphy.com/media/3o6ozlFrwblxYRqc8w/giphy.gif',
  'https://media.giphy.com/media/l378uHisF00ugOA36/giphy.gif',
  'https://media.giphy.com/media/s2qXK8wAvkHTO/giphy.gif',
  'https://media.giphy.com/media/103lPvxq3k01l6/giphy.gif',
  'https://media.giphy.com/media/epbQ7l3UQor7y/giphy.gif',
  'https://media.giphy.com/media/KEVNWkmWm6dm8/giphy.gif',
  'https://media.giphy.com/media/o75ajIFH0QnQC3nCeD/giphy.gif',
  'https://media.giphy.com/media/26u4exk4zsAqPcq08/giphy.gif',
  'https://media.giphy.com/media/zTF0aDwhF239JQzIXw/giphy.gif',
];
const randomGif = () => CELEBRATION_GIFS[Math.floor(Math.random() * CELEBRATION_GIFS.length)];

// ── Types ─────────────────────────────────────────────────────────────────────

interface User { username: string; role: string; departmentId: number | null; }

interface EventRow {
  EventID: number;
  EventName: string;
  EventDescription: string | null;
  EventCategoryID: number | null;
}

interface GameSummary {
  GameID: number;
  MarkedCount: number;
  CreatedDate: string;
  Status: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const CATEGORY_EMOJI: Record<number, string> = { 1: '📅', 2: '💬', 3: '💥', 4: '🎲' };
const COL_HEADERS = ['B', 'I', 'N', 'G', 'O'];

function buildGrid(events: EventRow[]): (EventRow | null)[] {
  const grid: (EventRow | null)[] = [...events.slice(0, 24)];
  grid.splice(12, 0, null);
  return grid;
}

function checkBingo(marked: Set<number>): boolean {
  const lines = [
    [0,1,2,3,4],[5,6,7,8,9],[10,11,12,13,14],[15,16,17,18,19],[20,21,22,23,24],
    [0,5,10,15,20],[1,6,11,16,21],[2,7,12,17,22],[3,8,13,18,23],[4,9,14,19,24],
    [0,6,12,18,24],[4,8,12,16,20],
  ];
  return lines.some((l) => l.every((i) => marked.has(i)));
}

function fmtDate(str: string) {
  return new Date(str + 'Z').toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function BingoPage() {
  const [user, setUser]               = useState<User | null | undefined>(undefined); // undefined = loading
  const [savedGames, setSavedGames]   = useState<GameSummary[]>([]);
  const [currentGameId, setCurrentGameId] = useState<number | null>(null);
  const [grid, setGrid]               = useState<(EventRow | null)[]>([]);
  const [marked, setMarked]           = useState<Set<number>>(new Set([12]));
  const [loading, setLoading]         = useState(true);
  const [flipped, setFlipped]         = useState(false);
  const [gifUrl, setGifUrl]           = useState<string | null>(null);
  const [tooltip, setTooltip]         = useState<{ idx: number; text: string } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const saveRef = useRef<number | null>(null); // tracks latest save for debounce

  // ── Bootstrap ──────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.ok ? r.json() : { user: null })
      .then(({ user: u }: { user: User | null }) => setUser(u ?? null));
  }, []);

  useEffect(() => {
    if (user === undefined) return; // still loading auth
    if (user) {
      // Logged in: load saved games then resume latest or start fresh
      fetch('/api/games')
        .then((r) => r.json())
        .then((games: GameSummary[]) => {
          setSavedGames(games);
          if (games.length > 0) {
            resumeGame(games[0].GameID);
          } else {
            startNewGame(true);
          }
        });
    } else {
      // Guest: just deal a card
      startNewGame(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // ── Game actions ───────────────────────────────────────────────────────────

  async function startNewGame(persist: boolean) {
    setLoading(true);
    setFlipped(false);
    setGifUrl(null);
    setTooltip(null);

    const res = await fetch('/api/events/random?count=24');
    const events: EventRow[] = res.ok ? await res.json() : [];
    const newGrid = buildGrid(events);
    const initMarked = new Set<number>([12]);

    setGrid(newGrid);
    setMarked(initMarked);

    if (persist && user) {
      const gameRes = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grid: newGrid }),
      });
      if (gameRes.ok) {
        const game = await gameRes.json();
        setCurrentGameId(game.GameID);
        setSavedGames((prev) => [
          { GameID: game.GameID, MarkedCount: 1, CreatedDate: game.CreatedDate, Status: 'in_progress' },
          ...prev,
        ]);
      }
    } else {
      setCurrentGameId(null);
    }

    setLoading(false);
  }

  async function resumeGame(gameId: number) {
    setLoading(true);
    setTooltip(null);
    const res = await fetch(`/api/games/${gameId}`);
    if (res.ok) {
      const game = await res.json();
      setCurrentGameId(game.GameID);
      setGrid(JSON.parse(game.GridJSON));
      const markedArr: number[] = JSON.parse(game.MarkedJSON);
      setMarked(new Set(markedArr));
      const isComplete = game.Status === 'complete';
      setFlipped(isComplete);
      setGifUrl(isComplete ? randomGif() : null);
    }
    setLoading(false);
    setSidebarOpen(false);
  }

  async function removeGame(gameId: number) {
    await fetch(`/api/games/${gameId}`, { method: 'DELETE' });
    setSavedGames((prev) => prev.filter((g) => g.GameID !== gameId));
    if (currentGameId === gameId) {
      setCurrentGameId(null);
      startNewGame(true);
    }
  }

  // ── Cell toggle ────────────────────────────────────────────────────────────

  function toggle(idx: number) {
    if (idx === 12 || flipped) return;
    setMarked((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);

      persistMarked(next);
      if (checkBingo(next)) triggerWin(next);
      return next;
    });
  }

  function persistMarked(next: Set<number>) {
    if (!currentGameId || !user) return;
    const arr = Array.from(next);
    // Debounce: cancel any in-flight save and schedule a new one
    if (saveRef.current) clearTimeout(saveRef.current);
    saveRef.current = window.setTimeout(() => {
      fetch(`/api/games/${currentGameId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marked: arr }),
      });
      setSavedGames((prev) =>
        prev.map((g) => g.GameID === currentGameId ? { ...g, MarkedCount: arr.length } : g)
      );
    }, 300);
  }

  async function triggerWin(next: Set<number>) {
    setGifUrl(randomGif());

    if (currentGameId && user) {
      // Save final marks + mark complete
      await fetch(`/api/games/${currentGameId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marked: Array.from(next), status: 'complete' }),
      });
      setSavedGames((prev) => prev.filter((g) => g.GameID !== currentGameId));
    }

    await new Promise((r) => setTimeout(r, 350));
    setFlipped(true);
  }

  function handleReset() {
    const initMarked = new Set<number>([12]);
    setMarked(initMarked);
    if (currentGameId && user) {
      fetch(`/api/games/${currentGameId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marked: [12] }),
      });
      setSavedGames((prev) =>
        prev.map((g) => g.GameID === currentGameId ? { ...g, MarkedCount: 1 } : g)
      );
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className={styles.page}>

      {/* ── Mobile sidebar toggle ── */}
      {user && (
        <button className={styles.sidebarToggle} onClick={() => setSidebarOpen((o) => !o)}>
          🎮 {savedGames.length > 0 ? `${savedGames.length} game${savedGames.length > 1 ? 's' : ''}` : 'Games'}
        </button>
      )}

      <div className={styles.layout}>

        {/* ── Sidebar ── */}
        {user && (
          <aside className={[styles.sidebar, sidebarOpen ? styles.sidebarOpen : ''].join(' ')}>
            <div className={styles.sidebarHeader}>
              <h2 className={styles.sidebarTitle}>🎮 In Progress</h2>
              <button className={styles.sidebarClose} onClick={() => setSidebarOpen(false)}>✕</button>
            </div>

            {savedGames.length === 0 ? (
              <p className={styles.sidebarEmpty}>No games in progress.<br />Start one below!</p>
            ) : (
              <ul className={styles.gameList}>
                {savedGames.map((g) => (
                  <li
                    key={g.GameID}
                    className={[styles.gameItem, g.GameID === currentGameId ? styles.gameItemActive : ''].join(' ')}
                  >
                    <button className={styles.gameResume} onClick={() => resumeGame(g.GameID)}>
                      <span className={styles.gameDate}>{fmtDate(g.CreatedDate)}</span>
                      <span className={styles.gameProgress}>
                        <span
                          className={styles.progressBar}
                          style={{ width: `${((g.MarkedCount - 1) / 24) * 100}%` }}
                        />
                        <span className={styles.progressLabel}>{g.MarkedCount - 1}/24 marked</span>
                      </span>
                    </button>
                    <button
                      className={styles.gameRemove}
                      onClick={() => removeGame(g.GameID)}
                      title="Remove game"
                    >✕</button>
                  </li>
                ))}
              </ul>
            )}

            <button className={styles.newGameBtn} onClick={() => startNewGame(true)}>
              + New Game
            </button>

            {!user && (
              <p className={styles.sidebarSignIn}>
                <a href="/login">Sign in</a> to save your progress
              </p>
            )}
          </aside>
        )}

        {/* ── Main card (flip container) ── */}
        <div className={styles.main}>
          <div className={styles.perspective}>
            <div className={[styles.flipper, flipped ? styles.flipped : ''].join(' ')}>

              {/* FRONT */}
              <div className={styles.face}>
                <div className={styles.card}>
                  <div className={styles.titleBar}>
                    <span className={styles.titleEmoji}>🖥️</span>
                    <h1 className={styles.title}>Town Hall Bingo</h1>
                    <span className={styles.titleEmoji}>🎉</span>
                  </div>
                  <p className={styles.subtitle}>
                    Mark each square when it happens. First to BINGO wins bragging rights
                    (and probably has to present next quarter).
                    {!user && <><br /><span className={styles.guestHint}><a href="/login" className={styles.guestLink}>Sign in</a> to save your progress.</span></>}
                  </p>

                  {loading ? (
                    <div className={styles.loadingWrap}>
                      <div className={styles.spinner} />
                      <p>Shuffling the chaos…</p>
                    </div>
                  ) : (
                    <div className={styles.gridWrap}>
                      <div className={styles.colHeaders}>
                        {COL_HEADERS.map((h) => <div key={h} className={styles.colHeader}>{h}</div>)}
                      </div>
                      <div className={styles.grid}>
                        {grid.map((cell, idx) => {
                          const isFree = idx === 12;
                          const isMarked = marked.has(idx);
                          return (
                            <button
                              key={idx}
                              className={[
                                styles.cell,
                                isFree ? styles.cellFree : '',
                                isMarked && !isFree ? styles.cellMarked : '',
                              ].join(' ')}
                              onClick={() => toggle(idx)}
                              onMouseEnter={() => cell?.EventDescription ? setTooltip({ idx, text: cell.EventDescription }) : null}
                              onMouseLeave={() => setTooltip(null)}
                            >
                              {isFree ? (
                                <span className={styles.freeSpace}>⭐<br />FREE</span>
                              ) : (
                                <>
                                  <span className={styles.cellEmoji}>{CATEGORY_EMOJI[cell?.EventCategoryID ?? 4]}</span>
                                  <span className={styles.cellText}>{cell?.EventName}</span>
                                  {isMarked && <span className={styles.daub}>✓</span>}
                                </>
                              )}
                              {tooltip?.idx === idx && <span className={styles.tooltip}>{tooltip.text}</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className={styles.actions}>
                    <button className={styles.newCardBtn} onClick={() => startNewGame(!!user)}>🔀 New Card</button>
                    <button className={styles.resetBtn} onClick={handleReset}>↺ Reset</button>
                  </div>
                  <p className={styles.footer}>
                    💡 Hover a square for the full description · Click to mark · Get 5 in a row to win
                  </p>
                </div>
              </div>

              {/* BACK */}
              <div className={[styles.face, styles.faceBack].join(' ')}>
                <div className={styles.winCard}>
                  <div className={styles.winStars}>🌟✨🎊✨🌟</div>
                  <h2 className={styles.winTitle}>B I N G O !</h2>
                  <p className={styles.winSub}>
                    You survived the Town Hall!<br />
                    <span className={styles.winSubSmall}>Reward yourself with a very long lunch.</span>
                  </p>
                  <div className={styles.gifFrame}>
                    {gifUrl
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={gifUrl} alt="Celebration!" className={styles.gif} />
                      : <div className={styles.gifFallback}>🎉🎉🎉</div>
                    }
                  </div>
                  <p className={styles.poweredBy}>GIF powered by GIPHY</p>
                  <div className={styles.winActions}>
                    <button className={styles.newCardBtn} onClick={() => startNewGame(!!user)}>🔀 New Card</button>
                    <button className={styles.resetBtn} onClick={() => setFlipped(false)}>← Back to Board</button>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
