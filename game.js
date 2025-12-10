// 游戏配置
const CONFIG = {
    canvasWidth: 800,
    canvasHeight: 600,
    paddleWidth: 120,
    paddleHeight: 15,
    paddleSpeed: 10,
    ballRadius: 10,
    ballSpeed: 4.6, // 初始球速
    maxBallSpeed: 7, // 最高球速
    brickRowCount: 5,
    brickColumnCount: 10,
    brickWidth: 68,
    brickHeight: 25,
    brickPadding: 8,
    brickOffsetTop: 50,
    brickOffsetLeft: 24
};

// 多語言配置
const LANGUAGES = {
    'zh-TW': {
        name: '繁體中文',
        ui: {
            score: '分數',
            lives: '生命',
            level: '關卡',
            combo: '連擊',
            highScore: '最高分',
            soundOn: '🔊 音效',
            soundOff: '🔇 靜音',
            endlessOn: '♾️ 無盡模式: 開',
            endlessOff: '♾️ 無盡模式: 關',
            language: '🌐 語言',
            help: '❓ 說明',
            settings: '⚙️ 設定'
        },
        controls: {
            arrows: '⬅️ ➡️ 方向鍵控制擋板',
            touch: '👆 觸控：點擊開始，滑動移動擋板',
            spaceStart: '按 <kbd>空格鍵</kbd> 開始/暫停遊戲',
            mute: '按 <kbd>M</kbd> 靜音'
        },
        messages: {
            title: '打磚塊',
            start: '按空格鍵開始遊戲',
            paused: '暫停',
            pauseMsg: '按空格鍵繼續',
            gameOver: '遊戲結束',
            gameOverMsg: '再接再厲！',
            win: '恭喜過關！',
            winMsg: '準備挑戰下一關',
            loseLife: '💔 失去一條生命',
            livesLeft: (n) => `剩餘 ${n} 條生命  按空格鍵繼續`,
            copied: '✅ 已複製到剪貼板！',
            saved: '✅ 成績已儲存！'
        },
        powerups: {
            expand: '擴大擋板',
            multiball: '多球',
            pierce: '穿透球',
            slow: '減速',
            shrink: '縮小擋板'
        },
        scoreCard: {
            title: (isWin) => isWin ? '🎉 恭喜過關！' : '💀 遊戲結束',
            finalScore: '最終得分',
            maxCombo: '最高連擊',
            dailyChallenge: '每日挑戰',
            playAgain: '🔄 再玩一次',
            share: '📋 複製成績',
            enterName: '輸入暱稱儲存成績',
            saveScore: '💾 儲存',
            viewLeaderboard: '🏆 查看排行榜'
        },
        leaderboard: {
            title: '🏆 排行榜',
            rank: '排名',
            name: '名稱',
            score: '分數',
            combo: '連擊',
            close: '關閉',
            loading: '載入中...',
            empty: '目前還沒有成績記錄'
        },
        help: {
            title: '❓ 遊戲說明',
            controls: '🎮 操作方式',
            controlArrows: '⬅️➡️ 方向鍵移動擋板',
            controlSpace: '空格鍵 開始/暫停/發射球',
            controlTouch: '👆 觸控滑動移動擋板',
            controlM: 'M 鍵靜音',
            powerups: '🎁 道具效果',
            powerupExpand: '擴大擋板',
            powerupMultiball: '多球模式',
            powerupPierce: '穿透球（不反彈）',
            powerupSlow: '減速球',
            powerupShrink: '縮小擋板（危險！）',
            bricks: '🧱 磚塊類型',
            brick1: '1 血磚塊：紅色/黃色',
            brick2: '2 血磚塊：顯示數字 2',
            brick3: '3 血磚塊：顯示數字 3',
            brickBomb: '💣 炸彈磚塊：爆炸波及周圍',
            tips: '💡 小技巧',
            tip1: '連擊可獲得額外分數！',
            tip2: '每日關卡固定，挑戰排行榜！',
            tip3: '球速每過一關會增加',
            close: '知道了！'
        },
        settings: {
            title: '⚙️ 遊戲設定',
            language: '語言 / Language',
            sound: '音效',
            endless: '無盡模式',
            clearData: '清除數據',
            clear: '🗑️ 清除',
            close: '完成',
            cleared: '數據已清除！'
        }
    },
    'en': {
        name: 'English',
        ui: {
            score: 'Score',
            lives: 'Lives',
            level: 'Level',
            combo: 'Combo',
            highScore: 'High Score',
            soundOn: '🔊 Sound',
            soundOff: '🔇 Muted',
            endlessOn: '♾️ Endless: ON',
            endlessOff: '♾️ Endless: OFF',
            language: '🌐 Language',
            help: '❓ Help',
            settings: '⚙️ Settings'
        },
        controls: {
            arrows: '⬅️ ➡️ Arrow keys to move paddle',
            touch: '👆 Touch: Tap to start, swipe to move',
            spaceStart: 'Press <kbd>SPACE</kbd> to start/pause',
            mute: 'Press <kbd>M</kbd> to mute'
        },
        messages: {
            title: 'Brick Breaker',
            start: 'Press SPACE to start',
            paused: 'Paused',
            pauseMsg: 'Press SPACE to continue',
            gameOver: 'Game Over',
            gameOverMsg: 'Better luck next time!',
            win: 'Level Complete!',
            winMsg: 'Get ready for next level',
            loseLife: '💔 Lost a Life',
            livesLeft: (n) => `${n} ${n === 1 ? 'life' : 'lives'} left  Press SPACE to continue`,
            copied: '✅ Copied to clipboard!',
            saved: '✅ Score saved!'
        },
        powerups: {
            expand: 'Expand Paddle',
            multiball: 'Multi Ball',
            pierce: 'Pierce Ball',
            slow: 'Slow Ball',
            shrink: 'Shrink Paddle'
        },
        scoreCard: {
            title: (isWin) => isWin ? '🎉 Level Complete!' : '💀 Game Over',
            finalScore: 'Final Score',
            maxCombo: 'Max Combo',
            dailyChallenge: 'Daily Challenge',
            playAgain: '🔄 Play Again',
            share: '📋 Copy Score',
            enterName: 'Enter nickname to save',
            saveScore: '💾 Save',
            viewLeaderboard: '🏆 View Leaderboard'
        },
        leaderboard: {
            title: '🏆 Leaderboard',
            rank: 'Rank',
            name: 'Name',
            score: 'Score',
            combo: 'Combo',
            close: 'Close',
            loading: 'Loading...',
            empty: 'No scores yet'
        },
        help: {
            title: '❓ Game Help',
            controls: '🎮 Controls',
            controlArrows: '⬅️➡️ Arrow keys to move paddle',
            controlSpace: 'SPACE to start/pause/launch',
            controlTouch: '👆 Swipe to move paddle',
            controlM: 'M key to mute',
            powerups: '🎁 Power-ups',
            powerupExpand: 'Expand Paddle',
            powerupMultiball: 'Multi-ball Mode',
            powerupPierce: 'Pierce Ball (no bounce)',
            powerupSlow: 'Slow Ball',
            powerupShrink: 'Shrink Paddle (danger!)',
            bricks: '🧱 Brick Types',
            brick1: '1 HP: Red/Yellow',
            brick2: '2 HP: Shows number 2',
            brick3: '3 HP: Shows number 3',
            brickBomb: '💣 Bomb: Explodes nearby',
            tips: '💡 Tips',
            tip1: 'Combos give bonus points!',
            tip2: 'Daily levels are fixed, compete!',
            tip3: 'Ball speed increases each level',
            close: 'Got it!'
        },
        settings: {
            title: '⚙️ Game Settings',
            language: 'Language',
            sound: 'Sound',
            endless: 'Endless Mode',
            clearData: 'Clear Data',
            clear: '🗑️ Clear',
            close: 'Done',
            cleared: 'Data cleared!'
        }
    }
};

// 當前語言（從 localStorage 讀取，默認繁體中文）
let currentLang = localStorage.getItem('brickBreakerLang') || 'zh-TW';

// 獲取翻譯文本的輔助函數
function t(path) {
    const keys = path.split('.');
    let value = LANGUAGES[currentLang];
    for (const key of keys) {
        value = value[key];
        if (value === undefined) return path;
    }
    return value;
}

// Supabase 配置
const SUPABASE_URL = 'https://ruqsvvefpemqptnsyymj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1cXN2dmVmcGVtcXB0bnN5eW1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyNDg5ODMsImV4cCI6MjA4MDgyNDk4M30.j9rRy7bgkKh50bhDdkil1UoP1kBAQFDTVgfkHnViH4Q';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 种子随机数生成器 (Linear Congruential Generator)
class SeededRNG {
    constructor(seed) {
        this.m = 0x80000000;
        this.a = 1103515245;
        this.c = 12345;
        this.state = seed ? seed : Math.floor(Math.random() * (this.m - 1));
    }

    nextInt() {
        this.state = (this.a * this.state + this.c) % this.m;
        return this.state;
    }

    nextFloat() {
        // 返回 [0, 1) 区间的浮点数
        return this.nextInt() / (this.m - 1);
    }
}

// 音效系统类
class SoundManager {
    constructor() {
        this.audioContext = null;
        this.enabled = true;
        this.volume = 0.3;
    }

    // 初始化音频上下文（需要用户交互后调用）
    init() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }

    // 播放音调
    playTone(frequency, duration, type = 'square', volumeMultiplier = 1) {
        if (!this.enabled || !this.audioContext) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.frequency.value = frequency;
        oscillator.type = type;

        const volume = this.volume * volumeMultiplier;
        gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
    }

    // 击中挡板声音
    playPaddleHit() {
        this.playTone(220, 0.1, 'sine', 0.8);
    }

    // 击中砖块声音（根据行数变化音调）
    playBrickHit(row = 0) {
        const baseFreq = 400 + row * 50;
        this.playTone(baseFreq, 0.1, 'square', 0.6);
        setTimeout(() => this.playTone(baseFreq * 1.5, 0.05, 'sine', 0.3), 50);
    }

    // 撞墙声音
    playWallHit() {
        this.playTone(150, 0.05, 'triangle', 0.4);
    }

    // 失去生命声音
    playLoseLife() {
        this.playTone(200, 0.15, 'sawtooth', 0.5);
        setTimeout(() => this.playTone(150, 0.15, 'sawtooth', 0.4), 150);
        setTimeout(() => this.playTone(100, 0.2, 'sawtooth', 0.3), 300);
    }

    // 游戏结束声音
    playGameOver() {
        const notes = [392, 330, 294, 262];
        notes.forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 0.3, 'sine', 0.5), i * 200);
        });
    }

    // 过关声音
    playLevelComplete() {
        const notes = [523, 659, 784, 1047];
        notes.forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 0.15, 'sine', 0.6), i * 100);
        });
    }

    // 开始游戏声音
    playStart() {
        this.playTone(440, 0.1, 'sine', 0.5);
        setTimeout(() => this.playTone(554, 0.1, 'sine', 0.5), 100);
        setTimeout(() => this.playTone(659, 0.15, 'sine', 0.6), 200);
    }

    // 爆炸音效
    playExplosion() {
        this.playTone(100, 0.1, 'sawtooth', 0.8);
        setTimeout(() => this.playTone(80, 0.15, 'square', 0.6), 50);
        setTimeout(() => this.playTone(50, 0.2, 'sawtooth', 0.5), 150);
    }

    // 道具音效
    playPowerup() {
        this.playTone(880, 0.08, 'sine', 0.5);
        setTimeout(() => this.playTone(1100, 0.08, 'sine', 0.5), 80);
        setTimeout(() => this.playTone(1320, 0.12, 'sine', 0.6), 160);
    }

    // 切换音效开关
    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }
}

// 粒子对象池优化
class ParticlePool {
    constructor(size = 200) {
        this.pool = [];
        this.activeParticles = [];
        this.size = size;

        // 预创建粒子对象
        for (let i = 0; i < size; i++) {
            this.pool.push({
                x: 0, y: 0, dx: 0, dy: 0,
                radius: 0, color: '', life: 0,
                active: false
            });
        }
    }

    // 获取一个空闲粒子
    spawn(x, y, color, isExplosion = false) {
        let p = null;
        // 找一个非活跃粒子
        for (let i = 0; i < this.size; i++) {
            if (!this.pool[i].active) {
                p = this.pool[i];
                break;
            }
        }

        // 如果池满了，强制复用最旧的活跃粒子（头部）
        if (!p && this.activeParticles.length > 0) {
            p = this.activeParticles.shift();
        }

        if (p) {
            p.x = x;
            p.y = y;
            const speed = isExplosion ? 6 : 4;
            const angle = Math.random() * Math.PI * 2;
            const velocity = Math.random() * speed;

            p.dx = Math.cos(angle) * velocity;
            p.dy = Math.sin(angle) * velocity;
            p.radius = Math.random() * (isExplosion ? 6 : 3) + 2;
            p.color = color;
            p.life = 1.0;
            p.active = true;
            this.activeParticles.push(p);
        }
    }

    updateAndDraw(ctx, hexToRgbFn) {
        for (let i = this.activeParticles.length - 1; i >= 0; i--) {
            const p = this.activeParticles[i];

            p.x += p.dx;
            p.y += p.dy;
            p.life -= 0.02;
            p.radius *= 0.96;

            // 绘制
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${hexToRgbFn(p.color)}, ${p.life})`;
            ctx.fill();

            // 回收
            if (p.life <= 0) {
                p.active = false;
                this.activeParticles.splice(i, 1);
            }
        }
    }

    reset() {
        this.activeParticles.forEach(p => p.active = false);
        this.activeParticles = [];
    }
}

// 创建全局音效管理器
const soundManager = new SoundManager();

// 砖块颜色配置（渐变色）
const BRICK_COLORS = [
    { main: '#ff6b6b', light: '#ff8787', dark: '#fa5252' },
    { main: '#feca57', light: '#fed77a', dark: '#f9c22e' },
    { main: '#48dbfb', light: '#72e4fc', dark: '#1dd1fd' },
    { main: '#ff9ff3', light: '#ffb8f6', dark: '#f368e0' },
    { main: '#54a0ff', light: '#74b3ff', dark: '#2e86de' }
];

// 道具类型配置
const POWERUP_TYPES = {
    expand: { color: '#ff6b6b', emoji: '🔴', duration: 10000, name: '扩大挡板' },
    multiball: { color: '#48dbfb', emoji: '🔵', duration: 0, name: '多球' },
    pierce: { color: '#feca57', emoji: '⚡', duration: 8000, name: '穿透球' },
    slow: { color: '#1dd1a1', emoji: '🐢', duration: 8000, name: '减速' },
    shrink: { color: '#9b59b6', emoji: '💀', duration: 5000, name: '缩小挡板' }
};
const POWERUP_KEYS = Object.keys(POWERUP_TYPES);
const POWERUP_DROP_CHANCE = 0.20; // 20% 掉落机率
const POWERUP_SPEED = 3; // 道具下落速度
const POWERUP_SIZE = 25; // 道具大小

// 游戏类
class BrickBreakerGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = CONFIG.canvasWidth;
        this.canvas.height = CONFIG.canvasHeight;

        // 游戏状态
        this.gameState = 'idle'; // idle, playing, paused, gameover, win
        this.level = 1;
        this.combo = 0; // 当前连击数
        this.maxCombo = 0; // 本局最高连击
        this.score = 0;
        this.lives = 5;
        this.highScore = parseInt(localStorage.getItem('brickBreakerHighScore')) || 0;

        // 使用当天日期作为种子 (YYYYMMDD)
        const today = new Date();
        const seedStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
        this.rng = new SeededRNG(parseInt(seedStr));

        // 球速初始化（必須在 initBall 之前）
        this.currentBallSpeed = CONFIG.ballSpeed;

        // 初始化游戏对象
        this.initPaddle();
        this.initBall();
        this.initBricks();

        // 控制
        this.keys = { left: false, right: false };

        // 粒子效果
        this.particles = [];

        this.sound = soundManager;

        // 粒子池
        this.particlePool = new ParticlePool(300);

        // 屏幕震动参数
        this.shakeTime = 0;
        this.shakeMagnitude = 0;

        // 道具系统
        this.powerups = []; // 当前掉落中的道具
        this.activePowerups = {}; // 当前生效的道具 { type: remainingTime }
        this.originalPaddleWidth = CONFIG.paddleWidth; // 用于恢复擋板宽度
        this.lastTime = performance.now(); // 用于计算 deltaTime

        // 无尽模式
        this.endlessMode = false;
        this.endlessTimer = 0; // 新行生成计时器
        this.endlessInterval = 15000; // 每 15 秒生成新行

        // 初始化事件监听
        this.initEventListeners();

        // 更新显示
        this.updateUI();
        document.getElementById('highScore').textContent = this.highScore;

        // 初始化語言
        this.updateAllUI();

        // 开始游戏循环
        this.gameLoop();
    }

    initPaddle() {
        this.paddle = {
            x: (CONFIG.canvasWidth - CONFIG.paddleWidth) / 2,
            y: CONFIG.canvasHeight - 40,
            width: CONFIG.paddleWidth,
            height: CONFIG.paddleHeight,
            speed: CONFIG.paddleSpeed
        };
    }

    initBall() {
        // 初始化球阵列（支持多球）
        this.balls = [this.createBall(true)];
        // 保持向后兼容的 this.ball 引用
        this.ball = this.balls[0];
    }

    createBall(held = false) {
        // 使用當前球速
        return {
            x: CONFIG.canvasWidth / 2,
            y: CONFIG.canvasHeight - 60,
            radius: CONFIG.ballRadius,
            dx: this.currentBallSpeed * (Math.random() > 0.5 ? 1 : -1),
            dy: -this.currentBallSpeed,
            speed: this.currentBallSpeed,
            held: held,
            pierce: false // 穿透状态
        };
    }

    initBricks() {
        this.bricks = [];
        const pattern = this.getLevelPattern(this.level);

        for (let c = 0; c < CONFIG.brickColumnCount; c++) {
            this.bricks[c] = [];
            for (let r = 0; r < CONFIG.brickRowCount; r++) {
                const x = c * (CONFIG.brickWidth + CONFIG.brickPadding) + CONFIG.brickOffsetLeft;
                const y = r * (CONFIG.brickHeight + CONFIG.brickPadding) + CONFIG.brickOffsetTop;

                // 检查该位置是否有砖块（根据图案）
                // 如果 pattern 是 null，表示全部填满
                const hasBrick = pattern ? (pattern[r] ? pattern[r][c] : 0) : 1;


                // 根据行数决定血量：前2行1血，中间2行2血，最后1行混合1血和3血
                let maxHits = 1;
                if (r >= 2 && r < 4) {
                    maxHits = 2;
                } else if (r >= 4) {
                    // 最底部一行：50% 機率 3 血，50% 機率 1 血
                    maxHits = this.rng.nextFloat() < 0.5 ? 3 : 1;
                }


                // 炸弹砖只有1血
                const isBomb = hasBrick && this.rng.nextFloat() < 0.1;

                this.bricks[c][r] = {
                    x: x,
                    y: y,
                    status: hasBrick ? 1 : 0, // 根据图案决定是否存在
                    color: BRICK_COLORS[r % BRICK_COLORS.length],
                    isBomb: isBomb,
                    hits: isBomb ? 1 : maxHits,
                    maxHits: isBomb ? 1 : maxHits
                };
            }
        }
    }

    // 获取关卡图案
    getLevelPattern(level) {
        const patterns = [
            // 关卡 1: 完整矩形
            null, // null 表示全部填满

            // 关卡 2: 金字塔
            [
                [0, 0, 0, 0, 1, 1, 0, 0, 0, 0],
                [0, 0, 0, 1, 1, 1, 1, 0, 0, 0],
                [0, 0, 1, 1, 1, 1, 1, 1, 0, 0],
                [0, 1, 1, 1, 1, 1, 1, 1, 1, 0],
                [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
            ],

            // 关卡 3: 钻石
            [
                [0, 0, 0, 0, 1, 1, 0, 0, 0, 0],
                [0, 0, 0, 1, 1, 1, 1, 0, 0, 0],
                [0, 0, 1, 1, 1, 1, 1, 1, 0, 0],
                [0, 0, 0, 1, 1, 1, 1, 0, 0, 0],
                [0, 0, 0, 0, 1, 1, 0, 0, 0, 0]
            ],

            // 关卡 4: 棋盘格
            [
                [1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
                [0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
                [1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
                [0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
                [1, 0, 1, 0, 1, 0, 1, 0, 1, 0]
            ],

            // 关卡 5: 爱心 ❤️
            [
                [0, 1, 1, 0, 0, 0, 0, 1, 1, 0],
                [1, 1, 1, 1, 0, 0, 1, 1, 1, 1],
                [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
                [0, 1, 1, 1, 1, 1, 1, 1, 1, 0],
                [0, 0, 0, 1, 1, 1, 1, 0, 0, 0]
            ],

            // 关卡 6: 波浪
            [
                [1, 1, 0, 0, 1, 1, 0, 0, 1, 1],
                [1, 1, 1, 0, 0, 1, 1, 0, 0, 1],
                [0, 1, 1, 1, 0, 0, 1, 1, 0, 0],
                [0, 0, 1, 1, 1, 0, 0, 1, 1, 0],
                [0, 0, 0, 1, 1, 1, 0, 0, 1, 1]
            ]
        ];

        // 循环使用图案（关卡超过图案数量时）
        const patternIndex = (level - 1) % patterns.length;
        return patterns[patternIndex];
    }

    // ===== 无尽模式方法 =====

    // 切换无尽模式
    toggleEndlessMode() {
        this.endlessMode = !this.endlessMode;
        this.updateEndlessModeUI();
        return this.endlessMode;
    }

    // 更新无尽模式 UI
    updateEndlessModeUI() {
        const btn = document.getElementById('endlessModeBtn');
        if (btn) {
            btn.textContent = this.endlessMode ? t('ui.endlessOn') : t('ui.endlessOff');
            btn.classList.toggle('active', this.endlessMode);
        }
    }

    // 更新无尽模式逻辑
    updateEndlessMode(deltaTime) {
        if (!this.endlessMode || this.gameState !== 'playing') return;

        this.endlessTimer += deltaTime;

        // 每隔一段时间生成新行
        if (this.endlessTimer >= this.endlessInterval) {
            this.endlessTimer = 0;
            this.spawnNewBrickRow();
        }
    }

    // 生成新的砖块行
    spawnNewBrickRow() {
        // 先将所有砖块下移一行
        this.pushBricksDown();

        // 在顶部生成新行
        for (let c = 0; c < CONFIG.brickColumnCount; c++) {
            const x = c * (CONFIG.brickWidth + CONFIG.brickPadding) + CONFIG.brickOffsetLeft;
            const y = CONFIG.brickOffsetTop;

            const isBomb = Math.random() < 0.1;
            const maxHits = Math.random() < 0.3 ? 2 : 1; // 30% 机率 2 血

            this.bricks[c][0] = {
                x: x,
                y: y,
                status: 1,
                color: BRICK_COLORS[Math.floor(Math.random() * BRICK_COLORS.length)],
                isBomb: isBomb,
                hits: isBomb ? 1 : maxHits,
                maxHits: isBomb ? 1 : maxHits
            };
        }

        // 播放音效
        this.sound.playBrickHit(0);
    }

    // 将所有砖块下移
    pushBricksDown() {
        const rowHeight = CONFIG.brickHeight + CONFIG.brickPadding;

        for (let c = 0; c < CONFIG.brickColumnCount; c++) {
            // 从下往上移动，避免覆盖
            for (let r = CONFIG.brickRowCount - 1; r > 0; r--) {
                this.bricks[c][r] = { ...this.bricks[c][r - 1] };
                this.bricks[c][r].y += rowHeight;

                // 检查是否超出安全区域（接近挡板）
                if (this.bricks[c][r].status === 1 &&
                    this.bricks[c][r].y + CONFIG.brickHeight > this.paddle.y - 50) {
                    // 砖块太低了，游戏结束
                    this.gameOver();
                    return;
                }
            }
        }
    }

    // ===== 结束无尽模式方法 =====

    initEventListeners() {
        // 键盘事件
        window.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft' || e.key === 'Left') {
                this.keys.left = true;
            } else if (e.key === 'ArrowRight' || e.key === 'Right') {
                this.keys.right = true;
            } else if (e.code === 'Space' || e.key === ' ' || e.keyCode === 32) {
                e.preventDefault();
                // 檢查是否有任何彈窗正在顯示中
                const scoreCard = document.getElementById('scoreCard');
                const settingsModal = document.getElementById('settingsModal');
                const helpModal = document.getElementById('helpModal');

                const isAnyModalVisible =
                    (scoreCard && !scoreCard.classList.contains('hidden')) ||
                    (settingsModal && !settingsModal.classList.contains('hidden')) ||
                    (helpModal && !helpModal.classList.contains('hidden'));

                // 如果有彈窗正在顯示，不觸發遊戲開始
                if (!isAnyModalVisible) {
                    this.toggleGame();
                }
            } else if (e.key === 'm' || e.key === 'M') {
                this.toggleSound();
            }
        });

        window.addEventListener('keyup', (e) => {
            if (e.key === 'ArrowLeft' || e.key === 'Left') {
                this.keys.left = false;
            } else if (e.key === 'ArrowRight' || e.key === 'Right') {
                this.keys.right = false;
            }
        });

        // ========== 觸控支援 ==========
        let touchStartX = 0;
        let isTouching = false;

        // 觸控開始
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            touchStartX = touch.clientX;
            isTouching = true;

            // 點擊 canvas 觸發遊戲開始/發射球
            if (this.gameState === 'idle' || this.gameState === 'gameover' || this.gameState === 'win') {
                this.toggleGame();
            } else if (this.gameState === 'playing') {
                const heldBall = this.balls.find(b => b.held);
                if (heldBall) {
                    heldBall.held = false; // 發射球
                }
            } else if (this.gameState === 'paused') {
                this.resumeGame();
            }
        }, { passive: false });

        // 觸控移動 - 直接跟隨手指位置
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (!isTouching) return;

            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;

            // 計算手指在 canvas 中的 X 位置
            const touchX = (touch.clientX - rect.left) * scaleX;

            // 將擋板中心移動到手指位置
            this.paddle.x = touchX - this.paddle.width / 2;

            // 邊界檢查
            if (this.paddle.x < 0) {
                this.paddle.x = 0;
            }
            if (this.paddle.x + this.paddle.width > CONFIG.canvasWidth) {
                this.paddle.x = CONFIG.canvasWidth - this.paddle.width;
            }
        }, { passive: false });

        // 觸控結束
        this.canvas.addEventListener('touchend', () => {
            isTouching = false;
        });

        // 防止頁面滾動干擾遊戲
        this.canvas.addEventListener('touchcancel', () => {
            isTouching = false;
        });

        // ========== 滑鼠支援（桌面觸控板）==========
        let isMouseDown = false;

        this.canvas.addEventListener('mousedown', (e) => {
            isMouseDown = true;
            // 點擊也可以開始遊戲
            if (this.gameState === 'idle' || this.gameState === 'gameover' || this.gameState === 'win') {
                this.toggleGame();
            } else if (this.gameState === 'playing') {
                const heldBall = this.balls.find(b => b.held);
                if (heldBall) {
                    heldBall.held = false;
                }
            }
        });

        this.canvas.addEventListener('mousemove', (e) => {
            if (!isMouseDown) return;

            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const mouseX = (e.clientX - rect.left) * scaleX;

            this.paddle.x = mouseX - this.paddle.width / 2;

            if (this.paddle.x < 0) this.paddle.x = 0;
            if (this.paddle.x + this.paddle.width > CONFIG.canvasWidth) {
                this.paddle.x = CONFIG.canvasWidth - this.paddle.width;
            }
        });

        this.canvas.addEventListener('mouseup', () => {
            isMouseDown = false;
        });

        this.canvas.addEventListener('mouseleave', () => {
            isMouseDown = false;
        });

        // Overlay 點擊/觸控事件（讓手機用戶可以開始遊戲）
        const overlay = document.getElementById('overlay');
        if (overlay) {
            overlay.addEventListener('click', () => {
                if (this.gameState === 'idle' || this.gameState === 'gameover' || this.gameState === 'win') {
                    this.toggleGame();
                } else if (this.gameState === 'paused') {
                    this.resumeGame();
                }
            });
        }

        // 開始按鈕點擊事件
        const startBtn = document.getElementById('startBtn');
        if (startBtn) {
            startBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // 防止觸發 overlay 的點擊事件
                if (this.gameState === 'idle' || this.gameState === 'gameover' || this.gameState === 'win') {
                    this.toggleGame();
                } else if (this.gameState === 'paused') {
                    this.resumeGame();
                }
            });
        }

        // 设置按钮点击事件
        const settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => this.showSettings());
        }

        // 关闭设置按钮点击事件
        const closeSettingsBtn = document.getElementById('closeSettingsBtn');
        if (closeSettingsBtn) {
            closeSettingsBtn.addEventListener('click', () => this.hideSettings());
        }

        // 语言设置按钮监听
        const settingLangBtn = document.getElementById('settingLangBtn');
        if (settingLangBtn) {
            settingLangBtn.addEventListener('click', () => this.toggleLanguage());
        }

        // 音效开关监听
        const soundCheck = document.getElementById('settingSoundCheck');
        if (soundCheck) {
            soundCheck.addEventListener('change', (e) => this.toggleSound(e.target.checked));
        }

        // 无尽模式开关监听
        const endlessCheck = document.getElementById('settingEndlessCheck');
        if (endlessCheck) {
            endlessCheck.addEventListener('change', (e) => this.toggleEndlessMode(e.target.checked));
        }

        // 清除数据按钮监听
        const clearDataBtn = document.getElementById('clearDataBtn');
        if (clearDataBtn) {
            clearDataBtn.addEventListener('click', () => this.clearData());
        }

        // 幫助按鈕點擊事件
        const helpBtn = document.getElementById('helpBtn');
        if (helpBtn) {
            helpBtn.addEventListener('click', () => this.showHelp());
        }

        // 關閉幫助按鈕點擊事件
        const closeHelpBtn = document.getElementById('closeHelpBtn');
        if (closeHelpBtn) {
            closeHelpBtn.addEventListener('click', () => this.hideHelp());
        }
    }

    showSettings() {
        const settingsModal = document.getElementById('settingsModal');
        if (settingsModal) {
            // 同步当前状态到 UI
            const soundCheck = document.getElementById('settingSoundCheck');
            if (soundCheck) soundCheck.checked = this.sound.enabled;

            const endlessCheck = document.getElementById('settingEndlessCheck');
            if (endlessCheck) endlessCheck.checked = this.endlessMode;

            // 更新语言按钮文本
            this.updateLanguageButton();

            settingsModal.classList.remove('hidden');

            // 暂停游戏
            if (this.gameState === 'playing') {
                this.pauseGame();
            }
        }
    }

    hideSettings() {
        const settingsModal = document.getElementById('settingsModal');
        if (settingsModal) {
            settingsModal.classList.add('hidden');
        }
    }

    toggleSound(enabled) {
        if (enabled !== undefined) {
            this.sound.enabled = enabled;
        } else {
            this.sound.toggle();
        }
        // Save preference could be added here
        localStorage.setItem('brickBreakerSound', this.sound.enabled);
    }

    toggleEndlessMode(enabled) {
        if (enabled !== undefined) {
            this.endlessMode = enabled;
        } else {
            this.endlessMode = !this.endlessMode;
        }
    }

    toggleLanguage() {
        // 切換語言
        currentLang = currentLang === 'zh-TW' ? 'en' : 'zh-TW';
        localStorage.setItem('brickBreakerLang', currentLang);

        // 更新所有 UI 文本
        this.updateAllUI();
        this.updateLanguageButton();
    }

    updateLanguageButton() {
        const btn = document.getElementById('settingLangBtn');
        if (btn) {
            // 显示当前语言名称
            btn.textContent = currentLang === 'zh-TW' ? '🌐 繁體中文' : '🌐 English';
        }
    }

    clearData() {
        if (confirm('確定要清除所有數據嗎？\nAre you sure you want to clear all data?')) {
            localStorage.clear();
            location.reload();
        }
    }

    showHelp() {
        const helpModal = document.getElementById('helpModal');
        if (helpModal) {
            helpModal.classList.remove('hidden');
            // 暫停遊戲（如果正在進行）
            if (this.gameState === 'playing') {
                this.pauseGame();
            }
        }
    }

    hideHelp() {
        const helpModal = document.getElementById('helpModal');
        if (helpModal) {
            helpModal.classList.add('hidden');
        }
    }

    updateAllUI() {
        // 更新所有帶 data-i18n 屬性的元素
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            el.textContent = t(key);
        });

        // 更新所有帶 data-i18n-html 屬性的元素（支援 HTML 內容）
        document.querySelectorAll('[data-i18n-html]').forEach(el => {
            const key = el.getAttribute('data-i18n-html');
            el.innerHTML = t(key);
        });

        // 更新所有帶 data-i18n-prefix 屬性的元素（保留前綴如 emoji）
        document.querySelectorAll('[data-i18n-prefix]').forEach(el => {
            const key = el.getAttribute('data-i18n-prefix');
            el.textContent = '🎮 ' + t(key);
        });

        // 更新所有帶 data-i18n-placeholder 屬性的 input 元素
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            el.placeholder = t(key);
        });


        // 更新 overlay 訊息（如果正在顯示）
        const overlayTitle = document.getElementById('overlayTitle');
        const overlayMessage = document.getElementById('overlayMessage');
        if (overlayTitle && !document.getElementById('overlay').classList.contains('hidden')) {
            // 根據當前遊戲狀態更新 overlay
            if (this.gameState === 'idle') {
                overlayTitle.textContent = t('messages.title');
                overlayMessage.textContent = t('messages.start');
            } else if (this.gameState === 'paused') {
                overlayTitle.textContent = t('messages.paused');
                overlayMessage.textContent = t('messages.pauseMsg');
            }
            // 其他狀態在各自的方法中處理
        }
    }

    toggleGame() {
        if (this.gameState === 'idle' || this.gameState === 'gameover' || this.gameState === 'win') {
            this.startGame();
        } else if (this.gameState === 'playing') {
            // 检查是否有球被吸附
            const heldBall = this.balls.find(b => b.held);
            if (heldBall) {
                heldBall.held = false; // 发射球
            } else {
                this.pauseGame();
            }
        } else if (this.gameState === 'paused') {
            this.resumeGame();
        }
    }

    startGame() {
        // 只有在 gameover 時才重置遊戲，win 時只需繼續
        if (this.gameState === 'gameover') {
            this.resetGame();
        }
        // win 狀態時，磚塊已經在 winGame() 中初始化了，只需開始遊戲
        this.gameState = 'playing';
        this.hideOverlay();

        // 初始化并播放开始音效
        this.sound.init();
        this.sound.playStart();
    }

    pauseGame() {
        this.gameState = 'paused';
        this.showOverlay(t('messages.paused'), t('messages.pauseMsg'));
    }

    resumeGame() {
        this.gameState = 'playing';
        this.hideOverlay();
    }

    resetGame() {
        this.score = 0;
        this.lives = 5;
        this.level = 1;
        this.combo = 0;
        this.currentBallSpeed = CONFIG.ballSpeed; // 重置球速
        this.maxCombo = 0;
        this.initPaddle();
        this.initBall();
        this.initBricks();
        this.particlePool.reset();
        this.shakeTime = 0;

        // 重置道具系统
        this.powerups = [];
        this.activePowerups = {};
        this.paddle.width = this.originalPaddleWidth;

        // 重置无尽模式计时器
        this.endlessTimer = 0;

        this.hideScoreCard();
        this.updateUI();
    }

    showOverlay(title, message) {
        const overlay = document.getElementById('overlay');
        document.getElementById('overlayTitle').textContent = title;
        document.getElementById('overlayMessage').textContent = message;
        overlay.classList.remove('hidden');
    }

    hideOverlay() {
        document.getElementById('overlay').classList.add('hidden');
    }

    updateUI() {
        document.getElementById('score').textContent = Math.floor(this.score);
        document.getElementById('lives').textContent = this.lives;
        document.getElementById('level').textContent = this.level;
        document.getElementById('combo').textContent = this.combo > 0 ? `x${this.combo}` : '-';
    }

    // 创建粒子效果
    createParticles(x, y, color, count = 8, isExplosion = false) {
        // 使用对象池
        const mainColor = typeof color === 'string' ? color : color.main;
        for (let i = 0; i < count; i++) {
            this.particlePool.spawn(x, y, mainColor, isExplosion);
        }
    }

    // 触发屏幕震动
    triggerShake(duration, magnitude) {
        this.shakeTime = duration;
        this.shakeMagnitude = magnitude;
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ?
            `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` :
            '255, 255, 255';
    }

    // ===== 道具系统方法 =====

    // 生成道具
    spawnPowerup(x, y) {
        if (Math.random() > POWERUP_DROP_CHANCE) return;

        const type = POWERUP_KEYS[Math.floor(Math.random() * POWERUP_KEYS.length)];
        this.powerups.push({
            x: x,
            y: y,
            type: type,
            ...POWERUP_TYPES[type]
        });
    }

    // 更新道具位置与碰撞
    updatePowerups() {
        for (let i = this.powerups.length - 1; i >= 0; i--) {
            const p = this.powerups[i];
            p.y += POWERUP_SPEED;

            // 碰撞检测：道具碰到挡板
            if (p.y + POWERUP_SIZE / 2 > this.paddle.y &&
                p.y - POWERUP_SIZE / 2 < this.paddle.y + this.paddle.height &&
                p.x > this.paddle.x &&
                p.x < this.paddle.x + this.paddle.width) {
                this.applyPowerup(p.type);
                this.powerups.splice(i, 1);
                this.sound.playPowerup();
                continue;
            }

            // 道具掉出画面
            if (p.y > CONFIG.canvasHeight + POWERUP_SIZE) {
                this.powerups.splice(i, 1);
            }
        }
    }

    // 套用道具效果
    applyPowerup(type) {
        const config = POWERUP_TYPES[type];

        switch (type) {
            case 'expand':
                this.paddle.width = this.originalPaddleWidth * 1.5;
                this.activePowerups.expand = config.duration;
                break;

            case 'shrink':
                this.paddle.width = this.originalPaddleWidth * 0.6;
                this.activePowerups.shrink = config.duration;
                break;

            case 'multiball':
                // 分裂成 3 球
                const currentBalls = [...this.balls];
                for (const ball of currentBalls) {
                    if (!ball.held) {
                        // 创建两个额外的球，往不同方向
                        const ball2 = { ...ball, dx: ball.speed * 0.7, dy: -ball.speed * 0.7 };
                        const ball3 = { ...ball, dx: -ball.speed * 0.7, dy: -ball.speed * 0.7 };
                        this.balls.push(ball2, ball3);
                    }
                }
                break;

            case 'pierce':
                this.balls.forEach(b => b.pierce = true);
                this.activePowerups.pierce = config.duration;
                break;

            case 'slow':
                this.balls.forEach(b => {
                    b.dx *= 0.5;
                    b.dy *= 0.5;
                    b.speed *= 0.5;
                });
                this.activePowerups.slow = config.duration;
                break;
        }
    }

    // 更新道具持续时间
    updateActivePowerups(deltaTime) {
        for (const type in this.activePowerups) {
            this.activePowerups[type] -= deltaTime;

            if (this.activePowerups[type] <= 0) {
                // 道具过期
                this.removePowerupEffect(type);
                delete this.activePowerups[type];
            }
        }
    }

    // 移除道具效果
    removePowerupEffect(type) {
        switch (type) {
            case 'expand':
            case 'shrink':
                this.paddle.width = this.originalPaddleWidth;
                break;

            case 'pierce':
                this.balls.forEach(b => b.pierce = false);
                break;

            case 'slow':
                this.balls.forEach(b => {
                    b.dx *= 2;
                    b.dy *= 2;
                    b.speed *= 2;
                });
                break;
        }
    }

    // 绘制道具
    drawPowerups() {
        for (const p of this.powerups) {
            // 绘制发光圆形背景
            this.ctx.save();
            this.ctx.shadowColor = p.color;
            this.ctx.shadowBlur = 15;

            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, POWERUP_SIZE / 2, 0, Math.PI * 2);
            this.ctx.fillStyle = p.color;
            this.ctx.fill();

            // 绘制 emoji
            this.ctx.shadowBlur = 0;
            this.ctx.font = '16px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(p.emoji, p.x, p.y);

            this.ctx.restore();
        }
    }

    // ===== 结束道具系统方法 =====

    // 更新挡板位置
    updatePaddle() {
        if (this.keys.left && this.paddle.x > 0) {
            this.paddle.x -= this.paddle.speed;
        }
        if (this.keys.right && this.paddle.x < CONFIG.canvasWidth - this.paddle.width) {
            this.paddle.x += this.paddle.speed;
        }
    }

    // 更新球位置（支持多球）
    updateBall() {
        for (let i = this.balls.length - 1; i >= 0; i--) {
            const ball = this.balls[i];

            // 如果球被抓住，跟隨擋板移動
            if (ball.held) {
                ball.x = this.paddle.x + this.paddle.width / 2;
                ball.y = this.paddle.y - ball.radius;
                continue;
            }

            ball.x += ball.dx;
            ball.y += ball.dy;

            // 左右边界碰撞
            if (ball.x - ball.radius < 0) {
                ball.x = ball.radius; // 修正位置
                ball.dx = Math.abs(ball.dx); // 確保向右
                this.sound.playWallHit();
            } else if (ball.x + ball.radius > CONFIG.canvasWidth) {
                ball.x = CONFIG.canvasWidth - ball.radius; // 修正位置
                ball.dx = -Math.abs(ball.dx); // 確保向左
                this.sound.playWallHit();
            }

            // 上边界碰撞
            if (ball.y - ball.radius < 0) {
                ball.y = ball.radius; // 修正位置
                ball.dy = Math.abs(ball.dy); // 確保向下
                this.sound.playWallHit();
            }

            // 下边界（球落出画面）
            if (ball.y + ball.radius > CONFIG.canvasHeight) {
                this.balls.splice(i, 1);

                // 如果没有球了，失去生命
                if (this.balls.length === 0) {
                    this.lives--;
                    this.updateUI();

                    if (this.lives <= 0) {
                        this.gameOver();
                    } else {
                        this.sound.playLoseLife();
                        this.resetBallAndPaddle();
                        this.gameState = 'paused';
                        this.showOverlay(`💔 失去一条生命`, `剩余 ${this.lives} 条生命  按空格键继续`);
                    }
                }
                continue;
            }

            // 挡板碰撞
            if (ball.y + ball.radius > this.paddle.y &&
                ball.y - ball.radius < this.paddle.y + this.paddle.height &&
                ball.x > this.paddle.x &&
                ball.x < this.paddle.x + this.paddle.width) {

                // 根据击中位置改变反弹角度
                const hitPos = (ball.x - this.paddle.x) / this.paddle.width;
                const angle = (hitPos - 0.5) * Math.PI * 0.6; // -54° 到 54°

                const speed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
                ball.dx = speed * Math.sin(angle);
                ball.dy = -Math.abs(speed * Math.cos(angle));

                // 確保有最小水平速度，防止純垂直運動
                const minDx = speed * 0.3; // 至少 30% 的速度是水平的
                if (Math.abs(ball.dx) < minDx) {
                    ball.dx = ball.dx >= 0 ? minDx : -minDx;
                }

                this.sound.playPaddleHit();
                this.combo = 0; // 碰到挡板，连击归零
                this.updateUI();
            }
        }

        // 更新 this.ball 引用（指向第一个球）
        this.ball = this.balls[0] || null;
    }

    // 砖块碰撞检测（支持多球）
    checkBrickCollision() {
        for (const ball of this.balls) {
            if (ball.held) continue;

            for (let c = 0; c < CONFIG.brickColumnCount; c++) {
                for (let r = 0; r < CONFIG.brickRowCount; r++) {
                    const brick = this.bricks[c][r];
                    if (brick.status === 1) {
                        if (ball.x > brick.x &&
                            ball.x < brick.x + CONFIG.brickWidth &&
                            ball.y > brick.y &&
                            ball.y < brick.y + CONFIG.brickHeight) {

                            // 如果不是穿透模式，反弹
                            if (!ball.pierce) {
                                ball.dy = -ball.dy;
                            }

                            // 处理击中逻辑
                            if (brick.isBomb) {
                                this.explodeBrick(c, r);
                            } else {
                                brick.hits--; // 减少血量

                                this.combo++; // 增加连击
                                if (this.combo > this.maxCombo) this.maxCombo = this.combo;
                                const points = 10 * (1 + (this.combo - 1) * 0.5); // 连击加分
                                this.score += points;

                                this.sound.playBrickHit(r);

                                // 创建小粒子效果（表示受击）
                                this.createParticles(
                                    brick.x + CONFIG.brickWidth / 2,
                                    brick.y + CONFIG.brickHeight / 2,
                                    brick.color,
                                    brick.hits > 0 ? 3 : 8 // 未破碎时粒子少
                                );

                                // 如果血量归零，销毁砖块
                                if (brick.hits <= 0) {
                                    brick.status = 0;

                                    // 生成道具（只在完全破坏时）
                                    this.spawnPowerup(
                                        brick.x + CONFIG.brickWidth / 2,
                                        brick.y + CONFIG.brickHeight / 2
                                    );
                                }
                            }

                            this.updateUI();

                            // 检查是否赢得游戏
                            if (this.checkWin()) {
                                this.winGame();
                            }
                        }
                    }
                }
            }
        }
    }

    // 炸弹爆炸逻辑
    explodeBrick(c, r) {
        const brick = this.bricks[c][r];
        if (brick.status === 0) return; // 防止重复爆炸

        brick.status = 0;
        this.combo++;
        if (this.combo > this.maxCombo) this.maxCombo = this.combo;
        this.score += 20 * (1 + (this.combo - 1) * 0.5); // 炸弹得分更高 + 连击

        // 视觉效果
        this.createParticles(
            brick.x + CONFIG.brickWidth / 2,
            brick.y + CONFIG.brickHeight / 2,
            '#ff4757',
            20,
            true
        );

        // 核心音效和震动
        this.sound.playExplosion();
        this.triggerShake(15, 10);

        // 检查周围 3x3 区域
        for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
                const nc = c + i;
                const nr = r + j;

                // 边界检查
                if (nc >= 0 && nc < CONFIG.brickColumnCount &&
                    nr >= 0 && nr < CONFIG.brickRowCount) {

                    const neighbor = this.bricks[nc][nr];
                    if (neighbor.status === 1) {
                        if (neighbor.isBomb) {
                            // 延时触发连环爆炸，更有节奏感
                            setTimeout(() => this.explodeBrick(nc, nr), 100);
                        } else {
                            // 摧毁普通砖块
                            neighbor.status = 0;
                            this.score += 10 * (1 + (this.combo - 1) * 0.5);
                            this.createParticles(
                                neighbor.x + CONFIG.brickWidth / 2,
                                neighbor.y + CONFIG.brickHeight / 2,
                                neighbor.color,
                                5
                            );
                        }
                    }
                }
            }
        }
    }

    checkWin() {
        for (let c = 0; c < CONFIG.brickColumnCount; c++) {
            for (let r = 0; r < CONFIG.brickRowCount; r++) {
                if (this.bricks[c][r].status === 1) {
                    return false;
                }
            }
        }
        return true;
    }

    resetBallAndPaddle() {
        this.initPaddle();
        this.initBall();
    }

    gameOver() {
        this.gameState = 'gameover';
        this.updateHighScore();
        this.sound.playGameOver();
        this.hideOverlay();
        this.showScoreCard('💀 游戏结束');
    }

    winGame() {
        this.level++;
        this.updateHighScore();

        // 增加难度：每过一关速度增加 0.2，上限為 7
        this.currentBallSpeed = Math.min(this.currentBallSpeed + 0.2, CONFIG.maxBallSpeed);

        // 进入下一关
        this.initBricks();
        this.resetBallAndPaddle();
        this.particlePool.reset();

        this.updateUI();
        this.sound.playLevelComplete();
        this.showOverlay(`🎉 第 ${this.level - 1} 关完成!`, '按空格键进入下一关');
        this.gameState = 'win';
    }

    updateHighScore() {
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('brickBreakerHighScore', this.highScore);
            document.getElementById('highScore').textContent = this.highScore;
        }
    }

    // 显示成绩卡片
    showScoreCard(title) {
        const card = document.getElementById('scoreCard');
        document.getElementById('cardTitle').textContent = title;
        document.getElementById('cardScore').textContent = Math.floor(this.score).toLocaleString();
        document.getElementById('cardMaxCombo').textContent = this.maxCombo > 0 ? `x${this.maxCombo}` : '-';
        document.getElementById('cardHighScore').textContent = Math.floor(this.highScore).toLocaleString();

        // 获取种子日期
        const today = new Date();
        const seedStr = `#${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
        document.getElementById('cardSeed').textContent = seedStr;

        card.classList.remove('hidden');

        // 绑定按钮
        document.getElementById('playAgainBtn').onclick = () => {
            this.hideScoreCard();
            this.resetGame();
            this.gameState = 'idle';
            this.showOverlay('打砖块', '按空格键开始游戏');
        };
        document.getElementById('shareBtn').onclick = () => this.shareScore();

        // 排行榜相关按钮
        document.getElementById('saveScoreBtn').onclick = () => {
            const name = document.getElementById('playerName').value;
            this.saveToLeaderboard(name);
        };
        document.getElementById('viewLeaderboardBtn').onclick = () => this.showLeaderboard();
        document.getElementById('closeLeaderboardBtn').onclick = () => this.hideLeaderboard();

        // 重置名字输入区域
        document.getElementById('nameInputSection').style.display = 'flex';
        document.getElementById('playerName').value = '';
    }

    // 隐藏成绩卡片
    hideScoreCard() {
        document.getElementById('scoreCard').classList.add('hidden');
        document.getElementById('shareHint').classList.add('hidden');
        document.getElementById('saveHint').classList.add('hidden');
    }

    // 复制成绩
    shareScore() {
        const today = new Date();
        const seedStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;

        const text = `💣 Brick Breaker Daily #${seedStr}
🏆 Score: ${Math.floor(this.score).toLocaleString()}
🔥 Max Combo: x${this.maxCombo}
🎮 Play now: https://chinggpt2025.github.io/brick-breaker/`;

        navigator.clipboard.writeText(text).then(() => {
            document.getElementById('shareHint').classList.remove('hidden');
            setTimeout(() => {
                document.getElementById('shareHint').classList.add('hidden');
            }, 2000);
        });
    }

    // 保存成绩到排行榜 (Supabase)
    async saveToLeaderboard(name) {
        const today = new Date();
        const seedStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;

        try {
            const { error } = await supabase
                .from('scores')
                .insert({
                    player_name: name.trim() || '匿名玩家',
                    score: Math.floor(this.score),
                    max_combo: this.maxCombo,
                    seed: seedStr
                });

            if (error) throw error;

            // 显示提示
            document.getElementById('saveHint').classList.remove('hidden');
            document.getElementById('nameInputSection').style.display = 'none';
            setTimeout(() => {
                document.getElementById('saveHint').classList.add('hidden');
            }, 2000);
        } catch (err) {
            console.error('保存失败:', err);
            alert('保存失败，请检查网络连接');
        }
    }

    // 获取排行榜 (Supabase)
    async getLeaderboard() {
        const today = new Date();
        const seedStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;

        try {
            const { data, error } = await supabase
                .from('scores')
                .select('player_name, score, max_combo')
                .eq('seed', seedStr)
                .order('score', { ascending: false })
                .limit(10);

            if (error) throw error;
            return data || [];
        } catch (err) {
            console.error('获取排行榜失败:', err);
            return [];
        }
    }

    // 显示排行榜 (async)
    async showLeaderboard() {
        const today = new Date();
        const seedStr = `#${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;

        document.getElementById('leaderboardSeed').textContent = seedStr;

        const list = document.getElementById('leaderboardList');
        list.innerHTML = '<li class="leaderboard-empty">加载中...</li>';
        document.getElementById('leaderboardModal').classList.remove('hidden');

        const leaderboard = await this.getLeaderboard();

        if (leaderboard.length === 0) {
            list.innerHTML = '<li class="leaderboard-empty">暂无记录，成为第一名吧！</li>';
        } else {
            list.innerHTML = leaderboard.map((entry, index) => `
                <li>
                    <span class="rank">${index + 1}.</span>
                    <span class="name">${entry.player_name}</span>
                    <span class="lb-score">${entry.score.toLocaleString()}</span>
                </li>
            `).join('');
        }
    }

    // 隐藏排行榜
    hideLeaderboard() {
        document.getElementById('leaderboardModal').classList.add('hidden');
    }

    // 绘制挡板
    drawPaddle() {
        const gradient = this.ctx.createLinearGradient(
            this.paddle.x, this.paddle.y,
            this.paddle.x, this.paddle.y + this.paddle.height
        );
        gradient.addColorStop(0, '#74b9ff');
        gradient.addColorStop(0.5, '#0984e3');
        gradient.addColorStop(1, '#0652DD');

        // 挡板主体
        this.ctx.beginPath();
        this.ctx.roundRect(this.paddle.x, this.paddle.y, this.paddle.width, this.paddle.height, 8);
        this.ctx.fillStyle = gradient;
        this.ctx.fill();

        // 挡板高光
        this.ctx.beginPath();
        this.ctx.roundRect(this.paddle.x + 5, this.paddle.y + 2, this.paddle.width - 10, 4, 2);
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.fill();
    }

    // 绘制球（支持多球）
    drawBall() {
        for (const ball of this.balls) {
            // 球的阴影
            this.ctx.beginPath();
            this.ctx.arc(ball.x + 3, ball.y + 3, ball.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            this.ctx.fill();

            // 球的渐变（穿透模式时显示黄色发光）
            let gradient;
            if (ball.pierce) {
                gradient = this.ctx.createRadialGradient(
                    ball.x - 3, ball.y - 3, 0,
                    ball.x, ball.y, ball.radius
                );
                gradient.addColorStop(0, '#fff');
                gradient.addColorStop(0.3, '#feca57');
                gradient.addColorStop(1, '#ff9f43');

                // 穿透发光效果
                this.ctx.save();
                this.ctx.shadowColor = '#feca57';
                this.ctx.shadowBlur = 15;
            } else {
                gradient = this.ctx.createRadialGradient(
                    ball.x - 3, ball.y - 3, 0,
                    ball.x, ball.y, ball.radius
                );
                gradient.addColorStop(0, '#fff');
                gradient.addColorStop(0.3, '#ffeaa7');
                gradient.addColorStop(1, '#fdcb6e');
            }

            this.ctx.beginPath();
            this.ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = gradient;
            this.ctx.fill();

            if (ball.pierce) {
                this.ctx.restore();
            }
        }
    }

    // 绘制砖块
    drawBricks() {
        for (let c = 0; c < CONFIG.brickColumnCount; c++) {
            for (let r = 0; r < CONFIG.brickRowCount; r++) {
                const brick = this.bricks[c][r];
                if (brick.status === 1) {
                    // 砖块渐变
                    const gradient = this.ctx.createLinearGradient(
                        brick.x, brick.y,
                        brick.x, brick.y + CONFIG.brickHeight
                    );
                    gradient.addColorStop(0, brick.color.light);
                    gradient.addColorStop(0.5, brick.color.main);
                    gradient.addColorStop(1, brick.color.dark);

                    // 砖块主体
                    this.ctx.beginPath();
                    this.ctx.roundRect(brick.x, brick.y, CONFIG.brickWidth, CONFIG.brickHeight, 4);
                    this.ctx.fillStyle = gradient;
                    this.ctx.fill();

                    // 砖块边框
                    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
                    this.ctx.lineWidth = 1;
                    this.ctx.stroke();

                    // 砖块高光
                    this.ctx.beginPath();
                    this.ctx.roundRect(brick.x + 3, brick.y + 2, CONFIG.brickWidth - 6, 6, 2);
                    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
                    this.ctx.fill();

                    // 显示血量指示器（如果是多血砖块）
                    if (brick.maxHits > 1 && !brick.isBomb) {
                        // 根据剩余血量显示裂痕
                        const damageRatio = 1 - (brick.hits / brick.maxHits);

                        if (damageRatio > 0) {
                            this.ctx.save();
                            this.ctx.globalAlpha = damageRatio * 0.6;
                            this.ctx.strokeStyle = '#000';
                            this.ctx.lineWidth = 2;

                            // 绘制裂痕
                            const cx = brick.x + CONFIG.brickWidth / 2;
                            const cy = brick.y + CONFIG.brickHeight / 2;

                            this.ctx.beginPath();
                            this.ctx.moveTo(cx - 10, cy - 5);
                            this.ctx.lineTo(cx, cy);
                            this.ctx.lineTo(cx + 8, cy - 8);
                            this.ctx.moveTo(cx, cy);
                            this.ctx.lineTo(cx + 5, cy + 6);
                            this.ctx.stroke();

                            this.ctx.restore();
                        }

                        // 显示血量数字
                        this.ctx.font = 'bold 12px Arial';
                        this.ctx.textAlign = 'center';
                        this.ctx.textBaseline = 'middle';
                        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                        this.ctx.fillText(
                            brick.hits.toString(),
                            brick.x + CONFIG.brickWidth / 2,
                            brick.y + CONFIG.brickHeight / 2
                        );
                    }

                    // 绘制炸弹图标
                    if (brick.isBomb) {
                        this.ctx.font = '16px Arial';
                        this.ctx.textAlign = 'center';
                        this.ctx.textBaseline = 'middle';
                        this.ctx.fillText('💣', brick.x + CONFIG.brickWidth / 2, brick.y + CONFIG.brickHeight / 2 + 2);
                    }
                }
            }
        }
    }

    // 绘制背景
    drawBackground() {
        // 网格线
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        this.ctx.lineWidth = 1;

        for (let x = 0; x < CONFIG.canvasWidth; x += 40) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, CONFIG.canvasHeight);
            this.ctx.stroke();
        }

        for (let y = 0; y < CONFIG.canvasHeight; y += 40) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(CONFIG.canvasWidth, y);
            this.ctx.stroke();
        }
    }

    // 游戏主循环
    gameLoop() {
        // 计算 deltaTime
        const now = performance.now();
        const deltaTime = now - this.lastTime;
        this.lastTime = now;

        // 清除画布
        this.ctx.clearRect(0, 0, CONFIG.canvasWidth, CONFIG.canvasHeight);

        // 应用屏幕震动
        this.ctx.save();
        if (this.shakeTime > 0) {
            const dx = (Math.random() - 0.5) * this.shakeMagnitude;
            const dy = (Math.random() - 0.5) * this.shakeMagnitude;
            this.ctx.translate(dx, dy);
            this.shakeTime--;
        }

        // 绘制背景
        this.drawBackground();

        // 绘制和更新粒子（使用对象池）
        this.particlePool.updateAndDraw(this.ctx, this.hexToRgb);

        // 绘制游戏对象
        this.drawBricks();
        this.drawPaddle();
        this.drawBall();
        this.drawPowerups(); // 绘制道具

        this.ctx.restore(); // 恢复坐标系

        // 如果游戏正在进行中，更新游戏逻辑
        if (this.gameState === 'playing') {
            this.updatePaddle();
            this.updateBall();
            this.checkBrickCollision();
            this.updatePowerups(); // 更新道具位置
            this.updateActivePowerups(deltaTime); // 更新道具计时器
            this.updateEndlessMode(deltaTime); // 更新无尽模式
        }

        // 继续游戏循环
        requestAnimationFrame(() => this.gameLoop());
    }
}

// 启动游戏
window.addEventListener('load', () => {
    new BrickBreakerGame();
});
