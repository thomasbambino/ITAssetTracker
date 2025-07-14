import { useState, useEffect, useRef, useCallback } from 'react';
import { HelpCircle, X, Trophy, Star, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import treeUpwardImg from '@/assets/tree-upward.png';
import stormCloudImg from '@/assets/storm-cloud.png';
import cloudDarkImg from '@/assets/cloud-dark.png';
import cloudLightImg from '@/assets/cloud-light.png';

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
  cloudType?: 'storm' | 'dark' | 'light';
}

interface PowerUp {
  x: number;
  y: number;
  type: 'invincibility' | 'slowMotion';
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
  const [slowMotionTime, setSlowMotionTime] = useState(0);
  const [playerName, setPlayerName] = useState('');
  const [showNameInput, setShowNameInput] = useState(false);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [flashRed, setFlashRed] = useState(false);
  const gameLoopRef = useRef<number>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const treeImageRef = useRef<HTMLImageElement>();
  const cloudImagesRef = useRef<{ [key: string]: HTMLImageElement }>({});

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
  const SLOW_MOTION_DURATION = 4000; // 4 seconds

  // Load tree and cloud images, fetch high score
  useEffect(() => {
    const img = new Image();
    img.src = treeUpwardImg;
    img.onload = () => {
      treeImageRef.current = img;
    };
    
    // Load cloud images
    const cloudImages = {
      storm: stormCloudImg,
      dark: cloudDarkImg,
      light: cloudLightImg
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
    setSlowMotionTime(0);
    setShowNameInput(false);
    setShowLeaderboard(false);
    setFlashRed(false);
  }, []);

  const restartGame = () => {
    setBird({ x: 50, y: 150, velocity: 0 });
    setObstacles([]);
    setPowerUps([]);
    setScore(0);
    setGameOver(false);
    setGameRunning(true);
    setInvincibilityTime(0);
    setSlowMotionTime(0);
    setBackgroundOffset(0);
    setShowNameInput(false);
    setShowLeaderboard(false);
    setFlashRed(false);
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

  const gameLoop = useCallback(() => {
    if (!gameRunning || gameOver) return;

    // Apply slow motion effect
    const timeMultiplier = slowMotionTime > 0 ? 0.5 : 1;

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
        const topHeight = Math.random() * (CANVAS_HEIGHT - TREE_GAP - 40) + 20;
        const cloudTypes: ('storm' | 'dark' | 'light')[] = ['storm', 'dark', 'light'];
        const cloudType = cloudTypes[Math.floor(Math.random() * cloudTypes.length)];
        newObstacles.push({
          x: CANVAS_WIDTH,
          topHeight,
          bottomY: topHeight + TREE_GAP,
          scored: false,
          cloudType
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
        const types: ('invincibility' | 'slowMotion')[] = ['invincibility', 'slowMotion'];
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
            setInvincibilityTime(INVINCIBILITY_DURATION);
          } else if (powerUp.type === 'slowMotion') {
            setSlowMotionTime(SLOW_MOTION_DURATION);
          }
        }
      });

      return newPowerUps;
    });

    // Update background offset for mountain scrolling
    setBackgroundOffset(prev => (prev + BACKGROUND_SPEED * timeMultiplier) % CANVAS_WIDTH);
    
    // Update power-up timers
    setInvincibilityTime(prev => Math.max(0, prev - 16));
    setSlowMotionTime(prev => Math.max(0, prev - 16));
  }, [gameRunning, gameOver, bird.x, bird.y, slowMotionTime]);

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
    if (gameRunning && checkCollision(bird, obstacles) && invincibilityTime <= 0) {
      setGameOver(true);
      setGameRunning(false);
      
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
  const drawCloud = (ctx: CanvasRenderingContext2D, x: number, y: number, height: number, isTop: boolean, cloudType: 'storm' | 'dark' | 'light') => {
    const img = cloudImagesRef.current[cloudType];
    if (!img) return;
    
    const width = TREE_WIDTH;
    
    ctx.save();
    
    if (isTop) {
      // Top cloud (hanging from top)
      ctx.drawImage(img, x, y, width, height);
    } else {
      // Bottom cloud (normal orientation)
      ctx.drawImage(img, x, y, width, height);
    }
    
    ctx.restore();
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
    } else if (powerUp.type === 'slowMotion') {
      // Draw clock/time icon
      ctx.fillStyle = '#00BFFF';
      ctx.shadowBlur = 5;
      ctx.shadowColor = '#00BFFF';
      
      // Draw circle
      ctx.beginPath();
      ctx.arc(powerUp.x + offset + size/2, powerUp.y + offset + size/2, size/3, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw clock hands
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(powerUp.x + offset + size/2, powerUp.y + offset + size/2);
      ctx.lineTo(powerUp.x + offset + size/2, powerUp.y + offset + size/2 - size/4);
      ctx.moveTo(powerUp.x + offset + size/2, powerUp.y + offset + size/2);
      ctx.lineTo(powerUp.x + offset + size/2 + size/6, powerUp.y + offset + size/2);
      ctx.stroke();
    }
    
    ctx.restore();
  };

  // Canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas with sky gradient (tinted if slow motion is active)
    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    if (slowMotionTime > 0) {
      gradient.addColorStop(0, '#5F9EFF');
      gradient.addColorStop(1, '#8FC7FF');
    } else {
      gradient.addColorStop(0, '#87CEEB');
      gradient.addColorStop(1, '#B0E0E6');
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw moving mountain background
    drawMountainBackground(ctx);

    // Draw obstacles
    obstacles.forEach(obstacle => {
      drawCloud(ctx, obstacle.x, 0, obstacle.topHeight, true, obstacle.cloudType || 'light'); // Top cloud
      drawTree(ctx, obstacle.x, obstacle.bottomY, CANVAS_HEIGHT - obstacle.bottomY, false); // Bottom tree
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
  }, [bird, obstacles, powerUps, backgroundOffset, invincibilityTime, slowMotionTime]);

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
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowLeaderboard(true)}
            className="text-xs h-6 px-2"
          >
            <Trophy className="h-3 w-3 mr-1" />
            Top 5
          </Button>
        </div>
        
        {/* Power-up indicators */}
        <div className="flex items-center space-x-2">
          {invincibilityTime > 0 && (
            <div className="flex items-center space-x-1 bg-yellow-500 text-white px-2 py-1 rounded text-xs">
              <span>🛡️</span>
              <span>{Math.ceil(invincibilityTime / 1000)}s</span>
            </div>
          )}
          {slowMotionTime > 0 && (
            <div className="flex items-center space-x-1 bg-blue-500 text-white px-2 py-1 rounded text-xs">
              <span>⏰</span>
              <span>{Math.ceil(slowMotionTime / 1000)}s</span>
            </div>
          )}
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
                Collect power-ups: 🛡️ Invincibility • ⏰ Slow Motion
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
          {slowMotionTime > 0 && (
            <div className="bg-blue-400 text-white px-2 py-1 rounded text-xs font-bold">
              🕰️ {Math.ceil(slowMotionTime / 1000)}s
            </div>
          )}
        </div>

        {/* Name Input Modal */}
        {showNameInput && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="bg-white p-3 rounded-lg shadow-lg w-60">
              <div className="text-center mb-3">
                <Trophy className="mx-auto h-6 w-6 text-yellow-500 mb-1" />
                <h3 className="text-sm font-bold">Great Score!</h3>
                <p className="text-xs text-gray-600">Score: {score}</p>
              </div>
              <div className="space-y-2 mb-3">
                <Label htmlFor="playerName" className="text-xs">Enter your name:</Label>
                <Input
                  id="playerName"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Your name"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
                  className="text-xs h-8"
                />
              </div>
              <div className="flex space-x-2">
                <Button onClick={handleNameSubmit} className="flex-1 text-xs h-8">
                  Submit
                </Button>
                <Button variant="outline" onClick={() => setShowNameInput(false)} className="text-xs h-8">
                  Skip
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard Modal */}
        {showLeaderboard && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="bg-white p-3 rounded-lg shadow-lg w-60">
              <div className="text-center mb-3">
                <Star className="mx-auto h-6 w-6 text-yellow-500 mb-1" />
                <h3 className="text-sm font-bold">Top 5 Scores</h3>
              </div>
              <div className="space-y-1 mb-3">
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
              <div className="flex space-x-2">
                <Button onClick={restartGame} className="flex-1 text-xs h-8">
                  Play Again
                </Button>
                <Button variant="outline" onClick={() => setShowLeaderboard(false)} className="text-xs h-8">
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
              <p className="text-xs mb-3">Score: {score}</p>
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