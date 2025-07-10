import { useState, useEffect, useRef, useCallback } from 'react';
import { HelpCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Bird {
  x: number;
  y: number;
  velocity: number;
}

interface Pipe {
  x: number;
  topHeight: number;
  bottomY: number;
  scored: boolean;
}

export default function FlappyHelp() {
  const [isOpen, setIsOpen] = useState(false);
  const [bird, setBird] = useState<Bird>({ x: 50, y: 150, velocity: 0 });
  const [pipes, setPipes] = useState<Pipe[]>([]);
  const [score, setScore] = useState(0);
  const [gameRunning, setGameRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const gameLoopRef = useRef<number>();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const CANVAS_WIDTH = 280;
  const CANVAS_HEIGHT = 200;
  const BIRD_SIZE = 12;
  const PIPE_WIDTH = 30;
  const PIPE_GAP = 80;
  const GRAVITY = 0.4;
  const JUMP_FORCE = -6;
  const PIPE_SPEED = 2;

  const resetGame = useCallback(() => {
    setBird({ x: 50, y: 150, velocity: 0 });
    setPipes([]);
    setScore(0);
    setGameOver(false);
    setGameRunning(false);
  }, []);

  const jump = useCallback(() => {
    if (!gameRunning && !gameOver) {
      setGameRunning(true);
    }
    if (!gameOver) {
      setBird(prev => ({ ...prev, velocity: JUMP_FORCE }));
    }
  }, [gameRunning, gameOver]);

  const checkCollision = useCallback((bird: Bird, pipes: Pipe[]) => {
    // Check ground and ceiling
    if (bird.y <= 0 || bird.y >= CANVAS_HEIGHT - BIRD_SIZE) {
      return true;
    }

    // Check pipe collision
    for (const pipe of pipes) {
      if (
        bird.x + BIRD_SIZE > pipe.x &&
        bird.x < pipe.x + PIPE_WIDTH &&
        (bird.y < pipe.topHeight || bird.y + BIRD_SIZE > pipe.bottomY)
      ) {
        return true;
      }
    }
    return false;
  }, []);

  const gameLoop = useCallback(() => {
    if (!gameRunning || gameOver) return;

    setBird(prev => {
      const newBird = {
        ...prev,
        y: prev.y + prev.velocity,
        velocity: prev.velocity + GRAVITY
      };

      return newBird;
    });

    setPipes(prev => {
      let newPipes = prev.map(pipe => ({ ...pipe, x: pipe.x - PIPE_SPEED }))
        .filter(pipe => pipe.x > -PIPE_WIDTH);

      // Add new pipe
      if (newPipes.length === 0 || newPipes[newPipes.length - 1].x < CANVAS_WIDTH - 150) {
        const topHeight = Math.random() * (CANVAS_HEIGHT - PIPE_GAP - 40) + 20;
        newPipes.push({
          x: CANVAS_WIDTH,
          topHeight,
          bottomY: topHeight + PIPE_GAP,
          scored: false
        });
      }

      // Check for scoring
      newPipes.forEach(pipe => {
        if (!pipe.scored && pipe.x + PIPE_WIDTH < bird.x) {
          pipe.scored = true;
          setScore(s => s + 1);
        }
      });

      return newPipes;
    });
  }, [gameRunning, gameOver, bird.x]);

  // Game loop effect
  useEffect(() => {
    if (gameRunning && !gameOver) {
      gameLoopRef.current = requestAnimationFrame(() => {
        gameLoop();
        gameLoopRef.current = requestAnimationFrame(gameLoop);
      });
    }

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameLoop, gameRunning, gameOver]);

  // Collision detection
  useEffect(() => {
    if (gameRunning && checkCollision(bird, pipes)) {
      setGameOver(true);
      setGameRunning(false);
    }
  }, [bird, pipes, checkCollision, gameRunning]);

  // Draw satellite phone icon
  const drawSatellitePhone = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    const size = BIRD_SIZE;
    
    // Antenna (top left)
    ctx.fillStyle = '#666666';
    ctx.fillRect(x, y, 2, 4);
    
    // Phone body outline
    ctx.fillStyle = '#333333';
    ctx.fillRect(x + 1, y + 3, size - 2, size - 4);
    
    // Phone body main
    ctx.fillStyle = '#777777';
    ctx.fillRect(x + 2, y + 4, size - 4, size - 6);
    
    // Screen
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(x + 3, y + 5, size - 6, 3);
    
    // Keypad (small dots)
    ctx.fillStyle = '#555555';
    ctx.fillRect(x + 3, y + 9, 1, 1);
    ctx.fillRect(x + 5, y + 9, 1, 1);
    ctx.fillRect(x + 7, y + 9, 1, 1);
  };

  // Canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw pipes
    ctx.fillStyle = '#32CD32';
    pipes.forEach(pipe => {
      // Top pipe
      ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight);
      // Bottom pipe
      ctx.fillRect(pipe.x, pipe.bottomY, PIPE_WIDTH, CANVAS_HEIGHT - pipe.bottomY);
    });

    // Draw satellite phone
    drawSatellitePhone(ctx, bird.x, bird.y);

    // Draw ground
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(0, CANVAS_HEIGHT - 10, CANVAS_WIDTH, 10);
  }, [bird, pipes]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (isOpen && e.code === 'Space') {
        e.preventDefault();
        jump();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyPress);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [isOpen, jump]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 left-4 z-50 bg-primary hover:bg-primary/90 text-white p-2 rounded-full shadow-lg transition-all duration-200 hover:scale-110"
        title="Need help? Play a quick game!"
      >
        <HelpCircle className="h-5 w-5" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 bg-white dark:bg-slate-800 border rounded-lg shadow-2xl p-4 w-72">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <HelpCircle className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Flappy Help</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-muted-foreground">Score: {score}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setIsOpen(false);
              resetGame();
            }}
            className="h-6 w-6 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onClick={jump}
          className="border rounded cursor-pointer bg-sky-200"
        />

        {!gameRunning && !gameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded">
            <div className="text-center text-white">
              <p className="text-sm mb-2">Click or press Space to start!</p>
              <p className="text-xs">Help the satellite phone avoid pipes</p>
            </div>
          </div>
        )}

        {gameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded">
            <div className="text-center text-white">
              <p className="text-sm mb-2">Game Over!</p>
              <p className="text-xs mb-3">Score: {score}</p>
              <Button
                size="sm"
                onClick={resetGame}
                className="text-xs h-7"
              >
                Play Again
              </Button>
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground mt-2 text-center">
        Click the phone or press Space to jump!
      </p>
    </div>
  );
}