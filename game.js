// 游戏配置
const CONFIG = {
    canvasWidth: 800,
    canvasHeight: 600,
    paddleWidth: 120,
    paddleHeight: 15,
    paddleSpeed: 10,
    ballRadius: 10,
    ballSpeed: 5,
    brickRowCount: 5,
    brickColumnCount: 10,
    brickWidth: 68,
    brickHeight: 25,
    brickPadding: 8,
    brickOffsetTop: 50,
    brickOffsetLeft: 24
};

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
const POWERUP_DROP_CHANCE = 0.15; // 15% 掉落机率
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

        // 初始化事件监听
        this.initEventListeners();

        // 更新显示
        this.updateUI();
        document.getElementById('highScore').textContent = this.highScore;

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
        return {
            x: CONFIG.canvasWidth / 2,
            y: CONFIG.canvasHeight - 60,
            radius: CONFIG.ballRadius,
            dx: CONFIG.ballSpeed * (Math.random() > 0.5 ? 1 : -1),
            dy: -CONFIG.ballSpeed,
            speed: CONFIG.ballSpeed,
            held: held,
            pierce: false // 穿透状态
        };
    }

    initBricks() {
        this.bricks = [];
        for (let c = 0; c < CONFIG.brickColumnCount; c++) {
            this.bricks[c] = [];
            for (let r = 0; r < CONFIG.brickRowCount; r++) {
                const x = c * (CONFIG.brickWidth + CONFIG.brickPadding) + CONFIG.brickOffsetLeft;
                const y = r * (CONFIG.brickHeight + CONFIG.brickPadding) + CONFIG.brickOffsetTop;

                // 根据行数决定血量：前2行1血，中间2行2血，最后1行3血
                let maxHits = 1;
                if (r >= 2 && r < 4) maxHits = 2;
                if (r >= 4) maxHits = 3;

                // 炸弹砖只有1血
                const isBomb = this.rng.nextFloat() < 0.1;

                this.bricks[c][r] = {
                    x: x,
                    y: y,
                    status: 1, // 1 = 存在, 0 = 被击碎
                    color: BRICK_COLORS[r % BRICK_COLORS.length],
                    isBomb: isBomb,
                    hits: isBomb ? 1 : maxHits, // 当前血量
                    maxHits: isBomb ? 1 : maxHits // 最大血量（用于显示）
                };
            }
        }
    }

    initEventListeners() {
        // 键盘事件
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft' || e.key === 'Left') {
                this.keys.left = true;
            } else if (e.key === 'ArrowRight' || e.key === 'Right') {
                this.keys.right = true;
            } else if (e.key === ' ' || e.key === 'Spacebar') {
                e.preventDefault();
                this.toggleGame();
            } else if (e.key === 'm' || e.key === 'M') {
                this.toggleSound();
            }
        });

        document.addEventListener('keyup', (e) => {
            if (e.key === 'ArrowLeft' || e.key === 'Left') {
                this.keys.left = false;
            } else if (e.key === 'ArrowRight' || e.key === 'Right') {
                this.keys.right = false;
            }
        });

        // 音效按钮点击事件
        const soundBtn = document.getElementById('soundToggle');
        if (soundBtn) {
            soundBtn.addEventListener('click', () => this.toggleSound());
        }
    }

    toggleSound() {
        const enabled = this.sound.toggle();
        const soundBtn = document.getElementById('soundToggle');
        if (soundBtn) {
            soundBtn.textContent = enabled ? '🔊 音效' : '🔇 静音';
            soundBtn.classList.toggle('muted', !enabled);
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
        if (this.gameState === 'gameover' || this.gameState === 'win') {
            this.resetGame();
        }
        this.gameState = 'playing';
        this.hideOverlay();

        // 初始化并播放开始音效
        this.sound.init();
        this.sound.playStart();
    }

    pauseGame() {
        this.gameState = 'paused';
        this.showOverlay('暂停', '按空格键继续');
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
            if (ball.x - ball.radius < 0 || ball.x + ball.radius > CONFIG.canvasWidth) {
                ball.dx = -ball.dx;
                this.sound.playWallHit();
            }

            // 上边界碰撞
            if (ball.y - ball.radius < 0) {
                ball.dy = -ball.dy;
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

        // 进入下一关
        this.initBricks();
        this.resetBallAndPaddle();
        this.particlePool.reset();

        // 增加难度
        this.ball.speed = CONFIG.ballSpeed + (this.level - 1) * 0.5;

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
        }

        // 继续游戏循环
        requestAnimationFrame(() => this.gameLoop());
    }
}

// 启动游戏
window.addEventListener('load', () => {
    new BrickBreakerGame();
});
