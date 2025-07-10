import { useState, useEffect, useRef, useCallback } from 'react';
import { HelpCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import treeUpwardImg from '@/assets/tree-upward.png';

interface Bird {
  x: number;
  y: number;
  velocity: number;
}

interface Tree {
  x: number;
  topHeight: number;
  bottomY: number;
  scored: boolean;
}

export default function FlappyHelp() {
  const [isOpen, setIsOpen] = useState(false);
  const [bird, setBird] = useState<Bird>({ x: 50, y: 150, velocity: 0 });
  const [trees, setTrees] = useState<Tree[]>([]);
  const [score, setScore] = useState(0);
  const [gameRunning, setGameRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const gameLoopRef = useRef<number>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const treeImageRef = useRef<HTMLImageElement>();

  const CANVAS_WIDTH = 280;
  const CANVAS_HEIGHT = 200;
  const BIRD_SIZE = 18;
  const TREE_WIDTH = 60;
  const TREE_GAP = 90;
  const GRAVITY = 0.4;
  const JUMP_FORCE = -6;
  const TREE_SPEED = 2;

  // Load tree image
  useEffect(() => {
    const img = new Image();
    img.src = treeUpwardImg;
    img.onload = () => {
      treeImageRef.current = img;
    };
  }, []);

  const resetGame = useCallback(() => {
    setBird({ x: 50, y: 150, velocity: 0 });
    setTrees([]);
    setScore(0);
    setGameOver(false);
    setGameRunning(false);
  }, []);

  const jump = useCallback(() => {
    if (!gameOver) {
      if (!gameRunning) {
        setGameRunning(true);
      }
      setBird(prev => ({ ...prev, velocity: JUMP_FORCE }));
    }
  }, [gameRunning, gameOver, JUMP_FORCE]);

  const checkCollision = useCallback((bird: Bird, trees: Tree[]) => {
    // Check ground and ceiling
    if (bird.y <= 0 || bird.y >= CANVAS_HEIGHT - BIRD_SIZE) {
      return true;
    }

    // Check tree collision
    for (const tree of trees) {
      if (
        bird.x + BIRD_SIZE > tree.x &&
        bird.x < tree.x + TREE_WIDTH &&
        (bird.y < tree.topHeight || bird.y + BIRD_SIZE > tree.bottomY)
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

    setTrees(prev => {
      let newTrees = prev.map(tree => ({ ...tree, x: tree.x - TREE_SPEED }))
        .filter(tree => tree.x > -TREE_WIDTH);

      // Add new tree
      if (newTrees.length === 0 || newTrees[newTrees.length - 1].x < CANVAS_WIDTH - 150) {
        const topHeight = Math.random() * (CANVAS_HEIGHT - TREE_GAP - 40) + 20;
        newTrees.push({
          x: CANVAS_WIDTH,
          topHeight,
          bottomY: topHeight + TREE_GAP,
          scored: false
        });
      }

      // Check for scoring
      newTrees.forEach(tree => {
        if (!tree.scored && tree.x + TREE_WIDTH < bird.x) {
          tree.scored = true;
          setScore(s => s + 1);
        }
      });

      return newTrees;
    });
  }, [gameRunning, gameOver, bird.x]);

  // Game loop effect
  useEffect(() => {
    if (gameRunning && !gameOver) {
      const loop = () => {
        gameLoop();
        gameLoopRef.current = requestAnimationFrame(loop);
      };
      gameLoopRef.current = requestAnimationFrame(loop);
    }

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameLoop, gameRunning, gameOver]);

  // Collision detection
  useEffect(() => {
    if (gameRunning && checkCollision(bird, trees)) {
      setGameOver(true);
      setGameRunning(false);
    }
  }, [bird, trees, checkCollision, gameRunning]);

  // Draw tree using the provided image
  const drawTree = (ctx: CanvasRenderingContext2D, x: number, y: number, height: number, isTop: boolean) => {
    if (!treeImageRef.current) return;
    
    const img = treeImageRef.current;
    const width = TREE_WIDTH;
    
    ctx.save();
    
    if (isTop) {
      // Top tree (facing down) - flip vertically
      ctx.translate(x + width / 2, y + height / 2);
      ctx.scale(1, -1);
      ctx.drawImage(img, -width / 2, -height / 2, width, height);
    } else {
      // Bottom tree (facing up) - normal orientation
      ctx.drawImage(img, x, y, width, height);
    }
    
    ctx.restore();
  };

  // Draw satellite phone icon (rotated 90 degrees and bigger)
  const drawSatellitePhone = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    const size = BIRD_SIZE;
    
    // Save the current transformation
    ctx.save();
    
    // Rotate 90 degrees clockwise around the center of the phone
    ctx.translate(x + size/2, y + size/2);
    ctx.rotate(Math.PI / 2);
    ctx.translate(-size/2, -size/2);
    
    // Antenna (now extends horizontally from rotated phone)
    ctx.fillStyle = '#666666';
    ctx.fillRect(0, -3, 4, 2);
    
    // Phone body outline
    ctx.fillStyle = '#333333';
    ctx.fillRect(0, 0, size - 1, size - 2);
    
    // Phone body main
    ctx.fillStyle = '#777777';
    ctx.fillRect(1, 1, size - 3, size - 4);
    
    // Screen
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(2, 2, size - 6, 4);
    
    // Keypad (small dots)
    ctx.fillStyle = '#555555';
    ctx.fillRect(2, 7, 1, 1);
    ctx.fillRect(4, 7, 1, 1);
    ctx.fillRect(6, 7, 1, 1);
    ctx.fillRect(8, 7, 1, 1);
    ctx.fillRect(2, 9, 1, 1);
    ctx.fillRect(4, 9, 1, 1);
    ctx.fillRect(6, 9, 1, 1);
    ctx.fillRect(8, 9, 1, 1);
    
    // Restore the transformation
    ctx.restore();
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

    // Draw trees
    trees.forEach(tree => {
      drawTree(ctx, tree.x, 0, tree.topHeight, true); // Top tree
      drawTree(ctx, tree.x, tree.bottomY, CANVAS_HEIGHT - tree.bottomY, false); // Bottom tree
    });

    // Draw satellite phone
    drawSatellitePhone(ctx, bird.x, bird.y);

    // Draw ground
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(0, CANVAS_HEIGHT - 10, CANVAS_WIDTH, 10);
  }, [bird, trees]);

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
    <div className="fixed bottom-4 left-4 z-50 bg-white dark:bg-slate-800 border rounded-lg shadow-2xl p-4 w-[300px]">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <span className="text-xs text-muted-foreground">Score: {score}</span>
        </div>
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
              <p className="text-sm mb-2">Press Space to start!</p>
              <p className="text-xs">Help the satellite phone avoid trees</p>
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
        Press Space to jump!
      </p>
    </div>
  );
}