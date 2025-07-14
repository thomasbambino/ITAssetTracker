import { useState, useEffect, useRef, useCallback } from 'react';
import { HelpCircle, X, Award, Zap, Shield, Clock, Trophy, Star, Cloud, Sun, Moon, Wind } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import treeUpwardImg from '@/assets/tree-upward.png';

interface Bird {
  x: number;
  y: number;
  velocity: number;
  invincible: boolean;
  slowMotion: boolean;
  invincibilityTime: number;
  slowMotionTime: number;
  trail: Array<{ x: number; y: number; age: number }>;
}

interface Tree {
  x: number;
  topHeight: number;
  bottomY: number;
  scored: boolean;
}

interface PowerUp {
  x: number;
  y: number;
  type: 'invincibility' | 'slowMotion' | 'signalBoost';
  active: boolean;
}

interface WeatherParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  unlocked: boolean;
  progress?: number;
  target?: number;
}

interface LeaderboardEntry {
  id: number;
  score: number;
  playerName: string;
  achievedAt: string;
  combo: number;
  distance: number;
  weatherCondition: string;
  timeOfDay: string;
}

type WeatherType = 'clear' | 'rain' | 'snow' | 'storm';
type TimeOfDay = 'day' | 'night' | 'dawn' | 'dusk';

export default function EnhancedFlappyPhone() {
  const [isOpen, setIsOpen] = useState(false);
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [savedPlayerName, setSavedPlayerName] = useState('');
  const [tempPlayerName, setTempPlayerName] = useState('');
  
  const [bird, setBird] = useState<Bird>({ 
    x: 50, 
    y: 150, 
    velocity: 0,
    invincible: false,
    slowMotion: false,
    invincibilityTime: 0,
    slowMotionTime: 0,
    trail: []
  });
  
  const [trees, setTrees] = useState<Tree[]>([]);
  const [powerUps, setPowerUps] = useState<PowerUp[]>([]);
  const [weatherParticles, setWeatherParticles] = useState<WeatherParticle[]>([]);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [distance, setDistance] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [gameRunning, setGameRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [backgroundOffset, setBackgroundOffset] = useState(0);
  const [flashRed, setFlashRed] = useState(false);
  const [weather, setWeather] = useState<WeatherType>('clear');
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('day');
  const [gameTime, setGameTime] = useState(0);
  
  const gameLoopRef = useRef<number>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const treeImageRef = useRef<HTMLImageElement>();
  const cloudImageRef = useRef<HTMLImageElement>();
  const stormImageRef = useRef<HTMLImageElement>();

  const CANVAS_WIDTH = 280;
  const CANVAS_HEIGHT = 200;
  const BIRD_SIZE = 18;
  const TREE_WIDTH = 60;
  const TREE_GAP = 90;
  const GRAVITY = 0.4;
  const JUMP_FORCE = -6;
  const TREE_SPEED = 2;
  const BACKGROUND_SPEED = 0.5;
  const COLLISION_BUFFER = 4;

  // Load saved player name
  useEffect(() => {
    const saved = localStorage.getItem('flappyPhone_playerName');
    if (saved) {
      setSavedPlayerName(saved);
    }
  }, []);

  // Load images and initialize achievements
  useEffect(() => {
    const img = new Image();
    img.src = treeUpwardImg;
    img.onload = () => {
      treeImageRef.current = img;
    };
    
    // Load weather images
    const cloudImg = new Image();
    cloudImg.src = '/attached_assets/ChatGPT Image Jul 14, 2025, 04_18_25 PM_1752524491844.png';
    cloudImg.onload = () => {
      cloudImageRef.current = cloudImg;
    };
    
    const stormImg = new Image();
    stormImg.src = '/attached_assets/ChatGPT Image Jul 14, 2025, 04_21_01 PM_1752524495928.png';
    stormImg.onload = () => {
      stormImageRef.current = stormImg;
    };
    
    fetchLeaderboard();
    initializeAchievements();
  }, []);

  // Initialize achievements
  const initializeAchievements = () => {
    const defaultAchievements: Achievement[] = [
      {
        id: 'first_flight',
        title: 'First Flight',
        description: 'Complete your first successful flight',
        icon: <Trophy className="h-4 w-4" />,
        unlocked: false
      },
      {
        id: 'tree_master',
        title: 'Tree Master',
        description: 'Pass through 50 trees',
        icon: <Award className="h-4 w-4" />,
        unlocked: false,
        progress: 0,
        target: 50
      },
      {
        id: 'combo_king',
        title: 'Combo King',
        description: 'Achieve a 10x combo',
        icon: <Star className="h-4 w-4" />,
        unlocked: false,
        progress: 0,
        target: 10
      },
      {
        id: 'weather_warrior',
        title: 'Weather Warrior',
        description: 'Survive 30 seconds in bad weather',
        icon: <Cloud className="h-4 w-4" />,
        unlocked: false,
        progress: 0,
        target: 30
      },
      {
        id: 'night_owl',
        title: 'Night Owl',
        description: 'Score 20 points during night time',
        icon: <Moon className="h-4 w-4" />,
        unlocked: false,
        progress: 0,
        target: 20
      },
      {
        id: 'power_user',
        title: 'Power User',
        description: 'Collect 5 power-ups in one game',
        icon: <Zap className="h-4 w-4" />,
        unlocked: false,
        progress: 0,
        target: 5
      }
    ];
    
    const savedAchievements = localStorage.getItem('flappyPhone_achievements');
    if (savedAchievements) {
      setAchievements(JSON.parse(savedAchievements));
    } else {
      setAchievements(defaultAchievements);
    }
  };

  // Fetch leaderboard
  const fetchLeaderboard = async () => {
    try {
      const response = await fetch('/api/game/flappy-help/leaderboard');
      const data = await response.json();
      setLeaderboard(data.leaderboard || []);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    }
  };

  // Update score and check achievements
  const updateScore = async (finalScore: number, finalCombo: number, finalDistance: number) => {
    if (!savedPlayerName) return;
    
    try {
      const response = await fetch('/api/game/flappy-help/score', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          score: finalScore,
          playerName: savedPlayerName,
          combo: finalCombo,
          distance: finalDistance,
          weatherCondition: weather,
          timeOfDay: timeOfDay
        }),
      });
      
      if (response.ok) {
        fetchLeaderboard();
        checkAchievements(finalScore, finalCombo, finalDistance);
      }
    } catch (error) {
      console.error('Error updating score:', error);
    }
  };

  // Check and unlock achievements
  const checkAchievements = (finalScore: number, finalCombo: number, finalDistance: number) => {
    const updatedAchievements = achievements.map(achievement => {
      let unlocked = achievement.unlocked;
      let progress = achievement.progress || 0;
      
      switch (achievement.id) {
        case 'first_flight':
          if (finalScore > 0) unlocked = true;
          break;
        case 'tree_master':
          progress = Math.min(finalScore, achievement.target || 50);
          if (progress >= (achievement.target || 50)) unlocked = true;
          break;
        case 'combo_king':
          progress = Math.max(progress, finalCombo);
          if (progress >= (achievement.target || 10)) unlocked = true;
          break;
        case 'night_owl':
          if (timeOfDay === 'night') {
            progress = Math.min(progress + finalScore, achievement.target || 20);
            if (progress >= (achievement.target || 20)) unlocked = true;
          }
          break;
        case 'weather_warrior':
          if (weather !== 'clear') {
            progress = Math.min(progress + (gameTime / 1000), achievement.target || 30);
            if (progress >= (achievement.target || 30)) unlocked = true;
          }
          break;
      }
      
      return { ...achievement, unlocked, progress };
    });
    
    setAchievements(updatedAchievements);
    localStorage.setItem('flappyPhone_achievements', JSON.stringify(updatedAchievements));
  };

  // Weather and time effects
  const updateEnvironment = useCallback(() => {
    // Change weather randomly
    if (Math.random() < 0.001) {
      const weathers: WeatherType[] = ['clear', 'rain', 'snow', 'storm'];
      setWeather(weathers[Math.floor(Math.random() * weathers.length)]);
    }
    
    // Change time of day based on game time
    const timePhase = Math.floor(gameTime / 10000) % 4;
    const times: TimeOfDay[] = ['day', 'dusk', 'night', 'dawn'];
    setTimeOfDay(times[timePhase]);
  }, [gameTime]);

  // Generate weather particles
  const generateWeatherParticles = useCallback(() => {
    const newParticles: WeatherParticle[] = [];
    
    if (weather === 'rain') {
      for (let i = 0; i < 3; i++) {
        newParticles.push({
          x: Math.random() * CANVAS_WIDTH,
          y: -5,
          vx: Math.random() * 2 - 1,
          vy: 3 + Math.random() * 2,
          size: 1 + Math.random(),
          alpha: 0.6
        });
      }
    } else if (weather === 'snow') {
      for (let i = 0; i < 2; i++) {
        newParticles.push({
          x: Math.random() * CANVAS_WIDTH,
          y: -5,
          vx: Math.random() * 1 - 0.5,
          vy: 1 + Math.random(),
          size: 2 + Math.random() * 2,
          alpha: 0.8
        });
      }
    } else if (weather === 'storm') {
      for (let i = 0; i < 5; i++) {
        newParticles.push({
          x: Math.random() * CANVAS_WIDTH,
          y: -5,
          vx: Math.random() * 4 - 2,
          vy: 4 + Math.random() * 3,
          size: 1 + Math.random() * 2,
          alpha: 0.5
        });
      }
    }
    
    return newParticles;
  }, [weather]);

  // Generate power-ups
  const generatePowerUp = useCallback(() => {
    if (Math.random() < 0.003 && powerUps.length < 2) {
      const types: PowerUp['type'][] = ['invincibility', 'slowMotion', 'signalBoost'];
      const newPowerUp: PowerUp = {
        x: CANVAS_WIDTH + 20,
        y: 50 + Math.random() * (CANVAS_HEIGHT - 100),
        type: types[Math.floor(Math.random() * types.length)],
        active: true
      };
      setPowerUps(prev => [...prev, newPowerUp]);
    }
  }, [powerUps.length]);

  // Reset game
  const resetGame = useCallback(() => {
    setBird({ 
      x: 50, 
      y: 150, 
      velocity: 0,
      invincible: false,
      slowMotion: false,
      invincibilityTime: 0,
      slowMotionTime: 0,
      trail: []
    });
    setTrees([]);
    setPowerUps([]);
    setWeatherParticles([]);
    setScore(0);
    setCombo(0);
    setDistance(0);
    setGameOver(false);
    setGameRunning(false);
    setBackgroundOffset(0);
    setFlashRed(false);
    setWeather('clear');
    setTimeOfDay('day');
    setGameTime(0);
  }, []);

  // Jump function
  const jump = useCallback(() => {
    if (!gameOver) {
      if (!gameRunning) {
        setGameRunning(true);
      }
      setBird(prev => ({ ...prev, velocity: JUMP_FORCE }));
    }
  }, [gameOver, gameRunning]);

  // Handle power-up collection
  const collectPowerUp = useCallback((powerUp: PowerUp) => {
    setBird(prev => {
      let newBird = { ...prev };
      
      switch (powerUp.type) {
        case 'invincibility':
          newBird.invincible = true;
          newBird.invincibilityTime = 3000; // 3 seconds
          break;
        case 'slowMotion':
          newBird.slowMotion = true;
          newBird.slowMotionTime = 2000; // 2 seconds
          break;
        case 'signalBoost':
          // Instant score boost
          setScore(prev => prev + 5);
          break;
      }
      
      return newBird;
    });
    
    // Update power-up achievement
    const updatedAchievements = achievements.map(achievement => {
      if (achievement.id === 'power_user') {
        const newProgress = (achievement.progress || 0) + 1;
        return {
          ...achievement,
          progress: newProgress,
          unlocked: newProgress >= (achievement.target || 5)
        };
      }
      return achievement;
    });
    setAchievements(updatedAchievements);
    localStorage.setItem('flappyPhone_achievements', JSON.stringify(updatedAchievements));
  }, [achievements]);

  // Game loop
  useEffect(() => {
    if (gameRunning && !gameOver) {
      gameLoopRef.current = requestAnimationFrame(() => {
        const timeMultiplier = bird.slowMotion ? 0.5 : 1;
        const effectiveGravity = GRAVITY * timeMultiplier;
        const effectiveTreeSpeed = TREE_SPEED * timeMultiplier;
        
        setBird(prev => {
          let newBird = { ...prev };
          
          // Apply gravity
          newBird.velocity += effectiveGravity;
          newBird.y += newBird.velocity;
          
          // Update power-up timers
          if (newBird.invincibilityTime > 0) {
            newBird.invincibilityTime -= 16;
            if (newBird.invincibilityTime <= 0) {
              newBird.invincible = false;
            }
          }
          
          if (newBird.slowMotionTime > 0) {
            newBird.slowMotionTime -= 16;
            if (newBird.slowMotionTime <= 0) {
              newBird.slowMotion = false;
            }
          }
          
          // Update trail
          newBird.trail.push({ x: newBird.x, y: newBird.y, age: 0 });
          newBird.trail = newBird.trail
            .map(t => ({ ...t, age: t.age + 1 }))
            .filter(t => t.age < 10);
          
          // Check boundaries
          if (newBird.y > CANVAS_HEIGHT - 10 || newBird.y < 0) {
            if (!newBird.invincible) {
              setFlashRed(true);
              setTimeout(() => setFlashRed(false), 200);
              setGameOver(true);
              setGameRunning(false);
              updateScore(score, combo, distance);
            }
          }
          
          return newBird;
        });
        
        // Update trees
        setTrees(prev => {
          const newTrees = prev.map(tree => ({ ...tree, x: tree.x - effectiveTreeSpeed }));
          
          // Add new trees
          const lastTree = newTrees[newTrees.length - 1];
          if (!lastTree || lastTree.x < CANVAS_WIDTH - 150) {
            const topHeight = 50 + Math.random() * 80;
            newTrees.push({
              x: CANVAS_WIDTH + TREE_WIDTH,
              topHeight,
              bottomY: topHeight + TREE_GAP,
              scored: false
            });
          }
          
          return newTrees.filter(tree => tree.x > -TREE_WIDTH);
        });
        
        // Update power-ups
        setPowerUps(prev => {
          return prev.map(powerUp => ({ ...powerUp, x: powerUp.x - effectiveTreeSpeed }))
                    .filter(powerUp => powerUp.x > -20);
        });
        
        // Update weather particles
        setWeatherParticles(prev => {
          const updated = prev.map(particle => ({
            ...particle,
            x: particle.x + particle.vx,
            y: particle.y + particle.vy
          })).filter(particle => particle.y < CANVAS_HEIGHT && particle.x > -10);
          
          return [...updated, ...generateWeatherParticles()];
        });
        
        // Update background
        setBackgroundOffset(prev => (prev + BACKGROUND_SPEED) % 40);
        
        // Update game time and environment
        setGameTime(prev => prev + 16);
        updateEnvironment();
        
        // Generate power-ups
        generatePowerUp();
        
        // Update distance
        setDistance(prev => prev + 1);
        
        // Weather effects on bird
        if (weather === 'storm') {
          setBird(prev => ({
            ...prev,
            velocity: prev.velocity + (Math.random() - 0.5) * 0.5 // Wind effect
          }));
        }
      });
    }
    
    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameRunning, gameOver, bird.slowMotion, score, combo, distance, weather, updateEnvironment, generatePowerUp, generateWeatherParticles, collectPowerUp, updateScore]);

  // Collision detection
  useEffect(() => {
    if (gameRunning && !gameOver && !bird.invincible) {
      // Check tree collisions
      trees.forEach(tree => {
        if (
          bird.x + BIRD_SIZE - COLLISION_BUFFER > tree.x &&
          bird.x + COLLISION_BUFFER < tree.x + TREE_WIDTH &&
          (bird.y + COLLISION_BUFFER < tree.topHeight || bird.y + BIRD_SIZE - COLLISION_BUFFER > tree.bottomY)
        ) {
          setFlashRed(true);
          setTimeout(() => setFlashRed(false), 200);
          setGameOver(true);
          setGameRunning(false);
          updateScore(score, combo, distance);
        }
      });
    }
    
    // Check power-up collection
    powerUps.forEach((powerUp, index) => {
      if (
        bird.x + BIRD_SIZE > powerUp.x &&
        bird.x < powerUp.x + 20 &&
        bird.y + BIRD_SIZE > powerUp.y &&
        bird.y < powerUp.y + 20
      ) {
        collectPowerUp(powerUp);
        setPowerUps(prev => prev.filter((_, i) => i !== index));
      }
    });
  }, [bird, trees, powerUps, gameRunning, gameOver, score, combo, distance, collectPowerUp, updateScore]);

  // Score tracking
  useEffect(() => {
    if (gameRunning && !gameOver) {
      trees.forEach(tree => {
        if (!tree.scored && bird.x > tree.x + TREE_WIDTH) {
          tree.scored = true;
          
          // Calculate score based on conditions
          let points = 1;
          if (weather !== 'clear') points *= 2; // Weather bonus
          if (timeOfDay === 'night') points *= 1.5; // Night bonus
          
          setScore(prev => prev + points);
          setCombo(prev => prev + 1);
          
          // Check combo achievement
          if (combo >= 9) {
            const updatedAchievements = achievements.map(achievement => {
              if (achievement.id === 'combo_king') {
                return { ...achievement, unlocked: true, progress: combo + 1 };
              }
              return achievement;
            });
            setAchievements(updatedAchievements);
            localStorage.setItem('flappyPhone_achievements', JSON.stringify(updatedAchievements));
          }
        }
      });
    }
  }, [bird.x, trees, gameRunning, gameOver, combo, weather, timeOfDay, achievements]);

  // Draw satellite phone
  const drawSatellitePhone = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    const phoneWidth = BIRD_SIZE * 0.7;
    const phoneHeight = BIRD_SIZE * 1.2;
    
    // Draw trail
    if (bird.trail.length > 0) {
      ctx.strokeStyle = bird.invincible ? '#FFD700' : '#87CEEB';
      ctx.lineWidth = 2;
      ctx.beginPath();
      bird.trail.forEach((point, index) => {
        const alpha = (bird.trail.length - index) / bird.trail.length;
        ctx.globalAlpha = alpha * 0.3;
        if (index === 0) {
          ctx.moveTo(point.x, point.y);
        } else {
          ctx.lineTo(point.x, point.y);
        }
      });
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    
    // Main phone body
    ctx.fillStyle = bird.invincible ? '#FFD700' : '#2C3E50';
    ctx.fillRect(x, y, phoneWidth, phoneHeight);
    
    // Screen
    ctx.fillStyle = bird.invincible ? '#FFF700' : '#34495E';
    ctx.fillRect(x + 2, y + 2, phoneWidth - 4, phoneHeight * 0.4);
    
    // Antenna
    ctx.fillStyle = bird.invincible ? '#FFD700' : '#E74C3C';
    ctx.fillRect(x + phoneWidth * 0.8, y - 6, 2, 8);
    
    // Keypad
    ctx.fillStyle = bird.invincible ? '#FFF700' : '#7F8C8D';
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        ctx.fillRect(
          x + 2 + col * (phoneWidth - 4) / 3,
          y + phoneHeight * 0.5 + row * (phoneHeight * 0.4) / 3,
          (phoneWidth - 4) / 3 - 1,
          (phoneHeight * 0.4) / 3 - 1
        );
      }
    }
  };

  // Draw power-up
  const drawPowerUp = (ctx: CanvasRenderingContext2D, powerUp: PowerUp) => {
    ctx.save();
    ctx.translate(powerUp.x + 10, powerUp.y + 10);
    ctx.rotate(Date.now() * 0.005);
    
    switch (powerUp.type) {
      case 'invincibility':
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(-8, -8, 16, 16);
        ctx.fillStyle = '#FFF';
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('⚡', 0, 4);
        break;
      case 'slowMotion':
        ctx.fillStyle = '#87CEEB';
        ctx.fillRect(-8, -8, 16, 16);
        ctx.fillStyle = '#FFF';
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('⏱', 0, 4);
        break;
      case 'signalBoost':
        ctx.fillStyle = '#32CD32';
        ctx.fillRect(-8, -8, 16, 16);
        ctx.fillStyle = '#FFF';
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('📡', 0, 4);
        break;
    }
    
    ctx.restore();
  };

  // Draw weather particles
  const drawWeatherParticles = (ctx: CanvasRenderingContext2D) => {
    weatherParticles.forEach(particle => {
      ctx.globalAlpha = particle.alpha;
      
      if (weather === 'rain') {
        ctx.strokeStyle = '#4169E1';
        ctx.lineWidth = particle.size;
        ctx.beginPath();
        ctx.moveTo(particle.x, particle.y);
        ctx.lineTo(particle.x + particle.vx, particle.y + particle.vy);
        ctx.stroke();
      } else if (weather === 'snow') {
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (weather === 'storm') {
        ctx.strokeStyle = '#696969';
        ctx.lineWidth = particle.size;
        ctx.beginPath();
        ctx.moveTo(particle.x, particle.y);
        ctx.lineTo(particle.x + particle.vx, particle.y + particle.vy);
        ctx.stroke();
      }
    });
    
    ctx.globalAlpha = 1;
  };

  // Draw background based on time of day
  const drawBackground = (ctx: CanvasRenderingContext2D) => {
    let gradient;
    
    switch (timeOfDay) {
      case 'night':
        gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
        gradient.addColorStop(0, '#1a1a2e');
        gradient.addColorStop(1, '#16213e');
        break;
      case 'dawn':
        gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
        gradient.addColorStop(0, '#ff6b6b');
        gradient.addColorStop(1, '#ffa500');
        break;
      case 'dusk':
        gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
        gradient.addColorStop(0, '#ff8c00');
        gradient.addColorStop(1, '#ff4500');
        break;
      default: // day
        gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
        gradient.addColorStop(0, '#87CEEB');
        gradient.addColorStop(1, '#B0E0E6');
        break;
    }
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  };

  // Draw mountains
  const drawMountains = (ctx: CanvasRenderingContext2D) => {
    const mountainLayers = [
      { offset: backgroundOffset * 0.2, color: '#8B7355', height: 0.3 },
      { offset: backgroundOffset * 0.5, color: '#A0522D', height: 0.4 },
      { offset: backgroundOffset * 0.8, color: '#228B22', height: 0.5 }
    ];
    
    mountainLayers.forEach(layer => {
      ctx.fillStyle = layer.color;
      ctx.beginPath();
      ctx.moveTo(-layer.offset, CANVAS_HEIGHT);
      
      for (let x = -layer.offset; x <= CANVAS_WIDTH + layer.offset; x += 40) {
        const height = CANVAS_HEIGHT * layer.height + Math.sin(x * 0.02) * 20;
        ctx.lineTo(x, CANVAS_HEIGHT - height);
      }
      
      ctx.lineTo(CANVAS_WIDTH + layer.offset, CANVAS_HEIGHT);
      ctx.closePath();
      ctx.fill();
    });
  };

  // Canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Draw background
    drawBackground(ctx);
    
    // Draw mountains
    drawMountains(ctx);
    
    // Draw weather particles
    drawWeatherParticles(ctx);
    
    // Flash red effect
    if (flashRed) {
      ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }
    
    // Draw trees
    trees.forEach(tree => {
      if (treeImageRef.current) {
        // Top tree (upside down)
        ctx.save();
        ctx.translate(tree.x + TREE_WIDTH / 2, tree.topHeight);
        ctx.scale(1, -1);
        ctx.drawImage(treeImageRef.current, -TREE_WIDTH / 2, -tree.topHeight, TREE_WIDTH, tree.topHeight);
        ctx.restore();
        
        // Bottom tree (normal)
        ctx.drawImage(treeImageRef.current, tree.x, tree.bottomY, TREE_WIDTH, CANVAS_HEIGHT - tree.bottomY - 10);
      }
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
    
    // Draw power-up status
    if (bird.invincible) {
      ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }
    
    if (bird.slowMotion) {
      ctx.fillStyle = 'rgba(135, 206, 235, 0.2)';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }
    
  }, [bird, trees, powerUps, weatherParticles, backgroundOffset, flashRed, timeOfDay, weather]);

  // Handle name submission
  const handleNameSubmit = () => {
    if (tempPlayerName.trim()) {
      const name = tempPlayerName.trim();
      setSavedPlayerName(name);
      setPlayerName('');
      setTempPlayerName('');
      localStorage.setItem('flappyPhone_playerName', name);
      setShowNameDialog(false);
    }
  };

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
        title="Need help? Play an enhanced game!"
      >
        <HelpCircle className="h-5 w-5" />
      </button>
    );
  }

  return (
    <>
      <div className="fixed bottom-4 left-4 z-50 bg-white dark:bg-slate-800 border rounded-lg shadow-2xl p-4 w-[320px]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-muted-foreground">Score: {score}</span>
            <span className="text-xs text-muted-foreground">Combo: {combo}x</span>
            <span className="text-xs text-muted-foreground">Dist: {Math.floor(distance/10)}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowLeaderboard(true)}
              className="h-6 w-6 p-0"
              title="Leaderboard"
            >
              <Trophy className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAchievements(true)}
              className="h-6 w-6 p-0"
              title="Achievements"
            >
              <Award className="h-3 w-3" />
            </Button>
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

        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            {timeOfDay === 'day' && <Sun className="h-3 w-3 text-yellow-500" />}
            {timeOfDay === 'night' && <Moon className="h-3 w-3 text-blue-500" />}
            {timeOfDay === 'dawn' && <Sun className="h-3 w-3 text-orange-500" />}
            {timeOfDay === 'dusk' && <Sun className="h-3 w-3 text-red-500" />}
            
            {weather === 'rain' && <Cloud className="h-3 w-3 text-blue-600" />}
            {weather === 'snow' && <Cloud className="h-3 w-3 text-white" />}
            {weather === 'storm' && <Wind className="h-3 w-3 text-gray-600" />}
          </div>
          
          <div className="flex items-center space-x-2">
            {bird.invincible && <Badge variant="secondary" className="text-xs"><Shield className="h-3 w-3 mr-1" />Shield</Badge>}
            {bird.slowMotion && <Badge variant="secondary" className="text-xs"><Clock className="h-3 w-3 mr-1" />Slow</Badge>}
          </div>
        </div>

        <div className="relative border rounded overflow-hidden">
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            onClick={jump}
            className="cursor-pointer block"
          />

          {!gameRunning && !gameOver && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="text-center text-white">
                <p className="text-sm mb-2">Press Space to start!</p>
                <p className="text-xs">Enhanced Flappy Phone</p>
              </div>
            </div>
          )}

          {gameOver && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="text-center text-white">
                <p className="text-sm mb-2">Game Over!</p>
                <p className="text-xs mb-1">Score: {score}</p>
                <p className="text-xs mb-1">Combo: {combo}x</p>
                <p className="text-xs mb-3">Distance: {Math.floor(distance/10)}</p>
                <div className="space-y-2">
                  <Button
                    size="sm"
                    onClick={resetGame}
                    className="text-xs h-7"
                  >
                    Play Again
                  </Button>
                  {!savedPlayerName && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowNameDialog(true)}
                      className="text-xs h-7"
                    >
                      Set Name
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center mt-2">
          <p className="text-xs text-muted-foreground">
            {savedPlayerName ? `Playing as: ${savedPlayerName}` : 'Press Space to jump!'}
          </p>
          {!savedPlayerName && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowNameDialog(true)}
              className="text-xs h-6"
            >
              Set Name
            </Button>
          )}
        </div>
      </div>

      {/* Name Dialog */}
      <Dialog open={showNameDialog} onOpenChange={setShowNameDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Enter Your Name</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Enter your name"
              value={tempPlayerName}
              onChange={(e) => setTempPlayerName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleNameSubmit()}
            />
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowNameDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleNameSubmit} disabled={!tempPlayerName.trim()}>
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Leaderboard Dialog */}
      <Dialog open={showLeaderboard} onOpenChange={setShowLeaderboard}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Leaderboard</DialogTitle>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto">
            {leaderboard.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No scores yet!</p>
            ) : (
              <div className="space-y-2">
                {leaderboard.map((entry, index) => (
                  <div key={entry.id} className="flex items-center justify-between p-3 bg-muted rounded">
                    <div className="flex items-center space-x-3">
                      <span className="font-bold text-lg">#{index + 1}</span>
                      <div>
                        <p className="font-medium">{entry.playerName}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(entry.achievedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{entry.score}</p>
                      <p className="text-xs text-muted-foreground">
                        {entry.combo}x combo • {Math.floor(entry.distance/10)} dist
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Achievements Dialog */}
      <Dialog open={showAchievements} onOpenChange={setShowAchievements}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Achievements</DialogTitle>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {achievements.map((achievement) => (
                <Card key={achievement.id} className={`${achievement.unlocked ? 'bg-green-50 dark:bg-green-900/20' : ''}`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center space-x-2">
                      <span className={achievement.unlocked ? 'text-green-600' : 'text-muted-foreground'}>
                        {achievement.icon}
                      </span>
                      <span>{achievement.title}</span>
                      {achievement.unlocked && <Badge variant="secondary" className="text-xs">Unlocked!</Badge>}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground mb-2">{achievement.description}</p>
                    {achievement.target && (
                      <div className="text-xs text-muted-foreground">
                        Progress: {achievement.progress || 0}/{achievement.target}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}