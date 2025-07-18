import { useState, useEffect, useRef, useCallback } from 'react';
import { HelpCircle, X, Trophy, Star, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import treeUpwardImg from '@/assets/tree-upward.png';
import tree2Img from '@/assets/tree2.png';
import tree3Img from '@/assets/tree3.png';
import tree4Img from '@/assets/tree4.png';
import stormCloudImg from '@/assets/storm-cloud.png';
import cloudDarkImg from '@/assets/cloud-dark.png';
import cloudLightImg from '@/assets/cloud-light.png';
import cloud2Img from '@/assets/cloud2.png';
import cloud3Img from '@/assets/cloud3.png';
import cloud4Img from '@/assets/cloud4.png';

interface Bird {
  x: number;
  y: number;
  velocity: number;
}

interface Obstacle {
  x: number;
  topHeight: number;
  bottomY: number;
  scored: boolean;
  cloudType?: 'storm' | 'dark' | 'light' | 'cloud2' | 'cloud3' | 'cloud4';
  treeType?: 'tree1' | 'tree2' | 'tree3' | 'tree4';
  cloudScale?: number;
  treeScale?: number;
}

interface PowerUp {
  x: number;
  y: number;
  type: 'invincibility';
  collected: boolean;
}

export default function FlappyHelp() {
  const [isOpen, setIsOpen] = useState(false);
  const [bird, setBird] = useState<Bird>({ x: 50, y: 150, velocity: 0 });
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [powerUps, setPowerUps] = useState<PowerUp[]>([]);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameRunning, setGameRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [backgroundOffset, setBackgroundOffset] = useState(0);
  const [invincibilityTime, setInvincibilityTime] = useState(0);
  const [playerName, setPlayerName] = useState('');
  const [showNameInput, setShowNameInput] = useState(false);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [flashRed, setFlashRed] = useState(false);
  const [gameOverTime, setGameOverTime] = useState(0);
  const gameLoopRef = useRef<number>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const treeImagesRef = useRef<{ [key: string]: HTMLImageElement }>({});
  const cloudImagesRef = useRef<{ [key: string]: HTMLImageElement }>({});
  const lastTimeRef = useRef<number>(0);

  const CANVAS_WIDTH = 280;
  const CANVAS_HEIGHT = 200;
  const BIRD_SIZE = 18;
  const TREE_WIDTH = 60;
  const TREE_GAP = 90;
  const GRAVITY = 0.4;
  const JUMP_FORCE = -6;
  const TREE_SPEED = 2;
  const BACKGROUND_SPEED = 0.5;
  const POWERUP_SIZE = 20;
  const POWERUP_SPEED = 1.5;
  const INVINCIBILITY_DURATION = 3000; // 3 seconds

  // Load tree and cloud images, fetch high score
  useEffect(() => {
    // Load tree images
    const treeImages = {
      tree1: treeUpwardImg,
      tree2: tree2Img,
      tree3: tree3Img,
      tree4: tree4Img
    };
    
    Object.entries(treeImages).forEach(([key, src]) => {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        treeImagesRef.current[key] = img;

      };
      img.onerror = (e) => {
        console.error(`Failed to load tree image: ${key}`, e);
      };
    });
    
    // Load cloud images
    const cloudImages = {
      storm: stormCloudImg,
      dark: cloudDarkImg,
      light: cloudLightImg,
      cloud2: cloud2Img,
      cloud3: cloud3Img,
      cloud4: cloud4Img
    };
    
    Object.entries(cloudImages).forEach(([key, src]) => {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        cloudImagesRef.current[key] = img;
      };
    });
    
    // Fetch high score and leaderboard when component mounts
    fetchHighScore();
    fetchLeaderboard();
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

  // Fetch leaderboard from API
  const fetchLeaderboard = async () => {
    try {
      const response = await fetch('/api/game/flappy-help/leaderboard?limit=5');
      const data = await response.json();
      setLeaderboard(data);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
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

  // Add to leaderboard
  const addToLeaderboard = async (score: number, playerName: string) => {
    try {
      const response = await fetch('/api/game/flappy-help/leaderboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          score, 
          playerName 
        }),
      });
      
      if (response.ok) {
        // Refresh leaderboard after adding entry
        fetchLeaderboard();
      }
    } catch (error) {
      console.error('Error adding to leaderboard:', error);
    }
  };

  const resetGame = useCallback(() => {
    setBird({ x: 50, y: 150, velocity: 0 });
    setObstacles([]);
    setPowerUps([]);
    setScore(0);
    setGameOver(false);
    setGameRunning(false);
    setBackgroundOffset(0);
    setInvincibilityTime(0);
    setShowNameInput(false);
    setShowLeaderboard(false);
    setFlashRed(false);
    lastTimeRef.current = 0; // Reset timing
  }, []);

  const restartGame = () => {
    setBird({ x: 50, y: 150, velocity: 0 });
    setObstacles([]);
    setPowerUps([]);
    setScore(0);
    setGameOver(false);
    setGameRunning(true);
    setInvincibilityTime(0);
    setBackgroundOffset(0);
    setShowNameInput(false);
    setShowLeaderboard(false);
    setFlashRed(false);
    setGameOverTime(0);
    lastTimeRef.current = 0; // Reset timing
  };

  const handleNameSubmit = async () => {
    if (playerName.trim()) {
      await addToLeaderboard(score, playerName.trim());
      setShowNameInput(false);
      setShowLeaderboard(true);
    }
  };

  const jump = useCallback(() => {
    if (!gameOver) {
      if (!gameRunning) {
        setGameRunning(true);
      }
      setBird(prev => ({ ...prev, velocity: JUMP_FORCE }));
    }
  }, [gameRunning, gameOver, JUMP_FORCE]);

  const startGame = useCallback(() => {
    if (!gameRunning && !gameOver) {
      setGameRunning(true);
      setBird(prev => ({ ...prev, velocity: JUMP_FORCE }));
    }
  }, [gameRunning, gameOver, JUMP_FORCE]);

  const checkCollision = useCallback((bird: Bird, obstacles: Obstacle[]) => {
    // If invincible, no collision
    if (invincibilityTime > 0) {
      return false;
    }
    
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

    // Check obstacle collision with improved precision
    for (const obstacle of obstacles) {
      // Obstacle hitbox boundaries
      const obstacleLeft = obstacle.x + COLLISION_BUFFER;
      const obstacleRight = obstacle.x + TREE_WIDTH - COLLISION_BUFFER;
      const topObstacleBottom = obstacle.topHeight - COLLISION_BUFFER;
      const bottomObstacleTop = obstacle.bottomY + COLLISION_BUFFER;
      
      // Check if bird is horizontally within obstacle bounds
      if (birdRight > obstacleLeft && birdLeft < obstacleRight) {
        // Check if bird hits top obstacle or bottom obstacle
        if (birdTop < topObstacleBottom || birdBottom > bottomObstacleTop) {
          return true;
        }
      }
    }
    return false;
  }, [invincibilityTime]);

  const gameLoop = useCallback((currentTime: number) => {
    if (!gameRunning || gameOver) return;

    // Calculate delta time for consistent frame-rate independent animation
    const deltaTime = lastTimeRef.current ? currentTime - lastTimeRef.current : 16.67; // Default to 60 FPS
    lastTimeRef.current = currentTime;
    
    // Normalize delta time to 60 FPS (16.67ms per frame)
    const timeMultiplier = deltaTime / 16.67;

    setBird(prev => {
      const newBird = {
        ...prev,
        y: prev.y + prev.velocity * timeMultiplier,
        velocity: prev.velocity + GRAVITY * timeMultiplier
      };

      return newBird;
    });

    setObstacles(prev => {
      let newObstacles = prev.map(obstacle => ({ ...obstacle, x: obstacle.x - TREE_SPEED * timeMultiplier }))
        .filter(obstacle => obstacle.x > -TREE_WIDTH);

      // Add new obstacle
      if (newObstacles.length === 0 || newObstacles[newObstacles.length - 1].x < CANVAS_WIDTH - 150) {
        // Limit cloud stretching to 8% maximum
        const baseHeight = 40; // Base minimum height
        const maxHeight = (CANVAS_HEIGHT - TREE_GAP - 40) * 0.6; // Max 60% of available space
        const heightVariation = maxHeight * 0.08; // 8% variation
        const centerHeight = baseHeight + (maxHeight - baseHeight) * 0.5; // Center point
        const topHeight = centerHeight + (Math.random() - 0.5) * 2 * heightVariation;
        const cloudTypes: ('storm' | 'dark' | 'light' | 'cloud2' | 'cloud3' | 'cloud4')[] = ['storm', 'dark', 'light', 'cloud2', 'cloud3', 'cloud4'];
        const cloudType = cloudTypes[Math.floor(Math.random() * cloudTypes.length)];
        // Increase chances of tree4 appearing - give it 40% chance, others 20% each
        const treeTypes: ('tree1' | 'tree2' | 'tree3' | 'tree4')[] = ['tree1', 'tree2', 'tree3', 'tree4', 'tree4'];
        const treeType = treeTypes[Math.floor(Math.random() * treeTypes.length)];
        

        
        // Add size variability - clouds 8% bigger or smaller, trees up to 10% taller (limited for tree4)
        const cloudSizeVariation = Math.random() * 0.16 - 0.08; // -8% to +8%
        const treeSizeVariation = Math.random() * 0.1; // 0% to +10% taller
        const cloudScale = 1 + cloudSizeVariation;
        const treeScale = 1 + treeSizeVariation;
        
        newObstacles.push({
          x: CANVAS_WIDTH,
          topHeight,
          bottomY: topHeight + TREE_GAP,
          scored: false,
          cloudType,
          treeType,
          cloudScale,
          treeScale
        });
      }

      // Check for scoring
      newObstacles.forEach(obstacle => {
        if (!obstacle.scored && obstacle.x + TREE_WIDTH < bird.x) {
          obstacle.scored = true;
          setScore(s => s + 1);
        }
      });

      return newObstacles;
    });

    // Update power-ups
    setPowerUps(prev => {
      let newPowerUps = prev.map(powerUp => ({ ...powerUp, x: powerUp.x - POWERUP_SPEED * timeMultiplier }))
        .filter(powerUp => powerUp.x > -POWERUP_SIZE && !powerUp.collected);

      // Add new power-up occasionally
      if (Math.random() < 0.003 && newPowerUps.length < 2) {
        const types: ('invincibility')[] = ['invincibility'];
        const type = types[Math.floor(Math.random() * types.length)];
        newPowerUps.push({
          x: CANVAS_WIDTH,
          y: Math.random() * (CANVAS_HEIGHT - POWERUP_SIZE - 40) + 20,
          type,
          collected: false
        });
      }

      // Check for power-up collection
      newPowerUps.forEach(powerUp => {
        if (!powerUp.collected && 
            bird.x + BIRD_SIZE > powerUp.x && 
            bird.x < powerUp.x + POWERUP_SIZE &&
            bird.y + BIRD_SIZE > powerUp.y && 
            bird.y < powerUp.y + POWERUP_SIZE) {
          powerUp.collected = true;
          
          if (powerUp.type === 'invincibility') {
            // Stack power-ups by adding to existing time
            setInvincibilityTime(prev => prev + INVINCIBILITY_DURATION);
          }
        }
      });

      return newPowerUps;
    });

    // Update background offset for mountain scrolling
    setBackgroundOffset(prev => (prev + BACKGROUND_SPEED * timeMultiplier) % CANVAS_WIDTH);
    
    // Update power-up timers using delta time
    setInvincibilityTime(prev => Math.max(0, prev - deltaTime));
  }, [gameRunning, gameOver, bird.x, bird.y]);

  // Game loop effect
  useEffect(() => {
    if (gameRunning && !gameOver) {
      const loop = (currentTime: number) => {
        gameLoop(currentTime);
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
    if (gameRunning && checkCollision(bird, obstacles) && invincibilityTime <= 0) {
      setGameOver(true);
      setGameRunning(false);
      setGameOverTime(Date.now()); // Set game over time for spacebar delay
      
      // Flash red screen on collision
      setFlashRed(true);
      setTimeout(() => setFlashRed(false), 500);
      
      // Update high score when game ends
      if (score > 0) {
        updateHighScore(score);
        // Show name input for any score > 0 
        setTimeout(() => setShowNameInput(true), 600);
      }
    }
  }, [bird, obstacles, checkCollision, gameRunning, score]);

  // Draw moving mountain background
  const drawMountainBackground = (ctx: CanvasRenderingContext2D) => {
    // Draw multiple layers of mountains for depth
    const mountainLayers = [
      { color: '#2d4a3e', height: 0.6, speed: 0.3 },
      { color: '#1a3d2e', height: 0.7, speed: 0.5 },
      { color: '#0f261c', height: 0.8, speed: 0.7 }
    ];

    mountainLayers.forEach(layer => {
      ctx.fillStyle = layer.color;
      
      // Calculate seamless offset for this layer
      const layerOffset = (backgroundOffset * layer.speed) % CANVAS_WIDTH;
      
      // Draw two identical mountain patterns side by side for seamless scrolling
      for (let repeat = 0; repeat < 2; repeat++) {
        const baseX = repeat * CANVAS_WIDTH - layerOffset;
        const baseY = CANVAS_HEIGHT * layer.height;
        
        ctx.beginPath();
        ctx.moveTo(baseX, CANVAS_HEIGHT);
        
        // Create consistent mountain silhouette that tiles perfectly
        const peaks = [
          { x: 0, y: 0 },
          { x: 0.1, y: -30 },
          { x: 0.2, y: -15 },
          { x: 0.3, y: -35 },
          { x: 0.4, y: -10 },
          { x: 0.5, y: -40 },
          { x: 0.6, y: -20 },
          { x: 0.7, y: -25 },
          { x: 0.8, y: -45 },
          { x: 0.9, y: -15 },
          { x: 1.0, y: 0 }
        ];
        
        peaks.forEach(peak => {
          ctx.lineTo(baseX + CANVAS_WIDTH * peak.x, baseY + peak.y);
        });
        
        ctx.lineTo(baseX + CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.lineTo(baseX, CANVAS_HEIGHT);
        ctx.closePath();
        ctx.fill();
      }
    });
  };

  // Draw cloud using the provided images
  const drawCloud = (ctx: CanvasRenderingContext2D, x: number, y: number, height: number, isTop: boolean, cloudType: 'storm' | 'dark' | 'light' | 'cloud2' | 'cloud3' | 'cloud4', scale: number = 1) => {
    const img = cloudImagesRef.current[cloudType];
    if (!img) return;
    
    const width = TREE_WIDTH * scale;
    const scaledHeight = height * scale;
    
    ctx.save();
    
    if (isTop) {
      // Top cloud (hanging from top)
      ctx.drawImage(img, x, y, width, scaledHeight);
    } else {
      // Bottom cloud (normal orientation)
      ctx.drawImage(img, x, y, width, scaledHeight);
    }
    
    ctx.restore();
  };

  // Draw tree using the provided image
  const drawTree = (ctx: CanvasRenderingContext2D, x: number, y: number, height: number, isTop: boolean, treeType: 'tree1' | 'tree2' | 'tree3' | 'tree4' = 'tree1', scale: number = 1) => {
    const img = treeImagesRef.current[treeType];
    if (!img) {
      console.warn(`Tree image not loaded for type: ${treeType}`);
      return;
    }
    
    // Make tree4 appear taller than other trees (30% reduction from 2.0 to 1.4)
    const heightMultiplier = treeType === 'tree4' ? 1.4 : 1;
    const width = TREE_WIDTH * scale;
    const scaledHeight = height * scale * heightMultiplier;
    

    
    ctx.save();
    
    if (isTop) {
      // Top tree (facing down) - flip vertically
      ctx.translate(x + width / 2, y + scaledHeight / 2);
      ctx.scale(1, -1);
      ctx.drawImage(img, -width / 2, -scaledHeight / 2, width, scaledHeight);
    } else {
      // Bottom tree (facing up) - adjust y position for taller trees to start at ground level
      const adjustedY = treeType === 'tree4' ? y - (scaledHeight - height * scale) : y;
      ctx.drawImage(img, x, adjustedY, width, scaledHeight);
    }
    
    ctx.restore();
  };

  // Draw satellite phone icon (rotated 90 degrees with proper proportions)
  const drawSatellitePhone = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    const width = BIRD_SIZE * 0.7; // Make it narrower
    const height = BIRD_SIZE * 1.2; // Make it taller for proper phone proportions
    
    // Save the current transformation
    ctx.save();
    
    // Add glow effect if invincible
    if (invincibilityTime > 0) {
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#FFD700';
    }
    
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
    ctx.fillStyle = invincibilityTime > 0 ? '#FFD700' : '#777777';
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

  // Draw power-up
  const drawPowerUp = (ctx: CanvasRenderingContext2D, powerUp: PowerUp) => {
    if (powerUp.collected) return;
    
    ctx.save();
    
    // Add pulsing effect
    const pulse = Math.sin(Date.now() * 0.008) * 0.1 + 1;
    const size = POWERUP_SIZE * pulse;
    const offset = (POWERUP_SIZE - size) / 2;
    
    if (powerUp.type === 'invincibility') {
      // Draw shield/satellite signal icon
      ctx.fillStyle = '#FFD700';
      ctx.shadowBlur = 5;
      ctx.shadowColor = '#FFD700';
      
      // Draw satellite signal bars
      ctx.fillRect(powerUp.x + offset + 2, powerUp.y + offset + 12, 3, 6);
      ctx.fillRect(powerUp.x + offset + 6, powerUp.y + offset + 8, 3, 10);
      ctx.fillRect(powerUp.x + offset + 10, powerUp.y + offset + 4, 3, 14);
      ctx.fillRect(powerUp.x + offset + 14, powerUp.y + offset + 2, 3, 16);
      
      // Draw satellite dish
      ctx.beginPath();
      ctx.arc(powerUp.x + offset + size/2, powerUp.y + offset + size/2, size/4, 0, Math.PI * 2);
      ctx.fill();
    }
    
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

    // Draw obstacles
    obstacles.forEach(obstacle => {
      drawCloud(ctx, obstacle.x, 0, obstacle.topHeight, true, obstacle.cloudType || 'light', obstacle.cloudScale || 1); // Top cloud
      drawTree(ctx, obstacle.x, obstacle.bottomY, CANVAS_HEIGHT - obstacle.bottomY, false, obstacle.treeType || 'tree1', obstacle.treeScale || 1); // Bottom tree
    });

    // Draw power-ups
    powerUps.forEach(powerUp => {
      drawPowerUp(ctx, powerUp);
    });

    // Draw satellite phone
    drawSatellitePhone(ctx, bird.x, bird.y);

    // Draw ground
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(0, CANVAS_HEIGHT - 10, CANVAS_WIDTH, 10);
  }, [bird, obstacles, powerUps, backgroundOffset, invincibilityTime]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (isOpen && e.code === 'Space') {
        e.preventDefault();
        if (!gameRunning && !gameOver) {
          // Start the game if not running
          startGame();
        } else if (gameRunning && !gameOver) {
          // Jump if game is running
          jump();
        } else if (gameOver && Date.now() - gameOverTime > 2000) {
          // Restart game if game is over and 2 seconds have passed
          restartGame();
        }
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyPress);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [isOpen, jump, startGame, restartGame, gameRunning, gameOver]);

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
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowLeaderboard(true)}
            className="text-xs h-6 px-2 mr-4"
          >
            <Trophy className="h-3 w-3 mr-1" />
            Top 5
          </Button>
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
          className={`cursor-pointer bg-sky-200 block ${
            flashRed ? 'animate-pulse' : ''
          }`}
          style={flashRed ? { backgroundColor: 'rgba(255, 0, 0, 0.3)' } : {}}
        />

        {!gameRunning && !gameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-center text-white">
              <p className="text-sm mb-2">Press Space to start!</p>
              <p className="text-xs mb-1">Help the satellite phone avoid clouds and trees</p>
              <p className="text-xs opacity-75">
                Collect power-ups: 🛡️ Invincibility (stacks!)
              </p>
            </div>
          </div>
        )}

        {/* Power-up status indicators */}
        <div className="absolute top-2 right-2 space-y-1">
          {invincibilityTime > 0 && (
            <div className="bg-yellow-400 text-black px-2 py-1 rounded text-xs font-bold">
              ⚡ {Math.ceil(invincibilityTime / 1000)}s
            </div>
          )}

        </div>

        {/* Name Input Modal */}
        {showNameInput && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="bg-white p-2 rounded shadow-lg w-52">
              <div className="text-center mb-2">
                <Trophy className="mx-auto h-4 w-4 text-yellow-500 mb-1" />
                <h3 className="text-xs font-bold">Great Score: {score}</h3>
              </div>
              <div className="mb-2">
                <Input
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Enter your name"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
                  className="text-xs h-6"
                />
              </div>
              <div className="flex space-x-1">
                <Button onClick={handleNameSubmit} className="flex-1 text-xs h-6">
                  Submit
                </Button>
                <Button variant="outline" onClick={() => setShowNameInput(false)} className="text-xs h-6">
                  Skip
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard Modal */}
        {showLeaderboard && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="bg-white p-2 rounded shadow-lg w-52">
              <div className="text-center mb-2">
                <Star className="mx-auto h-4 w-4 text-yellow-500 mb-1" />
                <h3 className="text-xs font-bold">Top 5 Scores</h3>
              </div>
              <div className="space-y-1 mb-2">
                {leaderboard.length === 0 ? (
                  <p className="text-xs text-gray-500 text-center">No scores yet!</p>
                ) : (
                  leaderboard.map((entry, index) => (
                    <div key={entry.id} className="flex items-center justify-between text-xs">
                      <span className="flex items-center">
                        <span className="w-4 text-gray-500">#{index + 1}</span>
                        <span className="font-medium">{entry.playerName}</span>
                      </span>
                      <span className="font-bold">{entry.score}</span>
                    </div>
                  ))
                )}
              </div>
              <div className="flex space-x-1">
                <Button onClick={restartGame} className="flex-1 text-xs h-6">
                  Play Again
                </Button>
                <Button variant="outline" onClick={() => setShowLeaderboard(false)} className="text-xs h-6">
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}

        {gameOver && !showNameInput && !showLeaderboard && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-center text-white">
              <p className="text-sm mb-2">Game Over!</p>
              <p className="text-xs mb-2">Score: {score}</p>
              <p className="text-xs mb-3 opacity-75">Press Space to play again</p>
              <Button
                size="sm"
                onClick={restartGame}
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