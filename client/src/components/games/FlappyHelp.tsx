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
  const [highScore, setHighScore] = useState(0);
  const [gameRunning, setGameRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [backgroundOffset, setBackgroundOffset] = useState(0);
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
  const BACKGROUND_SPEED = 0.5;

  // Load tree image and fetch high score
  useEffect(() => {
    const img = new Image();
    img.src = treeUpwardImg;
    img.onload = () => {
      treeImageRef.current = img;
    };
    
    // Fetch high score when component mounts
    fetchHighScore();
  }, []);

  // Fetch high score from API
  const fetchHighScore = async () => {
    try {
      const response = await fetch('/api/game/flappy-help/highscore');
      const data = await response.json();
      setHighScore(data.highScore || 0);
    } catch (error) {
      console.error('Error fetching high score:', error);
    }
  };

  // Update high score when game ends
  const updateHighScore = async (score: number) => {
    try {
      const response = await fetch('/api/game/flappy-help/highscore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          score, 
          playerName: 'Anonymous' 
        }),
      });
      const data = await response.json();
      setHighScore(data.highScore || 0);
    } catch (error) {
      console.error('Error updating high score:', error);
    }
  };

  const resetGame = useCallback(() => {
    setBird({ x: 50, y: 150, velocity: 0 });
    setTrees([]);
    setScore(0);
    setGameOver(false);
    setGameRunning(false);
    setBackgroundOffset(0);
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
    // Add collision buffer to make hitboxes more forgiving
    const COLLISION_BUFFER = 4; // Reduce effective collision area by 4 pixels on each side
    
    // Effective bird hitbox (smaller than visual size)
    const birdLeft = bird.x + COLLISION_BUFFER;
    const birdRight = bird.x + BIRD_SIZE - COLLISION_BUFFER;
    const birdTop = bird.y + COLLISION_BUFFER;
    const birdBottom = bird.y + BIRD_SIZE - COLLISION_BUFFER;
    
    // Check ground and ceiling with buffer
    if (birdTop <= 0 || birdBottom >= CANVAS_HEIGHT) {
      return true;
    }

    // Check tree collision with improved precision
    for (const tree of trees) {
      // Tree hitbox boundaries
      const treeLeft = tree.x + COLLISION_BUFFER;
      const treeRight = tree.x + TREE_WIDTH - COLLISION_BUFFER;
      const topTreeBottom = tree.topHeight - COLLISION_BUFFER;
      const bottomTreeTop = tree.bottomY + COLLISION_BUFFER;
      
      // Check if bird is horizontally within tree bounds
      if (birdRight > treeLeft && birdLeft < treeRight) {
        // Check if bird hits top tree or bottom tree
        if (birdTop < topTreeBottom || birdBottom > bottomTreeTop) {
          return true;
        }
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

    // Update background offset for mountain scrolling
    setBackgroundOffset(prev => (prev + BACKGROUND_SPEED) % CANVAS_WIDTH);
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
      // Update high score when game ends
      if (score > 0) {
        updateHighScore(score);
      }
    }
  }, [bird, trees, checkCollision, gameRunning, score]);

  // Draw moving mountain background
  const drawMountainBackground = (ctx: CanvasRenderingContext2D) => {
    // Draw multiple layers of mountains for depth
    const mountainLayers = [
      { color: '#2d4a3e', height: 0.6, offset: backgroundOffset * 0.3 },
      { color: '#1a3d2e', height: 0.7, offset: backgroundOffset * 0.5 },
      { color: '#0f261c', height: 0.8, offset: backgroundOffset * 0.7 }
    ];

    mountainLayers.forEach(layer => {
      ctx.fillStyle = layer.color;
      ctx.beginPath();
      
      // Draw repeating mountain pattern
      for (let i = -1; i <= 2; i++) {
        const baseX = i * CANVAS_WIDTH - layer.offset;
        const baseY = CANVAS_HEIGHT * layer.height;
        
        // Mountain peaks
        ctx.moveTo(baseX, CANVAS_HEIGHT);
        ctx.lineTo(baseX + CANVAS_WIDTH * 0.1, baseY);
        ctx.lineTo(baseX + CANVAS_WIDTH * 0.2, baseY + 20);
        ctx.lineTo(baseX + CANVAS_WIDTH * 0.3, baseY - 10);
        ctx.lineTo(baseX + CANVAS_WIDTH * 0.4, baseY + 15);
        ctx.lineTo(baseX + CANVAS_WIDTH * 0.5, baseY - 5);
        ctx.lineTo(baseX + CANVAS_WIDTH * 0.6, baseY + 10);
        ctx.lineTo(baseX + CANVAS_WIDTH * 0.7, baseY - 15);
        ctx.lineTo(baseX + CANVAS_WIDTH * 0.8, baseY + 5);
        ctx.lineTo(baseX + CANVAS_WIDTH * 0.9, baseY - 8);
        ctx.lineTo(baseX + CANVAS_WIDTH, baseY + 12);
        ctx.lineTo(baseX + CANVAS_WIDTH, CANVAS_HEIGHT);
      }
      
      ctx.closePath();
      ctx.fill();
    });
  };

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

  // Draw satellite phone icon (rotated 90 degrees with proper proportions)
  const drawSatellitePhone = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    const width = BIRD_SIZE * 0.7; // Make it narrower
    const height = BIRD_SIZE * 1.2; // Make it taller for proper phone proportions
    
    // Save the current transformation
    ctx.save();
    
    // Rotate 90 degrees clockwise around the center of the phone
    ctx.translate(x + width/2, y + height/2);
    ctx.rotate(Math.PI / 2);
    ctx.translate(-width/2, -height/2);
    
    // Antenna (now extends horizontally from rotated phone)
    ctx.fillStyle = '#666666';
    ctx.fillRect(0, -4, 3, 2);
    
    // Phone body outline
    ctx.fillStyle = '#333333';
    ctx.fillRect(0, 0, width, height);
    
    // Phone body main
    ctx.fillStyle = '#777777';
    ctx.fillRect(1, 1, width - 2, height - 2);
    
    // Screen (proportionally sized)
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(2, 2, width - 4, height * 0.3);
    
    // Keypad (arranged in a more phone-like grid)
    ctx.fillStyle = '#555555';
    const keypadStartY = height * 0.4;
    const keySize = 1;
    const keySpacing = 2;
    
    // Draw 3x4 keypad grid
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        ctx.fillRect(
          2 + col * keySpacing, 
          keypadStartY + row * keySpacing, 
          keySize, 
          keySize
        );
      }
    }
    
    // Restore the transformation
    ctx.restore();
  };

  // Canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas with sky gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(1, '#B0E0E6');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw moving mountain background
    drawMountainBackground(ctx);

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
  }, [bird, trees, backgroundOffset]);

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
        <div className="flex items-center space-x-3">
          <span className="text-xs text-muted-foreground">Score: {score}</span>
          <span className="text-xs text-muted-foreground">High: {highScore}</span>
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

      <div className="relative border rounded overflow-hidden">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onClick={jump}
          className="cursor-pointer bg-sky-200 block"
        />

        {!gameRunning && !gameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-center text-white">
              <p className="text-sm mb-2">Press Space to start!</p>
              <p className="text-xs">Help the satellite phone avoid trees</p>
            </div>
          </div>
        )}

        {gameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
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