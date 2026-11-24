import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, Pause, RotateCcw, Volume2, VolumeX, Trophy, ArrowUp, ArrowDown, 
  ArrowLeft, ArrowRight, Settings, Home, Zap, Shield, Sparkles, Award
} from 'lucide-react';

// Types
type GameState = 'TITLE_MENU' | 'PLAYING' | 'PAUSED' | 'GAME_OVER' | 'LEADERBOARD';
type Difficulty = 'CLASSIC' | 'FAST' | 'HARDCORE';
type NeonTheme = 'CYAN' | 'GREEN' | 'MAGENTA' | 'AMBER';

interface Position {
  x: number;
  y: number;
}

interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
  length: number;
  date: string;
  difficulty: Difficulty;
}

const GRID_SIZE = 20;

const THEME_COLORS: Record<NeonTheme, { head: string, body: string, glow: string, food: string, text: string, border: string }> = {
  CYAN: {
    head: 'bg-cyan-400',
    body: 'bg-cyan-500/80',
    glow: 'shadow-[0_0_12px_rgba(34,211,238,0.8)]',
    food: 'bg-fuchsia-500 shadow-[0_0_15px_rgba(217,70,239,0.9)]',
    text: 'text-cyan-400',
    border: 'border-cyan-500/50'
  },
  GREEN: {
    head: 'bg-emerald-400',
    body: 'bg-emerald-500/80',
    glow: 'shadow-[0_0_12px_rgba(52,211,153,0.8)]',
    food: 'bg-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.9)]',
    text: 'text-emerald-400',
    border: 'border-emerald-500/50'
  },
  MAGENTA: {
    head: 'bg-pink-400',
    body: 'bg-pink-500/80',
    glow: 'shadow-[0_0_12px_rgba(244,114,182,0.8)]',
    food: 'bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.9)]',
    text: 'text-pink-400',
    border: 'border-pink-500/50'
  },
  AMBER: {
    head: 'bg-amber-400',
    body: 'bg-amber-500/80',
    glow: 'shadow-[0_0_12px_rgba(251,191,36,0.8)]',
    food: 'bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.9)]',
    text: 'text-amber-400',
    border: 'border-amber-500/50'
  }
};

export default function App() {
  // Game States
  const [gameState, setGameState] = useState<GameState>('TITLE_MENU');
  const [difficulty, setDifficulty] = useState<Difficulty>('CLASSIC');
  const [theme, setTheme] = useState<NeonTheme>('CYAN');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [hasWalls, setHasWalls] = useState<boolean>(true);

  // Gameplay States
  const [snake, setSnake] = useState<Position[]>([
    { x: 10, y: 10 },
    { x: 10, y: 11 },
    { x: 10, y: 12 }
  ]);
  const [direction, setDirection] = useState<'UP' | 'DOWN' | 'LEFT' | 'RIGHT'>('UP');
  const [nextDirection, setNextDirection] = useState<'UP' | 'DOWN' | 'LEFT' | 'RIGHT'>('UP');
  const [food, setFood] = useState<Position>({ x: 5, y: 5 });
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(0);
  const [applesEaten, setApplesEaten] = useState<number>(0);
  
  // Leaderboard
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [playerName, setPlayerName] = useState<string>('');
  const [scoreSaved, setScoreSaved] = useState<boolean>(false);

  // Audio Context Ref
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Initialize Audio
  const initAudio = () => {
    if (!audioCtxRef.current) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        audioCtxRef.current = new AudioContextClass();
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  const playTone = (freq: number, type: OscillatorType, duration: number, gainVal = 0.1) => {
    if (!soundEnabled) return;
    try {
      initAudio();
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(gainVal, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // Audio error fallback
    }
  };

  const playEatSound = () => {
    playTone(587.33, 'sine', 0.1, 0.15); // D5
    setTimeout(() => playTone(880, 'sine', 0.15, 0.15), 80); // A5
  };

  const playGameOverSound = () => {
    playTone(150, 'sawtooth', 0.3, 0.2);
    setTimeout(() => playTone(110, 'sawtooth', 0.4, 0.2), 150);
    setTimeout(() => playTone(80, 'sawtooth', 0.6, 0.25), 300);
  };

  const playClickSound = () => {
    playTone(440, 'triangle', 0.05, 0.08);
  };

  // Load high score & leaderboard from localStorage
  useEffect(() => {
    try {
      const savedHS = localStorage.getItem('neon_snake_highscore');
      if (savedHS) setHighScore(parseInt(savedHS, 10));

      const savedLB = localStorage.getItem('neon_snake_leaderboard');
      if (savedLB) {
        setLeaderboard(JSON.parse(savedLB));
      } else {
        // Default seed leaderboard
        const initialLB: LeaderboardEntry[] = [
          { id: '1', name: 'CYBER_VIPER', score: 420, length: 45, date: '2026-11-23', difficulty: 'CLASSIC' },
          { id: '2', name: 'NEON_GHOST', score: 350, length: 38, date: '2026-11-22', difficulty: 'CLASSIC' },
          { id: '3', name: 'GRID_RUNNER', score: 280, length: 31, date: '2026-11-21', difficulty: 'CLASSIC' },
        ];
        setLeaderboard(initialLB);
        localStorage.setItem('neon_snake_leaderboard', JSON.stringify(initialLB));
      }
    } catch {
      // LocalStorage error fallback
    }
  }, []);

  // Spawn food avoiding snake
  const spawnFood = useCallback((currentSnake: Position[]): Position => {
    let newFood: Position;
    let collision: boolean;
    do {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE)
      };
      collision = currentSnake.some(seg => seg.x === newFood.x && seg.y === newFood.y);
    } while (collision);
    return newFood;
  }, []);

  // Start new game
  const startGame = () => {
    playClickSound();
    const initialSnake = [
      { x: 10, y: 10 },
      { x: 10, y: 11 },
      { x: 10, y: 12 }
    ];
    setSnake(initialSnake);
    setDirection('UP');
    setNextDirection('UP');
    setFood(spawnFood(initialSnake));
    setScore(0);
    setApplesEaten(0);
    setScoreSaved(false);
    setGameState('PLAYING');
  };

  // Calculate speed based on snake length & difficulty
  const getGameSpeed = useCallback(() => {
    const baseSpeed = difficulty === 'FAST' ? 90 : difficulty === 'HARDCORE' ? 70 : 130;
    const lengthReduction = (snake.length - 3) * 3;
    return Math.max(45, baseSpeed - lengthReduction);
  }, [difficulty, snake.length]);

  // Handle directional inputs safely
  const changeDirection = useCallback((newDir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
    if (gameState !== 'PLAYING') return;
    
    setNextDirection(prev => {
      if (
        (newDir === 'UP' && prev !== 'DOWN') ||
        (newDir === 'DOWN' && prev !== 'UP') ||
        (newDir === 'LEFT' && prev !== 'RIGHT') ||
        (newDir === 'RIGHT' && prev !== 'LEFT')
      ) {
        return newDir;
      }
      return prev;
    });
  }, [gameState]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'KeyW'].includes(e.code)) {
        e.preventDefault();
        changeDirection('UP');
      } else if (['ArrowDown', 'KeyS'].includes(e.code)) {
        e.preventDefault();
        changeDirection('DOWN');
      } else if (['ArrowLeft', 'KeyA'].includes(e.code)) {
        e.preventDefault();
        changeDirection('LEFT');
      } else if (['ArrowRight', 'KeyD'].includes(e.code)) {
        e.preventDefault();
        changeDirection('RIGHT');
      } else if (e.code === 'Space') {
        e.preventDefault();
        if (gameState === 'PLAYING') setGameState('PAUSED');
        else if (gameState === 'PAUSED') setGameState('PLAYING');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [changeDirection, gameState]);

  // Touch Swipe Handling State
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 0) return;
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current || e.changedTouches.length === 0) return;
    const deltaX = e.changedTouches[0].clientX - touchStartRef.current.x;
    const deltaY = e.changedTouches[0].clientY - touchStartRef.current.y;
    const minSwipeDistance = 30;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      if (Math.abs(deltaX) > minSwipeDistance) {
        if (deltaX > 0) changeDirection('RIGHT');
        else changeDirection('LEFT');
      }
    } else {
      if (Math.abs(deltaY) > minSwipeDistance) {
        if (deltaY > 0) changeDirection('DOWN');
        else changeDirection('UP');
      }
    }
    touchStartRef.current = null;
  };

  // Main Game Loop Tick
  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    const interval = setInterval(() => {
      setSnake(prevSnake => {
        setDirection(nextDirection);
        const head = { ...prevSnake[0] };

        switch (nextDirection) {
          case 'UP': head.y -= 1; break;
          case 'DOWN': head.y += 1; break;
          case 'LEFT': head.x -= 1; break;
          case 'RIGHT': head.x += 1; break;
        }

        // Wall Collision Check
        if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
          if (hasWalls) {
            playGameOverSound();
            setGameState('GAME_OVER');
            return prevSnake;
          } else {
            // Screen wrap
            if (head.x < 0) head.x = GRID_SIZE - 1;
            if (head.x >= GRID_SIZE) head.x = 0;
            if (head.y < 0) head.y = GRID_SIZE - 1;
            if (head.y >= GRID_SIZE) head.y = 0;
          }
        }

        // Self Collision Check
        if (prevSnake.some(seg => seg.x === head.x && seg.y === head.y)) {
          playGameOverSound();
          setGameState('GAME_OVER');
          return prevSnake;
        }

        const newSnake = [head, ...prevSnake];

        // Food Collision Check
        if (head.x === food.x && head.y === food.y) {
          playEatSound();
          const pointsEarned = difficulty === 'HARDCORE' ? 25 : difficulty === 'FAST' ? 20 : 10;
          const newScore = score + pointsEarned;
          setScore(newScore);
          setApplesEaten(prev => prev + 1);

          if (newScore > highScore) {
            setHighScore(newScore);
            localStorage.setItem('neon_snake_highscore', newScore.toString());
          }

          setFood(spawnFood(newSnake));
        } else {
          newSnake.pop();
        }

        return newSnake;
      });
    }, getGameSpeed());

    return () => clearInterval(interval);
  }, [gameState, nextDirection, food, spawnFood, getGameSpeed, hasWalls, score, highScore, difficulty]);

  // Save Score to Leaderboard
  const saveScoreToLeaderboard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim() || scoreSaved) return;

    const newEntry: LeaderboardEntry = {
      id: Date.now().toString(),
      name: playerName.trim().toUpperCase().substring(0, 12),
      score,
      length: snake.length,
      date: new Date().toISOString().split('T')[0],
      difficulty
    };

    const updatedLB = [...leaderboard, newEntry]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    setLeaderboard(updatedLB);
    localStorage.setItem('neon_snake_leaderboard', JSON.stringify(updatedLB));
    setScoreSaved(true);
    playClickSound();
  };

  const currentThemeColors = THEME_COLORS[theme];

  return (
    <div className="fixed inset-0 bg-slate-950 text-slate-100 flex flex-col items-center justify-between select-none overflow-hidden font-sans">
      {/* Background ambient retro grid & glow */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:2rem_2rem] pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[350px] h-[350px] bg-fuchsia-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Top Header Bar */}
      <header className="w-full max-w-xl px-4 py-3 flex items-center justify-between border-b border-slate-800/80 bg-slate-900/40 backdrop-blur-md z-20">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${currentThemeColors.head} animate-pulse`} />
          <span className="font-bold tracking-wider text-base sm:text-lg bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-amber-400 bg-clip-text text-transparent">
            NEON SNAKE
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => { setSoundEnabled(!soundEnabled); playClickSound(); }}
            className="p-2 rounded-lg bg-slate-800/60 hover:bg-slate-700/80 text-slate-300 transition-colors"
            title={soundEnabled ? "Mute Sound" : "Enable Sound"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>
          
          {gameState === 'PLAYING' && (
            <button 
              onClick={() => { setGameState('PAUSED'); playClickSound(); }}
              className="px-3 py-1.5 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs font-semibold hover:bg-cyan-500/30 transition-all flex items-center gap-1.5"
            >
              <Pause className="w-3.5 h-3.5" /> Pause
            </button>
          )}

          {gameState !== 'TITLE_MENU' && gameState !== 'LEADERBOARD' && (
            <button 
              onClick={() => { setGameState('TITLE_MENU'); playClickSound(); }}
              className="p-2 rounded-lg bg-slate-800/60 hover:bg-slate-700/80 text-slate-300 transition-colors"
              title="Main Menu"
            >
              <Home className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Main Container Content */}
      <main className="flex-1 w-full max-w-xl flex flex-col items-center justify-center p-4 z-10 overflow-y-auto">
        
        {/* 1. TITLE MENU VIEW */}
        {gameState === 'TITLE_MENU' && (
          <div className="w-full flex flex-col items-center text-center animate-in fade-in duration-300 space-y-6">
            <div className="relative mb-2">
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-cyan-500 via-fuchsia-500 to-amber-500 blur-md opacity-50 animate-pulse" />
              <div className="relative bg-slate-900 border border-slate-700/80 rounded-2xl p-6 sm:p-8 shadow-2xl flex flex-col items-center">
                <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/40 flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(6,182,212,0.3)]">
                  <Sparkles className="w-8 h-8 text-cyan-400 animate-bounce" />
                </div>
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-2">
                  NEON SNAKE
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 max-w-xs">
                  Android-optimized retro arcade snake with touch D-pad, progressive speed, & persistent local leaderboard.
                </p>

                {/* High Score Preview */}
                <div className="mt-6 flex items-center gap-6 bg-slate-950/60 border border-slate-800 rounded-xl px-5 py-3">
                  <div className="text-left">
                    <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">High Score</div>
                    <div className="text-xl font-mono font-bold text-amber-400 tabular-nums">{highScore}</div>
                  </div>
                  <div className="w-px h-8 bg-slate-800" />
                  <div className="text-left">
                    <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Theme</div>
                    <div className={`text-xs font-bold uppercase ${currentThemeColors.text}`}>{theme}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Settings & Customization */}
            <div className="w-full bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span className="font-medium text-slate-400">Difficulty Mode</span>
                <div className="flex gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                  {(['CLASSIC', 'FAST', 'HARDCORE'] as Difficulty[]).map(d => (
                    <button
                      key={d}
                      onClick={() => { setDifficulty(d); playClickSound(); }}
                      className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                        difficulty === d ? 'bg-cyan-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-300">
                <span className="font-medium text-slate-400">Neon Glow Theme</span>
                <div className="flex gap-1.5">
                  {(['CYAN', 'GREEN', 'MAGENTA', 'AMBER'] as NeonTheme[]).map(t => (
                    <button
                      key={t}
                      onClick={() => { setTheme(t); playClickSound(); }}
                      className={`w-6 h-6 rounded-full border-2 transition-all ${
                        theme === t ? 'scale-110 border-white shadow-md' : 'border-transparent opacity-60 hover:opacity-100'
                      } ${t === 'CYAN' ? 'bg-cyan-400' : t === 'GREEN' ? 'bg-emerald-400' : t === 'MAGENTA' ? 'bg-pink-400' : 'bg-amber-400'}`}
                      title={t}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-300">
                <span className="font-medium text-slate-400">Arena Walls</span>
                <button
                  onClick={() => { setHasWalls(!hasWalls); playClickSound(); }}
                  className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all ${
                    hasWalls ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300' : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  {hasWalls ? 'Solid Walls (ON)' : 'Screen Wrap (OFF)'}
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="w-full flex flex-col gap-2.5">
              <button
                onClick={startGame}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 text-slate-950 font-bold text-sm tracking-wide shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-current" /> START GAME
              </button>

              <button
                onClick={() => { setGameState('LEADERBOARD'); playClickSound(); }}
                className="w-full py-3 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-600 text-slate-200 font-semibold text-xs tracking-wide transition-all flex items-center justify-center gap-2"
              >
                <Trophy className="w-4 h-4 text-amber-400" /> VIEW LEADERBOARD
              </button>
            </div>
          </div>
        )}

        {/* 2. PLAYING GAME VIEW */}
        {gameState === 'PLAYING' && (
          <div className="w-full flex flex-col items-center animate-in fade-in duration-200">
            
            {/* HUD Status Bar */}
            <div className="w-full max-w-[360px] flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-1.5 text-xs text-slate-300">
                <span className="text-slate-500 uppercase tracking-wider text-[10px]">Score:</span>
                <span className={`font-mono font-bold text-base ${currentThemeColors.text} tabular-nums`}>{score}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-300">
                <span className="text-slate-500 uppercase tracking-wider text-[10px]">Length:</span>
                <span className="font-mono font-bold text-base text-fuchsia-400 tabular-nums">{snake.length}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-300">
                <span className="text-slate-500 uppercase tracking-wider text-[10px]">Apples:</span>
                <span className="font-mono font-bold text-base text-amber-400 tabular-nums">{applesEaten}</span>
              </div>
            </div>

            {/* Game Grid Playfield */}
            <div 
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              className={`relative w-[340px] h-[340px] sm:w-[380px] sm:h-[380px] bg-slate-900/80 border-2 ${currentThemeColors.border} rounded-2xl shadow-2xl overflow-hidden backdrop-blur-sm touch-none`}
            >
              {/* Internal Grid pattern */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#33415515_1px,transparent_1px),linear-gradient(to_bottom,#33415515_1px,transparent_1px)] bg-[size:19px_19px]" />

              {/* Food */}
              <div 
                className={`absolute rounded-full ${currentThemeColors.food} transition-all duration-75`}
                style={{
                  width: `${100 / GRID_SIZE}%`,
                  height: `${100 / GRID_SIZE}%`,
                  left: `${(food.x * 100) / GRID_SIZE}%`,
                  top: `${(food.y * 100) / GRID_SIZE}%`,
                  transform: 'scale(0.8)'
                }}
              />

              {/* Snake */}
              {snake.map((seg, idx) => (
                <div
                  key={idx}
                  className={`absolute rounded-sm ${idx === 0 ? `${currentThemeColors.head} ${currentThemeColors.glow}` : currentThemeColors.body} transition-all duration-75`}
                  style={{
                    width: `${100 / GRID_SIZE}%`,
                    height: `${100 / GRID_SIZE}%`,
                    left: `${(seg.x * 100) / GRID_SIZE}%`,
                    top: `${(seg.y * 100) / GRID_SIZE}%`,
                    borderRadius: idx === 0 ? '4px' : '2px',
                    transform: idx === 0 ? 'scale(0.92)' : 'scale(0.85)'
                  }}
                />
              ))}
            </div>

            {/* On-Screen Touch D-Pad for Android & Mobile */}
            <div className="mt-4 w-full max-w-[280px] grid grid-cols-3 gap-2 p-3 bg-slate-900/60 border border-slate-800 rounded-2xl">
              <div />
              <button 
                onClick={() => changeDirection('UP')}
                className="h-12 bg-slate-800 hover:bg-slate-700 active:bg-cyan-500/30 border border-slate-700 active:border-cyan-400 rounded-xl flex items-center justify-center text-slate-200 transition-all shadow-md touch-manipulation"
              >
                <ArrowUp className="w-5 h-5 text-cyan-400" />
              </button>
              <div />

              <button 
                onClick={() => changeDirection('LEFT')}
                className="h-12 bg-slate-800 hover:bg-slate-700 active:bg-cyan-500/30 border border-slate-700 active:border-cyan-400 rounded-xl flex items-center justify-center text-slate-200 transition-all shadow-md touch-manipulation"
              >
                <ArrowLeft className="w-5 h-5 text-cyan-400" />
              </button>
              <button 
                onClick={() => changeDirection('DOWN')}
                className="h-12 bg-slate-800 hover:bg-slate-700 active:bg-cyan-500/30 border border-slate-700 active:border-cyan-400 rounded-xl flex items-center justify-center text-slate-200 transition-all shadow-md touch-manipulation"
              >
                <ArrowDown className="w-5 h-5 text-cyan-400" />
              </button>
              <button 
                onClick={() => changeDirection('RIGHT')}
                className="h-12 bg-slate-800 hover:bg-slate-700 active:bg-cyan-500/30 border border-slate-700 active:border-cyan-400 rounded-xl flex items-center justify-center text-slate-200 transition-all shadow-md touch-manipulation"
              >
                <ArrowRight className="w-5 h-5 text-cyan-400" />
              </button>
            </div>
          </div>
        )}

        {/* 3. PAUSE MENU MODAL */}
        {gameState === 'PAUSED' && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <div className="w-full max-w-xs bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl flex flex-col items-center text-center space-y-5">
              <div className="w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-500/40 flex items-center justify-center">
                <Pause className="w-6 h-6 text-cyan-400" />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-white">GAME PAUSED</h2>

              <div className="w-full space-y-2">
                <button
                  onClick={() => { setGameState('PLAYING'); playClickSound(); }}
                  className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs tracking-wide transition-all shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                >
                  RESUME GAME
                </button>
                <button
                  onClick={startGame}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-all"
                >
                  RESTART
                </button>
                <button
                  onClick={() => { setGameState('TITLE_MENU'); playClickSound(); }}
                  className="w-full py-2.5 rounded-xl bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-white font-medium text-xs transition-all"
                >
                  MAIN MENU
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 4. GAME OVER MODAL */}
        {gameState === 'GAME_OVER' && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
            <div className="w-full max-w-sm bg-slate-900 border border-slate-700/80 rounded-2xl p-6 shadow-2xl flex flex-col items-center text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-rose-500/10 border border-rose-500/40 flex items-center justify-center">
                <Zap className="w-7 h-7 text-rose-400 animate-pulse" />
              </div>
              <div>
                <h2 className="text-2xl font-extrabold tracking-tight text-white mb-1">GAME OVER</h2>
                <p className="text-xs text-slate-400">Your snake collided with the boundary or itself.</p>
              </div>

              {/* Stats Summary */}
              <div className="w-full grid grid-cols-3 gap-2 bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-center">
                <div>
                  <div className="text-[10px] text-slate-500 uppercase">Score</div>
                  <div className="font-mono text-lg font-bold text-cyan-400 tabular-nums">{score}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 uppercase">Length</div>
                  <div className="font-mono text-lg font-bold text-fuchsia-400 tabular-nums">{snake.length}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 uppercase">Apples</div>
                  <div className="font-mono text-lg font-bold text-amber-400 tabular-nums">{applesEaten}</div>
                </div>
              </div>

              {/* Save Score Form */}
              {!scoreSaved ? (
                <form onSubmit={saveScoreToLeaderboard} className="w-full space-y-2 text-left">
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Save to Leaderboard
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={12}
                      placeholder="ENTER CALLSIGN"
                      value={playerName}
                      onChange={e => setPlayerName(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400"
                      required
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-sm"
                    >
                      SAVE
                    </button>
                  </div>
                </form>
              ) : (
                <div className="w-full py-2 bg-emerald-500/10 border border-emerald-500/40 rounded-xl text-emerald-400 text-xs font-semibold flex items-center justify-center gap-1.5">
                  <Award className="w-4 h-4" /> Score Saved Successfully!
                </div>
              )}

              {/* Action Buttons */}
              <div className="w-full flex gap-2 pt-2">
                <button
                  onClick={startGame}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 font-bold text-xs tracking-wide shadow-[0_0_15px_rgba(6,182,212,0.4)] hover:opacity-95 transition-all flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-4 h-4" /> PLAY AGAIN
                </button>
                <button
                  onClick={() => { setGameState('TITLE_MENU'); playClickSound(); }}
                  className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-all"
                >
                  MENU
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 5. LEADERBOARD VIEW */}
        {gameState === 'LEADERBOARD' && (
          <div className="w-full flex flex-col items-center animate-in fade-in duration-300 space-y-4">
            <div className="w-full flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                <h2 className="text-lg font-bold text-white tracking-tight">HIGH SCORE LEADERBOARD</h2>
              </div>
              <button
                onClick={() => { setGameState('TITLE_MENU'); playClickSound(); }}
                className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
              >
                Back to Menu
              </button>
            </div>

            <div className="w-full bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="grid grid-cols-12 px-4 py-2.5 bg-slate-950/60 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <span className="col-span-2 text-center">Rank</span>
                <span className="col-span-5">Callsign</span>
                <span className="col-span-3 text-right">Score</span>
                <span className="col-span-2 text-right">Diff</span>
              </div>

              <div className="divide-y divide-slate-800/60 max-h-[320px] overflow-y-auto">
                {leaderboard.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500">
                    No scores recorded yet. Be the first!
                  </div>
                ) : (
                  leaderboard.map((entry, index) => (
                    <div key={entry.id || index} className="grid grid-cols-12 px-4 py-3 items-center text-xs hover:bg-slate-800/30 transition-colors">
                      <span className="col-span-2 text-center font-mono font-bold text-slate-400">
                        {index === 0 ? <span className="text-amber-400">#1</span> : index === 1 ? <span className="text-slate-300">#2</span> : index === 2 ? <span className="text-amber-600">#3</span> : `#${index + 1}`}
                      </span>
                      <span className="col-span-5 font-mono font-semibold text-slate-200 truncate">
                        {entry.name}
                      </span>
                      <span className="col-span-3 text-right font-mono font-bold text-cyan-400 tabular-nums">
                        {entry.score}
                      </span>
                      <span className="col-span-2 text-right text-[10px] font-semibold text-slate-500 uppercase">
                        {entry.difficulty.substring(0, 3)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Footer minimal info */}
      <footer className="w-full max-w-xl py-2 px-4 text-center text-[10px] text-slate-600 border-t border-slate-900 z-20">
        © 2026 Neon Snake Android v0.0.1
      </footer>
    </div>
  );
}
