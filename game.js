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
        this.combo = 0; // 连击数
        this.score = 0;
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
        this.ball = {
            x: CONFIG.canvasWidth / 2,
            y: CONFIG.canvasHeight - 60,
            radius: CONFIG.ballRadius,
            dx: CONFIG.ballSpeed * (Math.random() > 0.5 ? 1 : -1),
            dy: -CONFIG.ballSpeed,
            speed: CONFIG.ballSpeed
        };
    }

    initBricks() {
        this.bricks = [];
        for (let c = 0; c < CONFIG.brickColumnCount; c++) {
            this.bricks[c] = [];
            for (let r = 0; r < CONFIG.brickRowCount; r++) {
                const x = c * (CONFIG.brickWidth + CONFIG.brickPadding) + CONFIG.brickOffsetLeft;
                const y = r * (CONFIG.brickHeight + CONFIG.brickPadding) + CONFIG.brickOffsetTop;
                this.bricks[c][r] = {
                    x: x,
                    y: y,
                    status: 1, // 1 = 存在, 0 = 被击碎
                    color: BRICK_COLORS[r % BRICK_COLORS.length],
                    isBomb: this.rng.nextFloat() < 0.1 // 使用种子随机数
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
            this.pauseGame();
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
        this.lives = 3;
        this.level = 1;
        this.combo = 0;
        this.initPaddle();
        this.initBall();
        // 重置种子，确保每局开始炸弹位置一致（可选，或者每关不同）
        // 这里不重置种子，让后续关卡保持随机性但在一局内固定
        this.initBricks();
        this.particlePool.reset();
        this.shakeTime = 0;
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

    // 更新挡板位置
    updatePaddle() {
        if (this.keys.left && this.paddle.x > 0) {
            this.paddle.x -= this.paddle.speed;
        }
        if (this.keys.right && this.paddle.x < CONFIG.canvasWidth - this.paddle.width) {
            this.paddle.x += this.paddle.speed;
        }
    }

    // 更新球位置
    updateBall() {
        this.ball.x += this.ball.dx;
        this.ball.y += this.ball.dy;

        // 左右边界碰撞
        if (this.ball.x - this.ball.radius < 0 || this.ball.x + this.ball.radius > CONFIG.canvasWidth) {
            this.ball.dx = -this.ball.dx;
            this.sound.playWallHit();
        }

        // 上边界碰撞
        if (this.ball.y - this.ball.radius < 0) {
            this.ball.dy = -this.ball.dy;
            this.sound.playWallHit();
        }

        // 下边界（失去生命）
        if (this.ball.y + this.ball.radius > CONFIG.canvasHeight) {
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

        // 挡板碰撞
        if (this.ball.y + this.ball.radius > this.paddle.y &&
            this.ball.y - this.ball.radius < this.paddle.y + this.paddle.height &&
            this.ball.x > this.paddle.x &&
            this.ball.x < this.paddle.x + this.paddle.width) {

            // 根据击中位置改变反弹角度
            const hitPos = (this.ball.x - this.paddle.x) / this.paddle.width;
            const angle = (hitPos - 0.5) * Math.PI * 0.6; // -54° 到 54°

            const speed = Math.sqrt(this.ball.dx * this.ball.dx + this.ball.dy * this.ball.dy);
            this.ball.dx = speed * Math.sin(angle);
            this.ball.dy = -Math.abs(speed * Math.cos(angle));

            this.sound.playPaddleHit();
            this.combo = 0; // 碰到挡板，连击归零
            this.updateUI();
        }
    }

    // 砖块碰撞检测
    checkBrickCollision() {
        for (let c = 0; c < CONFIG.brickColumnCount; c++) {
            for (let r = 0; r < CONFIG.brickRowCount; r++) {
                const brick = this.bricks[c][r];
                if (brick.status === 1) {
                    if (this.ball.x > brick.x &&
                        this.ball.x < brick.x + CONFIG.brickWidth &&
                        this.ball.y > brick.y &&
                        this.ball.y < brick.y + CONFIG.brickHeight) {

                        this.ball.dy = -this.ball.dy;

                        // 处理击中逻辑
                        if (brick.isBomb) {
                            this.explodeBrick(c, r);
                        } else {
                            brick.status = 0;
                            this.combo++; // 增加连击
                            const points = 10 * (1 + (this.combo - 1) * 0.5); // 连击加分
                            this.score += points;

                            this.sound.playBrickHit(r);
                            this.createParticles(
                                brick.x + CONFIG.brickWidth / 2,
                                brick.y + CONFIG.brickHeight / 2,
                                brick.color
                            );
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

    // 炸弹爆炸逻辑
    explodeBrick(c, r) {
        const brick = this.bricks[c][r];
        if (brick.status === 0) return; // 防止重复爆炸

        brick.status = 0;
        this.combo++;
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
        this.showOverlay('游戏结束', `最终分数: ${this.score}  按空格键重新开始`);
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

    // 绘制球
    drawBall() {
        // 球的阴影
        this.ctx.beginPath();
        this.ctx.arc(this.ball.x + 3, this.ball.y + 3, this.ball.radius, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.fill();

        // 球的渐变
        const gradient = this.ctx.createRadialGradient(
            this.ball.x - 3, this.ball.y - 3, 0,
            this.ball.x, this.ball.y, this.ball.radius
        );
        gradient.addColorStop(0, '#fff');
        gradient.addColorStop(0.3, '#ffeaa7');
        gradient.addColorStop(1, '#fdcb6e');

        this.ctx.beginPath();
        this.ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
        this.ctx.fillStyle = gradient;
        this.ctx.fill();
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

        this.ctx.restore(); // 恢复坐标系

        // 如果游戏正在进行中，更新游戏逻辑
        if (this.gameState === 'playing') {
            this.updatePaddle();
            this.updateBall();
            this.checkBrickCollision();
        }

        // 继续游戏循环
        requestAnimationFrame(() => this.gameLoop());
    }
}

// 启动游戏
window.addEventListener('load', () => {
    new BrickBreakerGame();
});
