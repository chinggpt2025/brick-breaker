/**
 * Brick Breaker - Main Game Logic
 * 
 * Dependencies (loaded via separate scripts in order):
 *   - config.js: CONFIG, LANGUAGES, ACHIEVEMENTS, BGM_THEMES, BRICK_COLORS, POWERUP_TYPES, t()
 *   - SoundManager.js: SoundManager class & soundManager instance
 *   - ParticleSystem.js: ParticlePool class
 *   - AchievementSystem.js: PlayerStats class
 */

// Supabase 配置
const SUPABASE_URL = 'https://ruqsvvefpemqptnsyymj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1cXN2dmVmcGVtcXB0bnN5eW1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyNDg5ODMsImV4cCI6MjA4MDgyNDk4M30.j9rRy7bgkKh50bhDdkil1UoP1kBAQFDTVgfkHnViH4Q';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===========================
// Mobile Scaling Manager
// ===========================
class MobileScalingManager {
    constructor() {
        this.container = document.querySelector('.game-container');
        this.landscapeTargetW = 1280;
        this.landscapeTargetH = 800;
        this.portraitTargetW = 900;
        this.scaleThreshold = 1400;

        this._boundHandleResize = this.handleResize.bind(this);
        this._boundHandleOrientationChange = this.handleOrientationChange.bind(this);

        this.init();
    }

    init() {
        if (!this.container) return;

        window.addEventListener('resize', this._boundHandleResize);
        window.addEventListener('orientationchange', this._boundHandleOrientationChange);
        window.addEventListener('load', this._boundHandleResize);

        // Initial scaling
        this.handleResize();
    }

    handleResize() {
        if (!this.container) return;

        const isLandscape = window.innerWidth > window.innerHeight;
        let scale = 1;

        if (isLandscape) {
            // LANDSCAPE: Fit to Height primarily (Cinema Mode)
            const scaleW = window.innerWidth / this.landscapeTargetW;
            const scaleH = window.innerHeight / this.landscapeTargetH;
            scale = Math.min(scaleW, scaleH) * 0.96; // 0.96 for minimal margins
        } else {
            // PORTRAIT: Fit to Width
            scale = window.innerWidth / this.portraitTargetW;
            scale = Math.max(scale, 0.35);
        }

        // Apply Scale if window is smaller than target
        if (window.innerWidth < this.scaleThreshold) {
            // Fix: Remove translateX(-50%) because Flexbox handles centering
            this.container.style.transform = `scale(${scale})`;
            this.container.style.transformOrigin = 'top center';
        } else {
            this.container.style.transform = '';
            this.container.style.transformOrigin = '';
        }
    }

    handleOrientationChange() {
        // Delay to allow browser to complete orientation change
        setTimeout(() => this.handleResize(), 200);
    }

    destroy() {
        window.removeEventListener('resize', this._boundHandleResize);
        window.removeEventListener('orientationchange', this._boundHandleOrientationChange);
    }
}

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
        return this.nextInt() / (this.m - 1);
    }
}

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
        this.lives = CONFIG.lives;
        this.consecutiveLosses = 0; // 追蹤連續失敗次數
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

        // 護盾系統
        this.shield = { active: false, y: 0, height: 0, timeLeft: 0 };

        // 炸彈連鎖計數器
        this.pendingExplosions = 0;

        // 冰凍效果狀態
        this.freezeActive = false;

        // 評級系統變數
        this.currentRank = null;      // 當前評級
        this.bestRanks = {};           // 每關最佳評級 {level: rank}
        this.missCount = 0;            // 失誤次數（失去生命）
        this.loadBestRanks();          // 從 localStorage 載入

        // 浮動文字效果
        this.floatingTexts = [];
        this.fireworkTimer = 0;

        // 閒置掉落系統（2秒未撞擊磚塊，掉3個道具）
        this.lastBrickHitTime = performance.now();
        this.idleDropTriggered = false;

        // 初始化能力和成就
        this.playerStats = new PlayerStats(this);

        // Boss 系統
        this.bossManager = new BossManager(this);

        // 菁英磚塊系統 (Elite Bricks)
        this.eliteBricks = [];           // 菁英磚塊陣列
        this.eliteProjectiles = [];      // 菁英磚塊投射物 (火球等)
        this.eliteFlashTimer = 0;        // 閃電閃屏計時器
        this.eliteSlowTimer = 0;         // 玩家減速計時器

        // 遊戲通關標記
        this.gameCompleted = false;      // 打敗 3 個 Boss 後為 true
        this.bossDefeatedHandled = false; // 防止 Boss 擊敗 Toast 重複顯示

        // 綁定事件處理器（用於後續移除）
        this._boundHandlers = {
            keydown: this._handleKeyDown.bind(this),
            keyup: this._handleKeyUp.bind(this),
            touchstart: this._handleTouchStart.bind(this),
            touchmove: this._handleTouchMove.bind(this),
            touchend: this._handleTouchEnd.bind(this),
            mousedown: this._handleMouseDown.bind(this),
            mousemove: this._handleMouseMove.bind(this),
            mouseup: this._handleMouseUp.bind(this)
        };

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

    // ========== 私有事件處理器（可移除）==========
    _handleKeyDown(e) {
        if (e.key === 'ArrowLeft' || e.key === 'Left') {
            this.keys.left = true;
        } else if (e.key === 'ArrowRight' || e.key === 'Right') {
            this.keys.right = true;
        } else if (e.code === 'Space' || e.key === ' ' || e.keyCode === 32) {
            e.preventDefault();
            this.sound.init(); // ✅ 確保使用者互動解鎖音效

            // 接關畫面優先處理
            if (this.isContinueActive) {
                this.continueGame();
                return;
            }

            const scoreCard = document.getElementById('scoreCard');
            const settingsModal = document.getElementById('settingsModal');
            const helpModal = document.getElementById('helpModal');
            const isAnyModalVisible =
                (scoreCard && !scoreCard.classList.contains('hidden')) ||
                (settingsModal && !settingsModal.classList.contains('hidden')) ||
                (helpModal && !helpModal.classList.contains('hidden'));
            if (!isAnyModalVisible) {
                this.toggleGame();
            }
        } else if (e.key === 'm' || e.key === 'M') {
            this.toggleSound();
        }
    }

    _handleKeyUp(e) {
        if (e.key === 'ArrowLeft' || e.key === 'Left') {
            this.keys.left = false;
        } else if (e.key === 'ArrowRight' || e.key === 'Right') {
            this.keys.right = false;
        }
    }

    _handleTouchStart(e) {
        // e.preventDefault(); // 移除這行，允許瀏覽器默認行為（如全螢幕手勢），但在 canvas 上可能會導致捲動
        // 為了防止畫面捲動，我們在 style.css 中對 canvas 使用了 touch-action: none

        this._isTouching = true;
        this.sound.init(); // ✅ 確保觸控解鎖音效
        const touch = e.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        this.touchX = touch.clientX - rect.left;

        if (this.isContinueActive) {
            this.continueGame();
            return;
        }

        if (this.gameState === 'idle' || this.gameState === 'gameover' || this.gameState === 'win') {
            this.startGame();
        } else if (this.gameState === 'playing') {
            const heldBall = this.balls.find(b => b.held);
            if (heldBall) heldBall.held = false;
        } else if (this.gameState === 'paused') {
            this.resumeGame();
        }
    }

    _handleTouchMove(e) {
        e.preventDefault();
        if (!this._isTouching) return;
        const touch = e.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const touchX = (touch.clientX - rect.left) * scaleX;
        this.paddle.x = touchX - this.paddle.width / 2;
        if (this.paddle.x < 0) this.paddle.x = 0;
        if (this.paddle.x + this.paddle.width > CONFIG.canvasWidth) {
            this.paddle.x = CONFIG.canvasWidth - this.paddle.width;
        }
    }

    _handleTouchEnd() {
        this._isTouching = false;
    }

    _handleMouseDown(e) {
        this._isMouseDown = true;
        this.sound.init(); // ✅ 確保滑鼠點擊解鎖音效
        if (this.gameState === 'idle' || this.gameState === 'gameover' || this.gameState === 'win') {
            this.toggleGame();
        } else if (this.gameState === 'playing') {
            const heldBall = this.balls.find(b => b.held);
            if (heldBall) heldBall.held = false;
        }
    }

    _handleMouseMove(e) {
        if (!this._isMouseDown) return;
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const mouseX = (e.clientX - rect.left) * scaleX;
        this.paddle.x = mouseX - this.paddle.width / 2;
        if (this.paddle.x < 0) this.paddle.x = 0;
        if (this.paddle.x + this.paddle.width > CONFIG.canvasWidth) {
            this.paddle.x = CONFIG.canvasWidth - this.paddle.width;
        }
    }

    _handleMouseUp() {
        this._isMouseDown = false;
    }

    // ========== 銷毀方法（清理事件監聽器）==========
    destroy() {
        // 移除 window 級事件
        window.removeEventListener('keydown', this._boundHandlers.keydown);
        window.removeEventListener('keyup', this._boundHandlers.keyup);

        // 移除 window 觸控事件
        window.removeEventListener('touchstart', this._boundHandlers.touchstart);
        window.removeEventListener('touchmove', this._boundHandlers.touchmove);
        window.removeEventListener('touchend', this._boundHandlers.touchend);
        window.removeEventListener('touchcancel', this._boundHandlers.touchend);

        // 移除 canvas 級事件
        this.canvas.removeEventListener('mousedown', this._boundHandlers.mousedown);
        this.canvas.removeEventListener('mousemove', this._boundHandlers.mousemove);
        this.canvas.removeEventListener('mouseup', this._boundHandlers.mouseup);
        this.canvas.removeEventListener('mouseleave', this._boundHandlers.mouseup);

        // 停止 BGM
        this.sound.stopBgm();

        // 標記為已銷毀
        this._destroyed = true;

        console.log('BrickBreakerGame instance destroyed, event listeners removed.');
    }

    // ========== Toast 通知系統 ==========
    showToast(message, type = 'info', duration = 3000) {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const icons = {
            error: '❌',
            success: '✅',
            info: 'ℹ️',
            warning: '⚠️'
        };

        toast.innerHTML = `<span>${icons[type] || ''}</span><span>${message}</span>`;
        container.appendChild(toast);

        // 自動移除
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, duration);
    }

    // ========== Powerup 時間條 UI ==========
    updatePowerupTimersUI() {
        const container = document.getElementById('powerupTimers');
        if (!container) return;

        container.innerHTML = '';

        for (const [type, remaining] of Object.entries(this.activePowerups)) {
            if (remaining <= 0) continue;

            const config = ALL_POWERUP_TYPES[type];
            if (!config || !config.duration) continue;

            const percentage = (remaining / config.duration) * 100;

            const timerEl = document.createElement('div');
            const isLow = percentage < 30;
            timerEl.className = 'powerup-timer' + (isLow ? ' running-low' : '');
            timerEl.innerHTML = `
                <span class="powerup-timer-icon">${config.emoji}</span>
                <div class="powerup-timer-bar">
                    <div class="powerup-timer-fill ${type}" style="width: ${percentage}%"></div>
                </div>
            `;
            container.appendChild(timerEl);
        }
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

    // 取得特殊磚塊類型（根據關卡主題）
    getSpecialBrickType(level) {
        const rand = this.rng.nextFloat();

        // 關卡 1：爆破快感 - 只有炸彈
        if (level === 1) {
            return rand < 0.20 ? 'bomb' : null;
        }
        // 關卡 2：金幣雨 - 炸彈 + 金磚
        else if (level === 2) {
            if (rand < 0.10) return 'bomb';
            if (rand < 0.25) return 'gold';
            return null;
        }
        // 關卡 3：閃電風暴 - 炸彈 + 金磚 + 閃電
        else if (level === 3) {
            if (rand < 0.08) return 'bomb';
            if (rand < 0.16) return 'gold';
            if (rand < 0.26) return 'lightning';
            return null;
        }
        // 關卡 4：防護階段 - 加入護盾
        else if (level === 4) {
            if (rand < 0.05) return 'bomb';
            if (rand < 0.13) return 'gold';
            if (rand < 0.18) return 'lightning';
            if (rand < 0.23) return 'shield';
            return null;
        }
        // 關卡 5+：全部磚塊 - 加入冰凍、傳送、隨機道具
        else {
            if (rand < 0.04) return 'bomb';
            if (rand < 0.10) return 'gold';
            if (rand < 0.14) return 'lightning';
            if (rand < 0.18) return 'shield';
            if (rand < 0.22) return 'freeze';    // ❄️ 冰凍
            if (rand < 0.26) return 'teleport';  // 🌀 傳送
            if (rand < 0.30) return 'random';    // 🎲 隨機道具
            return null;
        }
    }

    initBricks() {
        this.bricks = [];
        const pattern = this.getLevelPattern(this.level);

        // ✅ FIX: 一般關卡 6 行（5 行圖案 + 1 行給隨機磚塊），Boss 關卡 8 行（6 + 2）
        const actualRowCount = this.isBossLevel(this.level)
            ? CONFIG.brickRowCount + 3  // Boss 關 = 5 + 3 = 8 行
            : CONFIG.brickRowCount + 1; // 一般關 = 5 + 1 = 6 行

        for (let c = 0; c < CONFIG.brickColumnCount; c++) {
            this.bricks[c] = [];
            for (let r = 0; r < actualRowCount; r++) {
                const x = c * (CONFIG.brickWidth + CONFIG.brickPadding) + CONFIG.brickOffsetLeft;
                const y = r * (CONFIG.brickHeight + CONFIG.brickPadding) + CONFIG.brickOffsetTop;

                // 检查该位置是否有砖块（根据图案）
                let hasBrick = pattern ? (pattern[r] ? pattern[r][c] : 0) : 1;

                // 第一關：跳過最上面那排，降低難度
                if (this.level === 1 && r === 0) {
                    hasBrick = 0;
                }

                // 根据行数决定血量
                let maxHits = 1;

                // Boss 關卡：所有磚塊都更強
                if (this.isBossLevel(this.level)) {
                    maxHits = this.rng.nextFloat() < 0.5 ? 3 : 2;
                } else {
                    if (r >= 2 && r < 4) {
                        maxHits = 2;
                    } else if (r >= 4) {
                        maxHits = this.rng.nextFloat() < 0.5 ? 3 : 1;
                    }
                }

                // 決定特殊磚塊類型
                const specialType = hasBrick ? this.getSpecialBrickType(this.level) : null;

                this.bricks[c][r] = {
                    x: x,
                    y: y,
                    status: hasBrick ? 1 : 0,
                    color: BRICK_COLORS[r % BRICK_COLORS.length],
                    specialType: specialType, // 'bomb', 'gold', 'lightning', 'shield', or null
                    isBomb: specialType === 'bomb', // 保持向後相容
                    hits: specialType ? 1 : maxHits, // 特殊磚塊都是 1 血
                    maxHits: specialType ? 1 : maxHits
                };
            }
        }

        // Initialize Dragon Boss (only after L14)
        if (this.bossManager) {
            if (this.isDragonBossLevel(this.level)) {
                this.bossManager.initBoss(this.level);
                this.bossDefeatedHandled = false;
            } else {
                this.bossManager.currentBoss = null;
            }
        }

        // === L8+ 隨機增生磚塊機制 ===
        // 從 L8 開始，除了 Boss 關外，隨機在空位增加 5 個磚塊
        if (this.level >= 8 && !this.isBossLevel(this.level)) {
            const emptyPositions = [];
            for (let c = 0; c < CONFIG.brickColumnCount; c++) {
                // 一般關卡磚塊行數固定為 CONFIG.brickRowCount (5)
                for (let r = 0; r < CONFIG.brickRowCount; r++) {
                    if (this.bricks[c][r].status === 0) {
                        emptyPositions.push({ c, r });
                    }
                }
            }

            // 洗牌並選取最多 5 個空位
            for (let i = emptyPositions.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [emptyPositions[i], emptyPositions[j]] = [emptyPositions[j], emptyPositions[i]];
            }
            const bricksToAdd = Math.min(emptyPositions.length, 5);

            for (let i = 0; i < bricksToAdd; i++) {
                const pos = emptyPositions[i];
                const brick = this.bricks[pos.c][pos.r];

                // 激活磚塊
                brick.status = 1;
                // 使用該行的標準顏色
                brick.color = BRICK_COLORS[pos.r % BRICK_COLORS.length];

                // 血量邏輯：比照該行標準 (前兩行1血, 中間2血, 後面隨機)
                let maxHits = 1;
                if (pos.r >= 2 && pos.r < 4) {
                    maxHits = 2;
                } else if (pos.r >= 4) {
                    maxHits = Math.random() < 0.5 ? 3 : 1;
                }
                brick.maxHits = maxHits;
                brick.hits = maxHits;

                // 隨機磚塊不賦予特殊能力 (保持單純)
                brick.specialType = null;
                brick.isBomb = false;
            }

            // 可選：發出 Toast 通知
            // this.showToast('⚠️ 額外磚塊出現！', 'info');
        }

        // === 菁英磚塊初始化 ===
        // 在 Boss 關卡生成 1-3 個菁英磚塊
        this.eliteBricks = [];
        this.eliteProjectiles = [];
        if (this.isBossLevel(this.level)) {
            this.initEliteBricks();
        }
    }

    // 初始化菁英磚塊
    initEliteBricks() {
        // 根據關卡決定菁英磚塊數量 (第7關1個, 第14關2個, 第21關+3個)
        const bossNum = Math.floor(this.level / 7);
        const eliteCount = Math.min(bossNum, 3);

        // 隨機選擇位置（從可用磚塊中選）
        const availablePositions = [];
        for (let c = 0; c < CONFIG.brickColumnCount; c++) {
            // ✅ FIX: 使用實際陣列長度，確保 Boss 關卡額外 2 層磚塊也能被選為菁英
            for (let r = 0; r < this.bricks[c].length; r++) {
                if (this.bricks[c][r].status === 1) {
                    availablePositions.push({ c, r });
                }
            }
        }

        // 洗牌並選取前 eliteCount 個
        for (let i = availablePositions.length - 1; i > 0; i--) {
            const j = Math.floor(this.rng.nextFloat() * (i + 1));
            [availablePositions[i], availablePositions[j]] = [availablePositions[j], availablePositions[i]];
        }

        const selectedPositions = availablePositions.slice(0, eliteCount);

        // 為每個位置創建菁英磚塊
        selectedPositions.forEach((pos, index) => {
            const eliteTypeKey = ELITE_BRICK_KEYS[index % ELITE_BRICK_KEYS.length];
            const eliteType = ELITE_BRICK_TYPES[eliteTypeKey];
            const brick = this.bricks[pos.c][pos.r];

            // 標記為菁英磚塊
            brick.isElite = true;
            brick.eliteTypeKey = eliteTypeKey;
            brick.eliteType = eliteType;
            brick.hits = eliteType.hp;
            brick.maxHits = eliteType.hp;
            brick.attackTimer = 0;
            brick.agitationPhase = Math.random() * Math.PI * 2; // 隨機相位避免同步

            this.eliteBricks.push(brick);
        });

        // 通知玩家
        if (eliteCount > 0) {
            this.showToast(t('messages.eliteBricksSpawn', eliteCount), 'warning');
        }
    }

    // 检查是否为 Boss 关卡（每 7 关：第 7、14、21...）
    isBossLevel(level) {
        return level >= 7 && level % 7 === 0;
    }

    // 检查是否为 Dragon Boss 关卡（第 14、21、28...，即第 2 个 Boss 关及之后）
    isDragonBossLevel(level) {
        return level >= 14 && level % 7 === 0;
    }

    // 获取关卡图案
    getLevelPattern(level) {
        // Boss 關卡特殊圖案（皇冠形狀）
        const bossPattern = [
            [1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [0, 1, 1, 1, 1, 1, 1, 1, 1, 0],
            [0, 0, 1, 1, 1, 1, 1, 1, 0, 0]
        ];

        // 如果是 Boss 關卡，返回 Boss 圖案
        if (this.isBossLevel(level)) {
            return bossPattern;
        }

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

    // 切換減少動態效果
    toggleReduceMotion(enabled) {
        if (enabled) {
            document.body.classList.add('reduce-motion');
        } else {
            document.body.classList.remove('reduce-motion');
        }
        localStorage.setItem('brickBreaker_reduceMotion', enabled.toString());

        // 可選：顯示 Toast 通知
        const message = enabled ? t('messages.reduceMotionOn') : t('messages.reduceMotionOff');
        this.showToast(message, 'info');
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
        // 核心輸入事件（使用綁定的處理器，可被 destroy() 移除）
        window.addEventListener('keydown', this._boundHandlers.keydown);
        window.addEventListener('keyup', this._boundHandlers.keyup);

        // 觸控支援 (改為全螢幕監聽，解決黑邊觸控無效問題)
        window.addEventListener('touchstart', this._boundHandlers.touchstart, { passive: false });
        window.addEventListener('touchmove', this._boundHandlers.touchmove, { passive: false });
        window.addEventListener('touchend', this._boundHandlers.touchend);
        window.addEventListener('touchcancel', this._boundHandlers.touchend);

        // Detect Touch and Update UI Text
        // v1.5: Fix "Press Space" text on mobile
        if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
            this._updateMobileText();
        }

        // 滑鼠支援
        this.canvas.addEventListener('mousedown', this._boundHandlers.mousedown);
        this.canvas.addEventListener('mousemove', this._boundHandlers.mousemove);
        this.canvas.addEventListener('mouseup', this._boundHandlers.mouseup);
        this.canvas.addEventListener('mouseleave', this._boundHandlers.mouseup);


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

        // ========== 統一 Modal 關閉行為 (v1.19) ==========
        // 點擊背景遮罩關閉 Modal
        this._setupModalBackdropClose('leaderboardModal', 'leaderboard-content', () => this.hideLeaderboard());
        this._setupModalBackdropClose('settingsModal', 'settings-content', () => this.hideSettings());
        this._setupModalBackdropClose('achievementsModal', 'achievements-content', () => this.hideAchievements());
        this._setupModalBackdropClose('helpModal', 'help-content', () => this.hideHelp());
        this._setupModalBackdropClose('shareModal', 'share-content', () => this.hideShareModal());

        // 排行榜關閉按鈕
        const closeLeaderboardBtn = document.getElementById('closeLeaderboardBtn');
        if (closeLeaderboardBtn) {
            closeLeaderboardBtn.onclick = () => this.hideLeaderboard();
        }

        // 设置按钮点击事件
        const settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => this.showSettings());
        }

        // 主選單排行榜按鈕
        const mainLeaderboardBtn = document.getElementById('mainLeaderboardBtn');
        if (mainLeaderboardBtn) {
            mainLeaderboardBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showLeaderboard();
                mainLeaderboardBtn.blur();
            });
        }

        // 主界面音效切換按鈕
        const soundToggle = document.getElementById('soundToggle');
        if (soundToggle) {
            soundToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                // 强制解锁音频上下文（针对移动端）
                this.sound.init();
                this.toggleSound();
                // 更新按鈕文字
                soundToggle.textContent = this.sound.enabled ? t('ui.soundOn') : t('ui.soundOff');
                // 讓按鈕失去焦點，避免按空白鍵時觸發
                soundToggle.blur();
            });
        }

        // 全螢幕按鈕
        const fullscreenBtn = document.getElementById('fullscreenBtn');
        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.sound.init(); // 同步解鎖音效
                this.toggleFullscreen();
                fullscreenBtn.blur();
            });
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

        // 背景音樂开关监听
        const bgmCheck = document.getElementById('settingBgmCheck');
        if (bgmCheck) {
            bgmCheck.addEventListener('change', (e) => this.toggleBgm(e.target.checked));
        }

        // 无尽模式开关监听
        const endlessCheck = document.getElementById('settingEndlessCheck');
        if (endlessCheck) {
            endlessCheck.addEventListener('change', (e) => this.toggleEndlessMode(e.target.checked));
        }

        // 減少動態效果開關監聽
        const reduceMotionCheck = document.getElementById('settingReduceMotionCheck');
        if (reduceMotionCheck) {
            // 讀取已儲存的偏好
            const savedPref = localStorage.getItem('brickBreaker_reduceMotion') === 'true';
            reduceMotionCheck.checked = savedPref;
            if (savedPref) document.body.classList.add('reduce-motion');

            reduceMotionCheck.addEventListener('change', (e) => this.toggleReduceMotion(e.target.checked));
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

        // Help Modal Tab Switching
        const helpTabs = document.querySelectorAll('.help-tab');
        helpTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;

                // Update active tab
                helpTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                // Update active content
                document.querySelectorAll('.help-tab-content').forEach(c => c.classList.remove('active'));
                document.getElementById(`tab-${tabName}`)?.classList.add('active');
            });
        });

        // 成就按鈕點擊事件
        const viewAchievementsBtn = document.getElementById('viewAchievementsBtn');
        if (viewAchievementsBtn) {
            viewAchievementsBtn.addEventListener('click', () => this.showAchievements());
        }

        // 關閉成就按鈕點擊事件
        const closeAchievementsBtn = document.getElementById('closeAchievementsBtn');
        if (closeAchievementsBtn) {
            closeAchievementsBtn.addEventListener('click', () => this.hideAchievements());
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

    // 顯示成就
    showAchievements() {
        const modal = document.getElementById('achievementsModal');
        const list = document.getElementById('achievementsList');
        const progressEl = document.getElementById('achProgress');

        if (!modal || !list) return;

        // 清空列表
        list.innerHTML = '';

        // 統計進度
        const unlockedCount = this.playerStats.unlockedAchievements.length;
        const totalCount = ACHIEVEMENTS.length;
        if (progressEl) {
            progressEl.textContent = `${unlockedCount}/${totalCount}`;
        }

        // 生成列錶
        ACHIEVEMENTS.forEach(ach => {
            const isUnlocked = this.playerStats.unlockedAchievements.includes(ach.id);
            const item = document.createElement('div');
            item.className = `ach-item ${isUnlocked ? 'unlocked' : 'locked'}`;

            // 如果是統計類成就，顯示進度
            let progressText = '';
            if (ach.type === 'stat' && !isUnlocked) {
                const current = this.playerStats.stats[ach.stat] || 0;
                progressText = ` (${current}/${ach.target})`;
            }

            item.innerHTML = `
                <div class="icon">${ach.icon}</div>
                <div class="info">
                    <div class="ach-view-title">${ach.title}</div>
                    <div class="ach-view-desc">${ach.desc}${progressText}</div>
                </div>
                <div class="status">${isUnlocked ? '✅' : '🔒'}</div>
            `;
            list.appendChild(item);
        });

        modal.classList.remove('hidden');

        // 暫停遊戲
        if (this.gameState === 'playing') {
            this.pauseGame();
        }
    }

    hideAchievements() {
        const modal = document.getElementById('achievementsModal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    // ========== Modal 背景關閉輔助方法 (v1.19) ==========
    _setupModalBackdropClose(modalId, contentClass, hideCallback) {
        const modal = document.getElementById(modalId);
        if (!modal) return;

        modal.addEventListener('click', (e) => {
            // 只有點在 Modal 背景（非內容區）才關閉
            if (e.target === modal || !e.target.closest(`.${contentClass}`)) {
                hideCallback();
            }
        });
    }

    // 隱藏說明 Modal
    hideHelp() {
        const modal = document.getElementById('helpModal');
        if (modal) modal.classList.add('hidden');
    }

    // 隱藏分享 Modal
    hideShareModal() {
        const modal = document.getElementById('shareModal');
        if (modal) modal.classList.add('hidden');
    }

    toggleSound(enabled) {
        if (enabled !== undefined) {
            this.sound.enabled = enabled;
        } else {
            this.sound.toggle();
        }
        localStorage.setItem('brickBreakerSound', this.sound.enabled);
        this.updateSoundButton();
    }

    // 更新音效按鈕文字
    updateSoundButton() {
        const btn = document.getElementById('soundToggle');
        if (btn) {
            btn.textContent = this.sound.enabled ? t('ui.soundOn') : t('ui.soundOff');
        }
    }

    toggleBgm(enabled) {
        if (enabled !== undefined) {
            this.sound.bgmEnabled = enabled;
        } else {
            this.sound.bgmEnabled = !this.sound.bgmEnabled;
        }
        localStorage.setItem('brickBreakerBgm', this.sound.bgmEnabled);

        // 如果關閉 BGM，立即停止
        if (!this.sound.bgmEnabled) {
            this.sound.stopBgm();
        } else if (this.gameState === 'playing') {
            // ✅ 使用統一的 BGM 選擇邏輯
            let theme = this._getBgmThemeForLevel(this.level);
            this.sound.startBgm(theme);
        }
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

    // 全螢幕切換
    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch((err) => {
                console.log(`Error attempting to enable fullscreen: ${err.message} (${err.name})`);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
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
                const startKey = this._isTouchDevice ? 'messages.startTouch' : 'messages.start';
                overlayMessage.textContent = t(startKey);
            } else if (this.gameState === 'paused') {
                overlayTitle.textContent = t('messages.paused');
                const pauseKey = this._isTouchDevice ? 'messages.pauseMsgTouch' : 'messages.pauseMsg';
                overlayMessage.textContent = t(pauseKey);
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

        // 播放 BGM - 區間內不重複系統
        let theme = 'normal';

        if (this.isBossLevel(this.level)) {
            theme = 'boss';
        } else {
            // ✅ 新 BGM 系統：每區間 6 關使用不同順序的 6 種主題
            // 前期 L1-6:  normal → journey → adventure → mystic → fast → triumph
            // 中期 L8-13: triumph → fast → mystic → adventure → journey → normal
            // 後期 L15-20: fast → triumph → journey → mystic → normal → adventure
            // 終盤 L22-27: mystic → adventure → normal → triumph → journey → fast
            const tierThemes = {
                1: ['normal', 'journey', 'adventure', 'mystic', 'fast', 'triumph'],      // L1-6
                2: ['triumph', 'fast', 'mystic', 'adventure', 'journey', 'normal'],      // L8-13
                3: ['fast', 'triumph', 'journey', 'mystic', 'normal', 'adventure'],      // L15-20
                4: ['mystic', 'adventure', 'normal', 'triumph', 'journey', 'fast']       // L22-27
            };

            let tier, indexInTier;
            if (this.level <= 6) {
                tier = 1;
                indexInTier = this.level - 1;
            } else if (this.level <= 13) {
                tier = 2;
                indexInTier = this.level - 8;
            } else if (this.level <= 20) {
                tier = 3;
                indexInTier = this.level - 15;
            } else {
                tier = 4;
                indexInTier = this.level - 22;
            }

            // 確保 index 在有效範圍內
            indexInTier = Math.max(0, Math.min(5, indexInTier));
            theme = tierThemes[tier][indexInTier];
        }

        this.sound.startBgm(theme);
    }

    pauseGame() {
        this.gameState = 'paused';
        this.showOverlay(t('messages.paused'), t('messages.pauseMsg'));
        this.sound.stopBgm();
    }

    resumeGame() {
        this.gameState = 'playing';
        this.hideOverlay();

        // 恢復 BGM - 區間內不重複系統（與 startGame 一致）
        let theme = this._getBgmThemeForLevel(this.level);
        this.sound.startBgm(theme);
    }

    // ✅ 提取 BGM 主題選擇邏輯，供 startGame/resumeGame/toggleBgm 共用
    _getBgmThemeForLevel(level) {
        if (this.isBossLevel(level)) {
            return 'boss';
        }

        const tierThemes = {
            1: ['normal', 'journey', 'adventure', 'mystic', 'fast', 'triumph'],
            2: ['triumph', 'fast', 'mystic', 'adventure', 'journey', 'normal'],
            3: ['fast', 'triumph', 'journey', 'mystic', 'normal', 'adventure'],
            4: ['mystic', 'adventure', 'normal', 'triumph', 'journey', 'fast']
        };

        let tier, indexInTier;
        if (level <= 6) {
            tier = 1; indexInTier = level - 1;
        } else if (level <= 13) {
            tier = 2; indexInTier = level - 8;
        } else if (level <= 20) {
            tier = 3; indexInTier = level - 15;
        } else {
            tier = 4; indexInTier = level - 22;
        }

        indexInTier = Math.max(0, Math.min(5, indexInTier));
        return tierThemes[tier][indexInTier];
    }

    resetGame() {
        this.score = 0;
        this.lives = CONFIG.lives;
        this.level = 1;
        this.combo = 0;
        this.currentBallSpeed = CONFIG.ballSpeed; // 重置球速
        this.maxCombo = 0;
        this.initBall();
        this.initBricks();
        this.particlePool.reset();
        this.sound.stopBgm();
        this.shakeTime = 0;

        // 重置道具系统
        this.powerups = [];
        this.activePowerups = {};
        this.paddle.width = this.originalPaddleWidth;

        // 重置无尽模式计时器
        this.endlessTimer = 0;

        // ✅ FIX: 重置遊戲通關狀態（修復通關後無法重新開始的問題）
        this.gameCompleted = false;
        this.bossDefeatedHandled = false;
        this.missCount = 0;
        this.consecutiveLosses = 0;

        this.hideScoreCard();
        this.updateUI();
    }

    showOverlay(title, message) {
        const overlay = document.getElementById('overlay');
        document.getElementById('overlayTitle').innerHTML = title;
        document.getElementById('overlayMessage').innerHTML = message.replace(/\n/g, '<br>');
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
        // 計算剩餘磚塊數量
        let remainingBricks = 0;
        for (let c = 0; c < CONFIG.brickColumnCount; c++) {
            // ✅ FIX: 使用實際陣列長度，確保 Boss 關卡額外 2 層磚塊也被計入
            for (let r = 0; r < this.bricks[c].length; r++) {
                if (this.bricks[c][r].status === 1) {
                    remainingBricks++;
                }
            }
        }

        // 最後衝刺獎勵：剩餘 < 5 塊時，道具掉落率提升至 80%
        let dropChance = POWERUP_DROP_CHANCE;
        if (remainingBricks > 0 && remainingBricks <= 5) {
            dropChance = 0.8; // 80% 掉落
        } else if (remainingBricks > 0 && remainingBricks <= 10) {
            dropChance = 0.5; // 50% 掉落
        }

        if (Math.random() > dropChance) return;

        const type = POWERUP_KEYS[Math.floor(Math.random() * POWERUP_KEYS.length)];
        this.powerups.push({
            x: x,
            y: y,
            type: type,
            ...POWERUP_TYPES[type]
        });
    }

    // 閒置掉落：2秒未撞擊磚塊，掉3個隨機道具
    triggerIdleDrop() {
        const startY = CONFIG.canvasHeight * 0.3; // 從畫面上方30%處掉落
        const margin = 100; // 邊距

        // 掉落3個隨機道具（分散在畫面不同位置）
        for (let i = 0; i < 3; i++) {
            const type = ALL_POWERUP_KEYS[Math.floor(Math.random() * ALL_POWERUP_KEYS.length)];

            // 隨機 X 位置 (保留邊距)
            const randomX = margin + Math.random() * (CONFIG.canvasWidth - margin * 2);

            this.powerups.push({
                x: randomX,
                y: startY + (i * 30), // 稍微錯開高度
                type: type,
                ...ALL_POWERUP_TYPES[type]
            });
        }

        // 播放道具音效
        this.sound.playPowerup();
    }

    // 更新道具位置与碰撞
    updatePowerups() {
        const ts = this.timeScale || 1;

        for (let i = this.powerups.length - 1; i >= 0; i--) {
            const p = this.powerups[i];
            p.y += POWERUP_SPEED * ts;

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
        const config = ALL_POWERUP_TYPES[type];

        switch (type) {
            case 'expand':
                // 取消縮小效果（互斥）
                if (this.activePowerups.shrink) {
                    delete this.activePowerups.shrink;
                }
                this.paddle.width = this.originalPaddleWidth * 1.5;
                this.activePowerups.expand = config.duration;
                break;

            case 'shrink':
                // 取消擴大效果（互斥）
                if (this.activePowerups.expand) {
                    delete this.activePowerups.expand;
                }
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
                    if (!b.isSlowed) { // 只對未減速的球生效
                        b.dx *= 0.5;
                        b.dy *= 0.5;
                        b.speed *= 0.5;
                        b.isSlowed = true;
                    }
                });
                this.activePowerups.slow = config.duration;
                break;

            // ===== 新道具效果 =====
            case 'fireball':
                // 火球效果：球帶火焰，撞擊時燒毀周圍磚塊
                this.balls.forEach(b => b.fireball = true);
                this.activePowerups.fireball = config.duration;
                break;

            case 'magnet':
                // 磁鐵效果：球自動追蹤擋板
                this.balls.forEach(b => b.magnet = true);
                this.activePowerups.magnet = config.duration;
                break;

            case 'invincible':
                // 無敵護盾：底部保護，球不會掉落
                this.shield.active = true;
                this.shield.y = CONFIG.canvasHeight - 10;
                this.shield.height = 5;
                this.shield.timeLeft = config.duration;
                this.activePowerups.invincible = config.duration;
                break;

            case 'scoreDouble':
                // 分數加倍：15秒內分數 x2
                this.scoreMultiplier = 2;
                this.activePowerups.scoreDouble = config.duration;
                break;

            case 'timeSlow':
                // 時間減速：遊戲速度變慢50%
                this.gameSpeedMultiplier = 0.5;
                this.activePowerups.timeSlow = config.duration;
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

        // 更新 UI 時間條
        this.updatePowerupTimersUI();
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
                    if (b.isSlowed) { // 只恢復被減速過的球
                        b.dx *= 2;
                        b.dy *= 2;
                        b.speed *= 2;
                        b.isSlowed = false;
                    }
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

    // 繪製護盾
    drawShield() {
        if (!this.shield.active) return;

        const opacity = Math.min(1, this.shield.timeLeft / 1000); // 最後一秒漸隱
        this.ctx.save();
        this.ctx.globalAlpha = opacity;

        // 護盾發光效果
        const gradient = this.ctx.createLinearGradient(0, this.shield.y, 0, this.shield.y + this.shield.height);
        gradient.addColorStop(0, '#00ffcc');
        gradient.addColorStop(1, '#00aa88');

        this.ctx.fillStyle = gradient;
        this.ctx.shadowColor = '#00ffcc';
        this.ctx.shadowBlur = 20;
        this.ctx.fillRect(0, this.shield.y, CONFIG.canvasWidth, this.shield.height);

        this.ctx.restore();
    }

    // 更新護盾計時器
    updateShield(deltaTime) {
        if (!this.shield.active) return;

        this.shield.timeLeft -= deltaTime;
        if (this.shield.timeLeft <= 0) {
            this.shield.active = false;
        }
    }

    // ===== 结束道具系统方法 =====

    // 更新挡板位置
    updatePaddle() {
        let speed = this.paddle.speed * (this.timeScale || 1);

        // 菁英磚塊雷擊減速效果
        if (this.eliteSlowTimer && this.eliteSlowTimer > 0) {
            speed *= 0.5; // 50% 減速
        }

        if (this.keys.left && this.paddle.x > 0) {
            this.paddle.x -= speed;
        }
        if (this.keys.right && this.paddle.x < CONFIG.canvasWidth - this.paddle.width) {
            this.paddle.x += speed;
        }
    }

    // 更新手機觸控文字
    _updateMobileText() {
        // Set a flag indicating this is a touch device
        this._isTouchDevice = true;
    }

    // 更新球位置（支持多球）
    updateBall() {
        const ts = this.timeScale || 1;

        for (let i = this.balls.length - 1; i >= 0; i--) {
            const ball = this.balls[i];

            // 如果球被抓住，跟隨擋板移動
            if (ball.held) {
                ball.x = this.paddle.x + this.paddle.width / 2;
                ball.y = this.paddle.y - ball.radius;
                continue;
            }

            ball.x += ball.dx * ts;
            ball.y += ball.dy * ts;

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

            // 下边界（球落出画面）或護盾碰撞
            if (ball.y + ball.radius > CONFIG.canvasHeight) {
                // 檢查是否有護盾
                if (this.shield.active && ball.y + ball.radius > this.shield.y) {
                    // 護盾反彈
                    ball.y = this.shield.y - ball.radius;
                    ball.dy = -Math.abs(ball.dy);
                    this.sound.playWallHit();
                    continue;
                }

                // ✅ FIX L5: 標記要移除的球，稍後統一處理
                if (!this.ballsToRemoveThisFrame) {
                    this.ballsToRemoveThisFrame = [];
                }
                this.ballsToRemoveThisFrame.push(i);
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

                // 球速正規化：確保球速不會因累積誤差而異常
                const expectedSpeed = ball.isSlowed ? this.currentBallSpeed * 0.5 : this.currentBallSpeed;
                const currentSpeed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
                if (Math.abs(currentSpeed - expectedSpeed) > 0.5) {
                    const ratio = expectedSpeed / currentSpeed;
                    ball.dx *= ratio;
                    ball.dy *= ratio;
                }

                this.sound.playPaddleHit();
                this.combo = 0; // 碰到挡板，连击归零
                this.updateUI();

                // 檢查完美反彈 (擊中邊緣 10% 區域)
                if (Math.abs(hitPos - 0.5) > 0.4) {
                    this.playerStats.incrementStat('perfectBounces');
                }
            }
        }

        // ✅ FIX L5: 批次處理落地球
        this._processFallenBalls();

        // 更新 this.ball 引用（指向第一个球）
        this.ball = this.balls[0] || null;
    }

    // 砖块碰撞检测（支持多球和特殊磚塊）
    checkBrickCollision() {
        for (const ball of this.balls) {
            if (ball.held) continue;

            for (let c = 0; c < CONFIG.brickColumnCount; c++) {
                // ✅ FIX: 使用實際陣列長度，確保 Boss 關卡額外 2 層磚塊也能被擊中
                for (let r = 0; r < this.bricks[c].length; r++) {
                    const brick = this.bricks[c][r];
                    if (brick.status === 1) {
                        if (ball.x > brick.x &&
                            ball.x < brick.x + CONFIG.brickWidth &&
                            ball.y > brick.y &&
                            ball.y < brick.y + CONFIG.brickHeight) {

                            // 重置閒置計時器（有撞到磚塊）
                            this.lastBrickHitTime = performance.now();
                            this.idleDropTriggered = false;

                            // 如果不是穿透模式，反弹
                            if (!ball.pierce) {
                                ball.dy = -ball.dy;
                            }

                            // 根據特殊磚塊類型處理
                            switch (brick.specialType) {
                                case 'bomb':
                                    this.explodeBrick(c, r);
                                    break;

                                case 'gold':
                                    this.hitGoldBrick(brick);
                                    break;

                                case 'lightning':
                                    this.triggerLightning(r);
                                    break;

                                case 'shield':
                                    this.spawnShield(brick);
                                    break;

                                case 'freeze':
                                    this.triggerFreeze(brick, ball);
                                    break;

                                case 'teleport':
                                    this.triggerTeleport(brick, ball);
                                    break;

                                case 'random':
                                    this.triggerRandomPowerup(brick);
                                    break;

                                default:
                                    // 普通磚塊
                                    this.hitNormalBrick(brick);
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

    // 擊中普通磚塊
    hitNormalBrick(brick) {
        brick.hits--;

        this.combo++;
        if (this.combo > this.maxCombo) this.maxCombo = this.combo;

        // 重置閒置掉落計時器（每次擊中磚塊後允許再次觸發）
        this.lastBrickHitTime = performance.now();
        this.idleDropTriggered = false;

        // 觸發連擊視覺效果
        this.triggerComboEffect(
            this.combo,
            brick.x + CONFIG.brickWidth / 2,
            brick.y + CONFIG.brickHeight / 2
        );

        const points = 10 * (1 + (this.combo - 1) * 0.5);
        this.score += points;

        this.sound.playBrickHit(0);

        this.createParticles(
            brick.x + CONFIG.brickWidth / 2,
            brick.y + CONFIG.brickHeight / 2,
            brick.color,
            brick.hits > 0 ? 3 : 8
        );

        if (brick.hits <= 0) {
            brick.status = 0;
            this.spawnPowerup(
                brick.x + CONFIG.brickWidth / 2,
                brick.y + CONFIG.brickHeight / 2
            );
        }
    }

    // 💰 金磚：雙倍分數
    hitGoldBrick(brick) {
        brick.status = 0;

        this.combo++;
        if (this.combo > this.maxCombo) this.maxCombo = this.combo;

        // 觸發連擊視覺效果
        this.triggerComboEffect(
            this.combo,
            brick.x + CONFIG.brickWidth / 2,
            brick.y + CONFIG.brickHeight / 2
        );

        const points = 20 * (1 + (this.combo - 1) * 0.5); // 雙倍分數
        this.score += points;

        // 金幣音效和粒子
        this.sound.playCoin();
        this.createParticles(
            brick.x + CONFIG.brickWidth / 2,
            brick.y + CONFIG.brickHeight / 2,
            '#ffd700', // 金色
            15
        );

        this.triggerShake(5, 5);
    }

    // ⚡ 閃電磚：清除整排
    triggerLightning(row) {
        let clearedCount = 0;

        for (let c = 0; c < CONFIG.brickColumnCount; c++) {
            const brick = this.bricks[c][row];
            if (brick.status === 1) {
                brick.status = 0;
                clearedCount++;

                this.createParticles(
                    brick.x + CONFIG.brickWidth / 2,
                    brick.y + CONFIG.brickHeight / 2,
                    '#ffff00', // 黃色閃電
                    10
                );
            }
        }

        // 分數和連擊
        this.combo += clearedCount;
        if (this.combo > this.maxCombo) this.maxCombo = this.combo;

        // 觸發連擊視覺效果 (使用該排中心位置)
        if (clearedCount > 0) {
            this.triggerComboEffect(
                this.combo,
                CONFIG.canvasWidth / 2,
                row * (CONFIG.brickHeight + CONFIG.brickPadding) + CONFIG.brickOffsetTop
            );
        }

        this.score += clearedCount * 15;

        // 震動效果
        this.triggerShake(10, 8);
        this.sound.playLightning();
        // 統計
        this.playerStats.incrementStat('lightningTriggers');
    }

    // 🛡️ 護盾磚：生成底部護盾
    spawnShield(brick) {
        brick.status = 0;

        this.combo++;
        if (this.combo > this.maxCombo) this.maxCombo = this.combo;

        // 觸發連擊視覺效果
        this.triggerComboEffect(
            this.combo,
            brick.x + CONFIG.brickWidth / 2,
            brick.y + CONFIG.brickHeight / 2
        );

        this.score += 15;

        // 設定護盾（8 秒）
        this.shield = {
            active: true,
            y: CONFIG.canvasHeight - 10,
            height: 8,
            timeLeft: 8000 // 8 秒
        };

        this.createParticles(
            brick.x + CONFIG.brickWidth / 2,
            brick.y + CONFIG.brickHeight / 2,
            '#00ffcc', // 青色
            12
        );

        this.sound.playShield();
    }

    // ❄️ 冰凍磚：球速減慢 70%、只影響擊中的球、擋板變大
    triggerFreeze(brick, ball) {
        brick.status = 0;

        this.combo++;
        if (this.combo > this.maxCombo) this.maxCombo = this.combo;

        // 觸發連擊視覺效果
        this.triggerComboEffect(
            this.combo,
            brick.x + CONFIG.brickWidth / 2,
            brick.y + CONFIG.brickHeight / 2
        );

        this.score += 15;

        // 只減速擊中的這顆球（70% 減速）
        if (!ball.isFrozen) {
            ball.dx *= 0.3;  // 減速到 30%（= 70% 減速）
            ball.dy *= 0.3;
            ball.isFrozen = true;
            ball.freezeColor = '#00bfff'; // 冰藍色標記
        }

        // 擋板變大 1.2 倍
        if (!this.freezeActive) {
            const originalWidth = this.paddle.width;
            this.paddle.width *= 1.2;
            this.freezeActive = true;

            // 5 秒後恢復
            setTimeout(() => {
                // 恢復球速
                if (ball.isFrozen) {
                    ball.dx /= 0.3;  // 恢復原速
                    ball.dy /= 0.3;
                    ball.isFrozen = false;
                    delete ball.freezeColor;
                }

                // 恢復擋板大小
                this.paddle.width = originalWidth;
                this.freezeActive = false;
            }, 5000);
        }

        this.createParticles(
            brick.x + CONFIG.brickWidth / 2,
            brick.y + CONFIG.brickHeight / 2,
            '#00bfff', // 冰藍色
            20
        );

        this.sound.playFreeze();
        // 統計
        this.playerStats.incrementStat('freezeTriggers');
    }

    // 🌀 傳送磚：球傳送到隨機位置
    triggerTeleport(brick, ball) {
        brick.status = 0;

        this.combo++;
        if (this.combo > this.maxCombo) this.maxCombo = this.combo;

        // 觸發連擊視覺效果
        this.triggerComboEffect(
            this.combo,
            brick.x + CONFIG.brickWidth / 2,
            brick.y + CONFIG.brickHeight / 2
        );

        this.score += 15;

        // 傳送球到隨機安全位置
        ball.x = 100 + Math.random() * (CONFIG.canvasWidth - 200);
        ball.y = 100 + Math.random() * (CONFIG.canvasHeight / 2 - 100);

        this.createParticles(
            brick.x + CONFIG.brickWidth / 2,
            brick.y + CONFIG.brickHeight / 2,
            '#9b59b6', // 紫色
            20
        );

        // 在新位置也產生粒子
        this.createParticles(ball.x, ball.y, '#9b59b6', 15);

        this.sound.playTeleport();
    }

    // ✅ FIX L5: 批次處理所有落地的球（確保只扣 1 命）
    _processFallenBalls() {
        if (this.ballsToRemoveThisFrame && this.ballsToRemoveThisFrame.length > 0) {
            // 從後往前刪除，避免索引錯誤
            for (let i = this.ballsToRemoveThisFrame.length - 1; i >= 0; i--) {
                const index = this.ballsToRemoveThisFrame[i];
                if (index < this.balls.length) {
                    this.balls.splice(index, 1);
                }
            }

            // 如果沒有球了，失去生命
            if (this.balls.length === 0) {
                // ✅ FIX L7: 確保生命不會變負數
                this.lives = Math.max(0, this.lives - 1);
                this.updateUI();

                if (this.lives <= 0) {
                    this.gameOver();
                } else {
                    this.sound.playLoseLife();
                    this.resetBallAndPaddle();
                    this.gameState = 'paused';
                    const msgKey = this._isTouchDevice ? 'messages.livesLeftTouch' : 'messages.livesLeft';
                    this.showOverlay(t('messages.loseLife'), t(msgKey, this.lives));
                }
            }

            // 清空標記
            this.ballsToRemoveThisFrame = [];
        }
    }

    // 🎲 隨機道具磚：掉落隨機道具
    triggerRandomPowerup(brick) {
        brick.status = 0;

        this.combo++;
        if (this.combo > this.maxCombo) this.maxCombo = this.combo;

        // 觸發連擊視覺效果
        this.triggerComboEffect(
            this.combo,
            brick.x + CONFIG.brickWidth / 2,
            brick.y + CONFIG.brickHeight / 2
        );

        this.score += 15;

        // 隨機選擇一個道具類型
        const randomType = POWERUP_KEYS[Math.floor(Math.random() * POWERUP_KEYS.length)];

        // 生成道具
        this.powerups.push({
            x: brick.x + CONFIG.brickWidth / 2,
            y: brick.y + CONFIG.brickHeight / 2,
            type: randomType,
            ...POWERUP_TYPES[randomType]
        });

        this.createParticles(
            brick.x + CONFIG.brickWidth / 2,
            brick.y + CONFIG.brickHeight / 2,
            '#f1c40f', // 金色
            15
        );

        this.sound.playPowerup();
    }

    // 炸弹爆炸逻辑（使用計數器追蹤連鎖）
    explodeBrick(c, r) {
        const brick = this.bricks[c][r];
        if (brick.status === 0) return; // 防止重复爆炸

        this.pendingExplosions++; // 增加計數器

        brick.status = 0;
        this.combo++;
        if (this.combo > this.maxCombo) this.maxCombo = this.combo;

        // 觸發連擊視覺效果
        this.triggerComboEffect(
            this.combo,
            brick.x + CONFIG.brickWidth / 2,
            brick.y + CONFIG.brickHeight / 2
        );

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
        // 統計
        this.playerStats.incrementStat('bombExplosions');

        // 检查周围 3x3 区域
        for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
                const nc = c + i;
                const nr = r + j;

                // 边界检查 (✅ FIX: 使用實際陣列長度，確保 Boss 關卡額外 2 層磚塊也能被炸到)
                if (nc >= 0 && nc < CONFIG.brickColumnCount &&
                    nr >= 0 && nr < this.bricks[nc].length) {

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

        // 減少計數器，當所有爆炸完成後檢查過關
        setTimeout(() => {
            this.pendingExplosions--;
            this.updateUI();

            // 只有當所有爆炸都完成時才檢查過關
            if (this.pendingExplosions === 0 && this.checkWin()) {
                this.winGame();
            }
        }, 150);
    }

    checkWin() {
        // 檢查所有磚塊是否清除
        for (let c = 0; c < CONFIG.brickColumnCount; c++) {
            // 使用實際陣列長度（Boss 關卡可能有額外 2 層）
            for (let r = 0; r < this.bricks[c].length; r++) {
                if (this.bricks[c][r].status === 1) {
                    return false;
                }
            }
        }

        // 如果是 Dragon Boss 關卡，還需要確認 Boss 已擊敗
        if (this.isDragonBossLevel(this.level) && this.bossManager && this.bossManager.currentBoss) {
            if (!this.bossManager.currentBoss.isDead) {
                return false; // Boss 還活著，不能過關
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

        // 檢查是否可以接關 (分數夠扣 OR 有代幣)
        if (this.score >= CONFIG.continueCost || this.credits > 0) {
            this.startContinueCountdown();
            return;
        }

        this.showGameOverScreen();
    }

    showGameOverScreen() {
        // 失敗回饋與動機
        this.consecutiveLosses++;

        // 計算剩餘磚塊
        let remainingBricks = 0;
        for (let c = 0; c < CONFIG.brickColumnCount; c++) {
            // ✅ FIX: 使用實際陣列長度，確保 Boss 關卡額外 2 層磚塊也被計入
            for (let r = 0; r < this.bricks[c].length; r++) {
                if (this.bricks[c][r].status === 1) {
                    remainingBricks++;
                }
            }
        }

        let title = '💀 游戏结束';

        // 接近成功提示 (剩餘 < 5)
        if (remainingBricks > 0 && remainingBricks <= 5) {
            title = '😫 只差一點點！ SO CLOSE!';
        }

        // 連續失敗鼓勵 (>= 3 次)
        if (this.consecutiveLosses >= 3) {
            title = '💪 別灰心！再來一次！';
            if (this.currentBallSpeed > CONFIG.ballSpeed) {
                // 稍微降低難度 (如果速度夠快)
                this.currentBallSpeed = Math.max(CONFIG.ballSpeed, this.currentBallSpeed - 0.5);
            }
        }

        this.showScoreCard(title);
        // 重置代幣 (Game Over 後重置)
        this.credits = CONFIG.initialCredits;
    }

    // ===== 接關系統 =====
    startContinueCountdown() {
        this.isContinueActive = true;
        this.continueTimer = CONFIG.continueCountdown;

        const overlay = document.getElementById('continueOverlay');
        const timerEl = document.getElementById('continueTimer');
        const costEl = document.getElementById('continueCost');

        overlay.classList.remove('hidden');
        timerEl.classList.remove('urgent');

        // 顯示費用
        if (this.score >= CONFIG.continueCost) {
            costEl.innerHTML = `COST: <span style="color: #ff4757">-${CONFIG.continueCost}</span> SCORE`;
        } else {
            costEl.innerHTML = `INSERT 1 TOKEN (<span style="color: #4ade80">${this.credits}</span> LEFT)`;
        }

        this.updateContinueUIData();

        this.continueInterval = setInterval(() => {
            this.continueTimer--;
            this.updateContinueUIData();

            if (this.continueTimer <= 3 && this.continueTimer > 0) {
                this.sound.playBip(); // 倒數音效
                document.getElementById('continueTimer').classList.add('urgent');
            }

            if (this.continueTimer <= 0) {
                this.stopContinueCountdown();
                this.showGameOverScreen();
            }
        }, 1000);
    }

    stopContinueCountdown() {
        this.isContinueActive = false;
        clearInterval(this.continueInterval);
        document.getElementById('continueOverlay').classList.add('hidden');
    }

    updateContinueUIData() {
        document.getElementById('continueTimer').textContent = Math.max(0, this.continueTimer);
    }

    continueGame() {
        if (!this.isContinueActive) return;

        let canContinue = false;

        // 優先扣分
        if (this.score >= CONFIG.continueCost) {
            this.score -= CONFIG.continueCost;
            canContinue = true;
            this.showToast(`扣除 ${CONFIG.continueCost} 分接關成功！`, 'info');
        }
        // 其次扣代幣
        else if (this.credits > 0) {
            this.credits--;
            canContinue = true;
            this.showToast(`使用代幣接關！剩餘: ${this.credits}`, 'warning');
        }

        if (canContinue) {
            this.stopContinueCountdown();
            this.lives = 3; // 恢復 3 命
            this.resetBallAndPaddle();
            this.gameState = 'playing';
            this.updateUI();

            // 復活無敵時間 (3秒)
            this.paddle.isInvincible = true;
            this.paddle.alpha = 0.5; // 半透明效果
            setTimeout(() => {
                this.paddle.isInvincible = false;
                this.paddle.alpha = 1;
            }, 3000);

            this.sound.playPowerup(); // 復活音效
        } else {
            // 無法接關：分數不足且無代幣
            this.showToast('分數不足，無法接關！', 'error');
        }
    }

    winGame() {
        this.consecutiveLosses = 0; // 重置連續失敗計數
        const completedLevel = this.level;
        const wasBossLevel = this.isBossLevel(completedLevel);

        // 計算評級
        this.currentRank = this.calculateRank(completedLevel, this.score, this.maxCombo, this.missCount);
        const isNewBest = this.saveBestRank(completedLevel, this.currentRank);

        // ✅ FIX: 先檢查是否通關，避免關卡溢出到 29
        const bossNum = Math.floor(completedLevel / 7);
        const willComplete = (bossNum >= 4 && !this.endlessMode);

        // 只有非通關情況才增加關卡
        if (!willComplete) {
            this.level++;
        }
        this.updateHighScore();

        // 過關獎勵
        const maxLives = 10;
        let lifeMessage = '';
        let bonusMessage = '';

        if (wasBossLevel) {
            const isDragonLevel = this.isDragonBossLevel(completedLevel);

            if (isDragonLevel) {
                // 取得 Boss 類型判斷獎勵
                const bossNum = Math.floor(completedLevel / 7);

                if (bossNum === 2) {
                    // 🐲 Dragon Boss (L14)：+3 生命、+500 分、+1 代幣
                    if (!this.endlessMode) {
                        const bonusLives = Math.min(3, maxLives - this.lives);
                        this.lives = Math.min(this.lives + 3, maxLives);
                        this.credits++;
                        bonusMessage = `🐲 DRAGON 擊敗！+${bonusLives} 生命 +500 分 +1 代幣！`;
                    } else {
                        bonusMessage = `🐲 DRAGON 擊敗！+500 分！`;
                    }
                    this.score += 500;
                } else if (bossNum === 3) {
                    // 🐙 Kraken Boss (L21)：+3 生命、+600 分、+1 代幣
                    if (!this.endlessMode) {
                        const bonusLives = Math.min(3, maxLives - this.lives);
                        this.lives = Math.min(this.lives + 3, maxLives);
                        this.credits++;
                        bonusMessage = `🐙 KRAKEN 擊敗！+${bonusLives} 生命 +600 分 +1 代幣！`;
                    } else {
                        bonusMessage = `🐙 KRAKEN 擊敗！+600 分！`;
                    }
                    this.score += 600;
                } else if (bossNum >= 4) {
                    // ⚡ Mecha Boss (L28):獎勵和通關檢查
                    if (!this.endlessMode) {
                        // ✅ 正常模式：通關！
                        const bonusLives = Math.min(3, maxLives - this.lives);
                        this.lives = Math.min(this.lives + 3, maxLives);
                        this.credits++;
                        bonusMessage = `⚡ MECHA 擊敗！+${bonusLives} 生命 +800 分 +1 代幣！`;

                        // 🏆 遊戲通關！
                        this.gameCompleted = true;
                    } else {
                        // ✅ FIX I3: 無盡模式：L28 後繼續遊戲，不通關
                        bonusMessage = `⚡ MECHA 擊敗！+800 分！遊戲繼續...`;
                    }
                    this.score += 800;
                }
            } else {
                // 🧱 Mini-Boss (Level 7)：+2 生命、+300 分、無代幣
                if (!this.endlessMode) {
                    const bonusLives = Math.min(2, maxLives - this.lives);
                    this.lives = Math.min(this.lives + 2, maxLives);
                    bonusMessage = `🧱 MINI-BOSS 擊退！+${bonusLives} 生命 +300 分！`;
                } else {
                    bonusMessage = `🧱 MINI-BOSS 擊退！+300 分！`;
                }
                this.score += 300;
            }
        } else {
            // 普通關卡：+1 生命（無盡模式不加命）
            if (!this.endlessMode && this.lives < maxLives) {
                this.lives++;
                lifeMessage = '❤️ +1 生命！';
            } else if (!this.endlessMode) {
                lifeMessage = '❤️ 生命已滿！';
            } else {
                lifeMessage = '🎯 +100 分！';
                this.score += 100;
            }
        }


        // 🏆 遊戲通關檢查（打敗 3 個 Boss, L28）
        if (this.gameCompleted && !this.endlessMode) {
            this.gameState = 'gameover'; // 停止遊戲邏輯
            this.updateHighScore();
            this.sound.playWin();

            // ✅ FIX M1: 清理 Boss 實例
            if (this.bossManager) {
                this.bossManager.currentBoss = null;
            }

            // 顯示通關畫面
            const card = document.getElementById('scoreCard');
            const cardTitle = document.getElementById('cardTitle');

            // ✅ FIX: 使用 i18n 翻譯，移除硬編碼中文
            const completionMsg = t('messages.gameComplete') || '你征服了所有 Boss！';
            cardTitle.innerHTML = `
                <div style="font-size: 2.5rem; margin-bottom: 10px;">🏆 CONGRATULATIONS! 🏆</div>
                <div style="font-size: 1.2rem; color: #ffd700;">${completionMsg}</div>
                <div style="font-size: 0.9rem; opacity: 0.8; margin-top: 10px;">
                    🐲 Fire Dragon ✓ | 🐙 Ice Kraken ✓ | ⚡ Thunder Mecha ✓
                </div>
            `;

            // 填入其他數據
            document.getElementById('cardScore').textContent = Math.floor(this.score).toLocaleString();
            document.getElementById('cardMaxCombo').textContent = this.maxCombo > 0 ? `x${this.maxCombo}` : '-';
            document.getElementById('cardHighScore').textContent = Math.floor(this.highScore).toLocaleString();

            // 顯示卡片
            card.classList.remove('hidden');

            // 綁定重玩按鈕
            document.getElementById('playAgainBtn').onclick = () => {
                document.getElementById('scoreCard').classList.add('hidden');
                this.gameCompleted = false; // 重置通關狀態
                this.resetGame();
                this.gameState = 'idle';
                // ✅ FIX N1: 使用 i18n 翻譯，移除硬編碼中文
                this.showOverlay(t('messages.title'), t('messages.start'));
            };

            return; // 不繼續到下一關
        }

        // ✅ FIX: 球速每過一關增加 0.26，上限為 7
        this.currentBallSpeed = Math.min(this.currentBallSpeed + 0.26, CONFIG.maxBallSpeed);

        // 进入下一关
        this.initBricks();
        this.resetBallAndPaddle();
        this.particlePool.reset();

        // 重置失誤計數（新關卡）
        this.missCount = 0;

        this.updateUI();
        this.sound.playLevelComplete();

        // 檢查過關成就
        if (this.currentRank === 'S') this.playerStats.incrementStat('sRankCount');
        if (wasBossLevel) this.playerStats.incrementStat('bossKills');
        this.checkAchievementCondition('speed_demon');

        // 顯示過關訊息（評級為主，關卡為輔）
        const rankDisplay = this.getRankDisplay(this.currentRank);

        // NEW BEST 置頂且加大樣式
        const newBestHtml = isNewBest
            ? '<div style="font-size: 1.8rem; font-weight: 900; color: #fff; text-shadow: 0 0 10px #FFD700, 0 0 20px #FF00FF; margin-bottom: 15px; animation: pulse 0.5s infinite alternate;">🎉 NEW BEST! 🎉</div>'
            : '';

        const levelSubtitle = `<span style="font-size: 0.9rem; opacity: 0.7;">🎉 第 ${completedLevel} 关完成!</span>`;

        const titleContent = `${newBestHtml}${rankDisplay}`;

        if (wasBossLevel) {
            this.showOverlay(titleContent, `${levelSubtitle}<br>${bonusMessage}`);
        } else if (this.isBossLevel(this.level)) {
            // 下一關是 Boss 關
            this.showOverlay(titleContent, `${levelSubtitle}<br>${lifeMessage}<br>⚠️ 下一關是 BOSS 關！`);
        } else {
            this.showOverlay(titleContent, `${levelSubtitle}<br>${lifeMessage}按空格键进入下一关`);
        }

        this.gameState = 'win';
    }

    updateHighScore() {
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('brickBreakerHighScore', this.highScore);
            document.getElementById('highScore').textContent = this.highScore;
        }
    }

    // ===== 評級系統 =====

    // 計算當前評級（S/A/B/C/D）
    calculateRank(level, score, maxCombo, missCount) {
        // 目標分數（隨關卡增加）
        const targetScore = 1000 + (level - 1) * 500;

        // S 級：完美表現
        if (missCount === 0 && maxCombo >= 20 && score >= targetScore * 1.5) {
            return 'S';
        }

        // A 級：優秀表現
        if (missCount <= 1 && maxCombo >= 15 && score >= targetScore * 1.2) {
            return 'A';
        }

        // B 級：良好表現
        if (missCount <= 2 && maxCombo >= 10 && score >= targetScore) {
            return 'B';
        }

        // C 級：基本過關
        if (missCount <= 3) {
            return 'C';
        }

        // D 級：未達標
        return 'D';
    }

    // 載入最佳評級
    loadBestRanks() {
        const saved = localStorage.getItem('brickBreakerBestRanks');
        if (saved) {
            try {
                this.bestRanks = JSON.parse(saved);
            } catch (e) {
                this.bestRanks = {};
            }
        }
    }

    // 儲存最佳評級
    saveBestRank(level, rank) {
        const rankValue = { 'S': 5, 'A': 4, 'B': 3, 'C': 2, 'D': 1 };
        const currentBest = this.bestRanks[level];

        if (!currentBest || rankValue[rank] > rankValue[currentBest]) {
            this.bestRanks[level] = rank;
            localStorage.setItem('brickBreakerBestRanks', JSON.stringify(this.bestRanks));
            return true; // 新紀錄
        }
        return false;
    }

    // 取得評級顏色（霓虹色）
    getRankColor(rank) {
        const colors = {
            'S': '#FFD700',  // 金色
            'A': '#9B59B6',  // 紫色
            'B': '#3498DB',  // 藍色
            'C': '#2ECC71',  // 綠色
            'D': '#95A5A6'   // 灰色
        };
        return colors[rank] || '#95A5A6';
    }

    // 取得評級顯示文字（獎牌+霓虹字母+描述）
    getRankDisplay(rank) {
        const imgPath = `assets/rank_${rank.toLowerCase()}.png`;
        // 評級圖片為主角 - 大圖片 + 動畫
        const imgHtml = `<img src="${imgPath}" alt="${rank}" class="rank-display-img" style="width: 120px; height: 120px; display: block; margin: 0 auto 10px; animation: popIn 0.8s ease;">`;

        const rankLabels = {
            'S': 'S-Rank ★ PERFECT!',
            'A': 'A-Rank ★ EXCELLENT!',
            'B': 'B-Rank ★ GOOD!',
            'C': 'C-Rank ★ PASS',
            'D': 'D-Rank ★ TRY AGAIN'
        };

        return `${imgHtml}<span class="rank-${rank.toLowerCase()}" style="font-size: 1.5rem;">${rankLabels[rank] || 'Rank'}</span>`;
    }

    // 计算游戏评级
    calculateRank() {
        if (this.score >= 10000 || this.maxCombo >= 20) return 'S';
        if (this.score >= 5000 || this.maxCombo >= 15) return 'A';
        if (this.score >= 2000 || this.maxCombo >= 10) return 'B';
        return 'C';
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

        // ===== 评级徽章系统 (Assets) =====
        const rank = this.calculateRank();
        const rankBadge = document.getElementById('cardRankBadge');
        if (rankBadge) {
            rankBadge.src = `assets/rank_${rank}.png`;
            rankBadge.alt = `Rank ${rank.toUpperCase()}`;
            rankBadge.classList.remove('hidden');
            // 添加弹入动画
            rankBadge.style.animation = 'none';
            rankBadge.offsetHeight; /* trigger reflow */
            rankBadge.style.animation = 'popIn 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        }

        // ===== 情緒反饋系統 =====
        const feedbackEl = document.getElementById('cardFeedback');
        feedbackEl.className = 'card-feedback'; // 重置 class

        let feedbackText = '';
        if (this.score >= this.highScore && this.score > 0) {
            feedbackText = '🎉 新紀錄！太厲害了！';
            feedbackEl.classList.add('new-record');
        } else if (this.score >= this.highScore * 0.8) {
            feedbackText = '💪 差一點破紀錄，再接再厲！';
        } else if (this.maxCombo >= 10) {
            feedbackText = '🔥 超強連擊！技術一流！';
        } else if (this.maxCombo >= 5) {
            feedbackText = '👍 不錯的表現！繼續加油！';
        } else if (this.score >= 500) {
            feedbackText = '👌 表現穩定，繼續保持！';
        } else {
            feedbackText = '💡 多練習，你可以的！';
            feedbackEl.classList.add('try-again');
        }
        feedbackEl.textContent = feedbackText;

        // ===== 連擊高亮 =====
        const comboStat = document.getElementById('comboStat');
        comboStat.className = 'card-stat combo-highlight'; // 重置 class
        if (this.maxCombo >= 8) {
            comboStat.classList.add('awesome');
        }

        card.classList.remove('hidden');

        // 绑定按钮
        document.getElementById('playAgainBtn').onclick = () => {
            this.hideScoreCard();
            this.resetGame();
            this.gameState = 'idle';
            this.showOverlay(t('messages.title'), t('messages.start'));
        };
        document.getElementById('shareBtn').onclick = () => this.shareScore();

        // 排行榜相关按钮
        document.getElementById('saveScoreBtn').onclick = () => {
            const name = document.getElementById('playerName').value;
            this.saveToLeaderboard(name);
        };
        document.getElementById('viewLeaderboardBtn').onclick = () => this.showLeaderboard();
        document.getElementById('viewLeaderboardBtn').onclick = () => this.showLeaderboard();

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

    // 显示分享模态框
    showShareModal() {
        const dataUrl = this.generateShareImage();
        const img = document.getElementById('shareImage');
        img.src = dataUrl;

        const modal = document.getElementById('shareModal');
        modal.classList.remove('hidden');

        // 下载按钮
        document.getElementById('downloadShareBtn').onclick = () => {
            const link = document.createElement('a');
            link.download = `brick-breaker-score-${Date.now()}.png`;
            link.href = dataUrl;
            link.click();
        };

        // 复制按钮
        document.getElementById('copyShareBtn').onclick = async () => {
            try {
                const blob = await (await fetch(dataUrl)).blob();
                await navigator.clipboard.write([
                    new ClipboardItem({
                        'image/png': blob
                    })
                ]);
                const btn = document.getElementById('copyShareBtn');
                const originalText = btn.innerHTML;
                btn.innerHTML = '✅ 已複製！';
                setTimeout(() => btn.innerHTML = originalText, 2000);
            } catch (err) {
                console.error('Failed to copy image: ', err);
                this.showToast('複製失敗，請長按圖片保存', 'error');
            }
        };

        // 关闭按钮
        document.getElementById('closeShareBtn').onclick = () => {
            modal.classList.add('hidden');
        };

        // 点击背景关闭
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
            }
        };
    }

    // 生成分享图片
    generateShareImage() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 600;
        canvas.height = 800;

        // 1. 背景
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#1e293b');
        gradient.addColorStop(1, '#0f172a');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 2. 装饰
        ctx.save();
        ctx.globalAlpha = 0.1;
        ctx.fillStyle = '#4ade80';
        ctx.beginPath();
        ctx.arc(100, 100, 150, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#3b82f6';
        ctx.beginPath();
        ctx.arc(500, 700, 200, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // 3. 标题
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 48px "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Brick Breaker', canvas.width / 2, 80);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '24px "Segoe UI", Roboto, sans-serif';
        const today = new Date();
        const dateStr = `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}`;
        ctx.fillText(dateStr, canvas.width / 2, 130);

        // 4. 卡片
        const cardY = 180;
        const cardHeight = 450;
        const cardWidth = 500;
        const cardX = (canvas.width - cardWidth) / 2;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        if (ctx.roundRect) {
            ctx.beginPath();
            ctx.roundRect(cardX, cardY, cardWidth, cardHeight, 20);
            ctx.fill();
        } else {
            ctx.fillRect(cardX, cardY, cardWidth, cardHeight);
        }
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 分数
        ctx.fillStyle = '#cbd5e1';
        ctx.font = '32px "Segoe UI", Roboto, sans-serif';
        ctx.fillText(t('scoreCard.finalScore'), canvas.width / 2, cardY + 70);

        ctx.fillStyle = '#4ade80';
        ctx.font = 'bold 80px "Segoe UI", Roboto, sans-serif';
        ctx.fillText(Math.floor(this.score).toLocaleString(), canvas.width / 2, cardY + 150);

        // 连击
        ctx.fillStyle = '#cbd5e1';
        ctx.font = '28px "Segoe UI", Roboto, sans-serif';
        ctx.fillText(t('scoreCard.maxCombo'), canvas.width / 2, cardY + 240);

        ctx.fillStyle = '#facc15';
        ctx.font = 'bold 60px "Segoe UI", Roboto, sans-serif';
        ctx.fillText(`x${this.maxCombo}`, canvas.width / 2, cardY + 310);

        // 评语
        let feedback = '';
        if (this.score >= this.highScore && this.score > 0) feedback = '🎉 Innovative Record!';
        else if (this.score >= this.highScore * 0.8) feedback = '💪 So Close!';
        else if (this.maxCombo >= 10) feedback = '🔥 Combo Master!';
        else if (this.score >= 500) feedback = '👌 Great Run!';
        else feedback = '💡 Play Again!';

        // 简单映射回中文如果需要，或者直接用英文/简单符号
        if (currentLang === 'zh-TW') {
            if (feedback.includes('Record')) feedback = '🎉 新紀錄！';
            else if (feedback.includes('Close')) feedback = '💪 差一點破紀錄！';
            else if (feedback.includes('Master')) feedback = '🔥 連擊大師！';
            else if (feedback.includes('Run')) feedback = '👌 表現不錯！';
            else feedback = '💡 再接再厲！';
        }

        ctx.fillStyle = '#ffffff';
        ctx.font = 'italic 30px "Segoe UI", Roboto, sans-serif';
        ctx.fillText(feedback, canvas.width / 2, cardY + 390);

        // 5. Footer
        ctx.fillStyle = '#64748b';
        ctx.font = '18px "Segoe UI", Roboto, sans-serif';
        ctx.fillText('Play at: chinggpt2025.github.io/brick-breaker', canvas.width / 2, canvas.height - 40);

        return canvas.toDataURL('image/png');
    }

    // 触发分享
    shareScore() {
        this.showShareModal();
    }

    // ===== 排行榜系統 (v1.15 重構) =====

    // ✅ 安全的 DOM 操作
    _safeGetEl(id) {
        return document.getElementById(id);
    }

    _safeSetText(id, text) {
        const el = this._safeGetEl(id);
        if (el) el.textContent = text;
    }

    _safeSetHtml(id, html) {
        const el = this._safeGetEl(id);
        if (el) el.innerHTML = html;
    }

    _safeToggleClass(id, className, add) {
        const el = this._safeGetEl(id);
        if (el) el.classList[add ? 'remove' : 'add'](className);
    }

    // 保存成绩到排行榜 (v1.15 重構)
    async saveToLeaderboard(name) {
        // ✅ 防重複提交
        if (this._isSavingScore) {
            this.showToast('正在保存中...', 'info');
            return;
        }
        this._isSavingScore = true;

        const today = new Date();
        const seedStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;

        // ✅ 名稱驗證與清理
        const cleanName = (name || '').trim().substring(0, 12) || '匿名玩家';

        try {
            const { error } = await supabase
                .from('scores')
                .insert({
                    player_name: cleanName,
                    score: Math.floor(this.score),
                    max_combo: this.maxCombo,
                    seed: seedStr
                });

            if (error) throw error;

            // ✅ 安全的 DOM 更新
            const saveHint = this._safeGetEl('saveHint');
            const nameSection = this._safeGetEl('nameInputSection');

            if (saveHint) saveHint.classList.remove('hidden');
            if (nameSection) nameSection.style.display = 'none';

            setTimeout(() => {
                if (saveHint) saveHint.classList.add('hidden');
            }, 2000);

            this.showToast('成績已保存！', 'success');
        } catch (err) {
            console.error('保存失败:', err);
            this.showToast('保存失敗，請檢查網路連接', 'error');
        } finally {
            this._isSavingScore = false;
        }
    }

    // 获取排行榜 (v1.19 加入快取機制)
    async getLeaderboard(forceRefresh = false) {
        const today = new Date();
        const seedStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;

        // ✅ 快取檢查 (2 分鐘 TTL)
        const cacheKey = `leaderboard_${seedStr}`;
        const cacheTTL = 2 * 60 * 1000; // 2 分鐘

        if (!forceRefresh && this._leaderboardCache && this._leaderboardCache.key === cacheKey) {
            if (Date.now() - this._leaderboardCache.timestamp < cacheTTL) {
                console.debug('使用排行榜快取');
                return this._leaderboardCache.data;
            }
        }

        try {
            const { data, error } = await supabase
                .from('scores')
                .select('player_name, score, max_combo')
                .eq('seed', seedStr)
                .order('score', { ascending: false })
                .limit(10);

            if (error) {
                console.debug('排行榜查詢失敗:', error);
                return this._leaderboardCache?.data || [];
            }

            // ✅ 更新快取
            this._leaderboardCache = {
                key: cacheKey,
                timestamp: Date.now(),
                data: data || []
            };

            return data || [];
        } catch (err) {
            console.error('获取排行榜失败:', err);
            return this._leaderboardCache?.data || [];
        }
    }

    // 显示排行榜 (v1.15 重構)
    async showLeaderboard() {
        const today = new Date();
        const seedStr = `#${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;

        // ✅ 安全的 DOM 更新
        this._safeSetText('leaderboardSeed', seedStr);

        const list = this._safeGetEl('leaderboardList');
        const modal = this._safeGetEl('leaderboardModal');

        if (!list || !modal) {
            console.error('排行榜 DOM 元素不存在');
            this.showToast('排行榜載入失敗', 'error');
            return;
        }

        // ✅ 顯示載入狀態
        list.innerHTML = '<li class="leaderboard-empty">加载中...</li>';
        modal.classList.remove('hidden');

        const leaderboard = await this.getLeaderboard();

        if (leaderboard.length === 0) {
            list.innerHTML = '<li class="leaderboard-empty">暂无记录，成为第一名吧！</li>';
        } else {
            list.innerHTML = leaderboard.map((entry, index) => {
                // ✅ 安全的數值處理
                const score = typeof entry.score === 'number' ? entry.score : 0;
                const name = this.escapeHtml(entry.player_name || '匿名');
                return `
                    <li>
                        <span class="rank">${index + 1}.</span>
                        <span class="name">${name}</span>
                        <span class="lb-score">${score.toLocaleString()}</span>
                    </li>
                `;
            }).join('');
        }
    }

    // 防止 XSS 攻擊的 HTML 轉義
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 隐藏排行榜
    hideLeaderboard() {
        const modal = this._safeGetEl('leaderboardModal');
        if (modal) modal.classList.add('hidden');
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

            // 球的渐变（穿透模式或冰凍模式時顯示特殊顏色）
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
            } else if (ball.isFrozen) {
                // 冰凍狀態：冰藍色
                gradient = this.ctx.createRadialGradient(
                    ball.x - 3, ball.y - 3, 0,
                    ball.x, ball.y, ball.radius
                );
                gradient.addColorStop(0, '#fff');
                gradient.addColorStop(0.3, '#87ceeb');
                gradient.addColorStop(1, '#00bfff');

                // 冰凍發光效果
                this.ctx.save();
                this.ctx.shadowColor = '#00bfff';
                this.ctx.shadowBlur = 10;
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

            if (ball.pierce || ball.isFrozen) {
                this.ctx.restore();
            }
        }
    }

    // 绘制砖块
    drawBricks() {
        for (let c = 0; c < CONFIG.brickColumnCount; c++) {
            // ✅ FIX: 使用實際陣列長度，確保 Boss 關卡額外 2 層磚塊也能被繪製
            for (let r = 0; r < this.bricks[c].length; r++) {
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

                    // 繪製特殊磚塊圖標
                    if (brick.specialType) {
                        this.ctx.font = '16px Arial';
                        this.ctx.textAlign = 'center';
                        this.ctx.textBaseline = 'middle';
                        const cx = brick.x + CONFIG.brickWidth / 2;
                        const cy = brick.y + CONFIG.brickHeight / 2 + 2;

                        switch (brick.specialType) {
                            case 'bomb':
                                this.ctx.fillText('💣', cx, cy);
                                break;
                            case 'gold':
                                this.ctx.fillText('⭐', cx, cy);
                                break;
                            case 'lightning':
                                this.ctx.fillText('⚡', cx, cy);
                                break;
                            case 'shield':
                                this.ctx.fillText('🛡️', cx, cy);
                                break;
                            case 'freeze':
                                this.ctx.fillText('❄️', cx, cy);
                                break;
                            case 'teleport':
                                this.ctx.fillText('🌀', cx, cy);
                                break;
                            case 'random':
                                this.ctx.fillText('🎲', cx, cy);
                                break;
                        }
                    }

                    // === 菁英磚塊專屬繪製 ===
                    if (brick.isElite && brick.eliteType) {
                        this.drawEliteBrickEffects(brick);
                    }
                }
            }
        }
    }

    // 繪製菁英磚塊特殊效果
    drawEliteBrickEffects(brick) {
        const now = performance.now();
        const eliteType = brick.eliteType;

        // === 躁動動畫計算 ===
        const cycleTime = 3000; // 3秒一個週期
        const phase = ((now + brick.agitationPhase * 1000) % cycleTime) / cycleTime;
        const isAgitated = phase > 0.85; // 最後 15% 時間進入躁動

        let offsetX = 0, offsetY = 0;

        if (isAgitated) {
            // 快速隨機抖動
            offsetX = (Math.random() - 0.5) * 6;
            offsetY = (Math.random() - 0.5) * 4;

            // 躁動時播放音效（節流）
            if (!brick.lastRumbleTime || now - brick.lastRumbleTime > 500) {
                this.sound.playEliteRumble();
                brick.lastRumbleTime = now;
            }
        }

        const cx = brick.x + CONFIG.brickWidth / 2 + offsetX;
        const cy = brick.y + CONFIG.brickHeight / 2 + offsetY;

        this.ctx.save();

        // === 發光邊框 ===
        this.ctx.shadowColor = eliteType.glowColor;
        this.ctx.shadowBlur = isAgitated ? 25 : 12;

        // 重繪磚塊（帶發光）
        this.ctx.beginPath();
        this.ctx.roundRect(
            brick.x + offsetX,
            brick.y + offsetY,
            CONFIG.brickWidth,
            CONFIG.brickHeight,
            4
        );
        this.ctx.strokeStyle = eliteType.color;
        this.ctx.lineWidth = 3;
        this.ctx.stroke();

        // === 菁英磚塊 Emoji ===
        this.ctx.shadowBlur = 0;
        this.ctx.font = 'bold 20px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(eliteType.emoji, cx, cy);

        // === HP 條 ===
        const hpBarWidth = CONFIG.brickWidth - 10;
        const hpBarHeight = 4;
        const hpBarX = brick.x + 5 + offsetX;
        const hpBarY = brick.y + CONFIG.brickHeight + 2 + offsetY;
        const hpRatio = brick.hits / brick.maxHits;

        // 背景
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(hpBarX, hpBarY, hpBarWidth, hpBarHeight);

        // 血量
        this.ctx.fillStyle = eliteType.color;
        this.ctx.fillRect(hpBarX, hpBarY, hpBarWidth * hpRatio, hpBarHeight);

        this.ctx.restore();
    }

    // 更新菁英磚塊 (攻擊計時)
    updateEliteBricks(deltaTime) {
        const now = performance.now();

        for (let i = this.eliteBricks.length - 1; i >= 0; i--) {
            const brick = this.eliteBricks[i];

            // 如果磚塊已被消滅，從菁英列表移除
            if (brick.status !== 1) {
                this.eliteBricks.splice(i, 1);
                this.score += brick.eliteType.points;
                this.showToast(`💀 ${brick.eliteType.name} 被擊敗！+${brick.eliteType.points}`, 'success');
                continue;
            }

            const eliteType = brick.eliteType;

            // 磁力核心：持續效果（吸引球）
            if (eliteType.attackType === 'magnet') {
                this.applyMagnetEffect(brick);
                continue;
            }

            // 其他類型：定時攻擊
            if (eliteType.attackInterval > 0) {
                brick.attackTimer += deltaTime;

                // 蓄力提示 (攻擊前 500ms)
                if (brick.attackTimer >= eliteType.attackInterval - 500 && !brick.chargePlayed) {
                    this.sound.playEliteCharge();
                    brick.chargePlayed = true;
                }

                if (brick.attackTimer >= eliteType.attackInterval) {
                    brick.attackTimer = 0;
                    brick.chargePlayed = false;
                    this.executeEliteAttack(brick);
                }
            }
        }
    }

    // 執行菁英磚塊攻擊
    executeEliteAttack(brick) {
        const eliteType = brick.eliteType;
        const cx = brick.x + CONFIG.brickWidth / 2;
        const cy = brick.y + CONFIG.brickHeight;

        switch (eliteType.attackType) {
            case 'fireball':
                // 發射火球
                this.eliteProjectiles.push({
                    x: cx,
                    y: cy,
                    dx: (Math.random() - 0.5) * 2, // 輕微水平擺動
                    dy: eliteType.projectileSpeed,
                    type: 'fireball',
                    color: eliteType.projectileColor,
                    size: 15
                });
                this.sound.playEliteFireball();
                break;

            case 'lightning':
                // 閃電攻擊：全螢幕閃光 + 玩家短暫減速
                this.flashScreen('#74b9ff', 200);
                this.eliteSlowTimer = eliteType.slowDuration;
                this.sound.playLightning();
                this.showToast('⚡ 雷擊！移動減速！', 'warning');
                break;
        }
    }

    // 磁力效果：吸引球向磚塊偏移
    applyMagnetEffect(brick) {
        const eliteType = brick.eliteType;
        const brickCx = brick.x + CONFIG.brickWidth / 2;
        const brickCy = brick.y + CONFIG.brickHeight / 2;

        for (const ball of this.balls) {
            if (ball.held) continue;

            const dx = brickCx - ball.x;
            const dy = brickCy - ball.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 200 && dist > 10) { // 在 200px 範圍內
                const force = eliteType.pullStrength * (1 - dist / 200);
                ball.x += (dx / dist) * force;
                ball.y += (dy / dist) * force;
            }
        }
    }

    // 更新菁英投射物
    updateEliteProjectiles(deltaTime) {
        const ts = this.timeScale || 1;

        for (let i = this.eliteProjectiles.length - 1; i >= 0; i--) {
            const p = this.eliteProjectiles[i];

            p.x += p.dx * ts;
            p.y += p.dy * ts;

            // 碰撞檢測：投射物 vs 擋板
            if (p.y + p.size > this.paddle.y &&
                p.y < this.paddle.y + this.paddle.height &&
                p.x > this.paddle.x &&
                p.x < this.paddle.x + this.paddle.width) {

                // 擊中擋板
                this.lives--;
                this.updateUI();
                this.showToast('🔥 被火球擊中！-1 生命', 'error');
                this.eliteProjectiles.splice(i, 1);

                if (this.lives <= 0) {
                    this.gameOver();
                }
                continue;
            }

            // 超出畫面移除
            if (p.y > CONFIG.canvasHeight + 20) {
                this.eliteProjectiles.splice(i, 1);
            }
        }

        // 更新玩家減速效果
        if (this.eliteSlowTimer > 0) {
            this.eliteSlowTimer -= deltaTime;
            // 減速效果在 updatePaddle 中處理
        }
    }

    // 繪製菁英投射物
    drawEliteProjectiles() {
        for (const p of this.eliteProjectiles) {
            this.ctx.save();

            // ✅ FIX: 統一使用紫色外光
            this.ctx.shadowColor = '#9b59b6';
            this.ctx.shadowBlur = 15;

            // 火球
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fillStyle = '#9b59b6'; // ✅ 紫色填充
            this.ctx.fill();

            // Emoji
            this.ctx.shadowBlur = 0;
            this.ctx.font = '16px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('🔥', p.x, p.y); // ✅ 使用火焰 emoji

            this.ctx.restore();
        }
    }

    // 閃屏效果
    flashScreen(color, duration) {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: ${color};
            opacity: 0.5;
            pointer-events: none;
            z-index: 9999;
            transition: opacity ${duration}ms ease-out;
        `;
        document.body.appendChild(overlay);

        // 淡出
        setTimeout(() => {
            overlay.style.opacity = '0';
            setTimeout(() => overlay.remove(), duration);
        }, 50);
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

    // 觸發連擊視覺效果
    triggerComboEffect(combo, x, y) {
        if (combo < 3) return; // 3連擊以上才顯示

        let text = `COMBO x${combo}`;
        let color = '#fff';
        let size = 20;
        let shake = 0;

        if (combo >= 16) {
            text = `ULTIMATE x${combo}!!!`;
            color = '#ff00ff'; // 彩虹脉冲需在 draw 中处理，这里给个基色
            size = 40;
            shake = 10;
        } else if (combo >= 10) {
            text = `SUPER x${combo}!!`;
            color = '#ff4500'; // 橙红色
            size = 30;
            shake = 5;
        } else if (combo >= 6) {
            text = `COMBO x${combo}!`;
            color = '#00bfff'; // 亮蓝色
            size = 25;
            shake = 2;
        }

        // 添加到浮動文字列表
        this.floatingTexts.push({
            text: text,
            x: x,
            y: y,
            color: color,
            size: size,
            life: 1.0, // 生命週期 1.0 -> 0
            velocity: { x: (Math.random() - 0.5) * 2, y: -2 }, // 向上飄
            shake: shake,
            isRainbow: combo >= 16
        });

        // 震動屏幕
        if (shake > 0) {
            this.triggerShake(shake, shake * 2);
        }

        // 檢查連擊成就
        this.checkAchievementCondition('combo');

        // 播放連擊音效
        this.sound.playComboSound(combo);
    }


    // 更新浮動文字
    updateFloatingTexts(deltaTime) {
        // 使用 deltaTime 但要考慮它是毫秒，我們需要秒或幀
        // 這裡簡單用 1/60 或 deltaTime/16 來調整
        const dt = 0.016; // 假設 60fps

        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const ft = this.floatingTexts[i];
            ft.life -= dt;
            ft.x += ft.velocity.x;
            ft.y += ft.velocity.y;

            if (ft.life <= 0) {
                this.floatingTexts.splice(i, 1);
            }
        }
    }

    // 更新勝利動畫效果
    updateWinEffects(deltaTime) {
        this.fireworkTimer += deltaTime;

        // 每 500ms 發射一次煙火
        if (this.fireworkTimer > 500) {
            this.fireworkTimer = 0;

            // 隨機位置
            const x = Math.random() * CONFIG.canvasWidth;
            const y = Math.random() * (CONFIG.canvasHeight / 2); // 上半部

            // 隨機顏色
            const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
            const color = colors[Math.floor(Math.random() * colors.length)];

            // 產生爆炸粒子
            this.createParticles(x, y, color, 30, true);

            // 播放音效 (隨機音調)
            if (this.sound.enabled) {
                this.sound.playTone(400 + Math.random() * 400, 0.1, 'square', 0.2);
            }
        }
    }

    // 解鎖成就
    unlockAchievement(achievement) {
        if (this.playerStats.unlockAchievement(achievement.id)) {
            this.showAchievementPopup(achievement);
            if (this.sound.enabled) {
                // 成就解鎖音效 (上行琶音)
                this.sound.playTone(523, 0.1, 'sine'); // C5
                setTimeout(() => this.sound.playTone(659, 0.1, 'sine'), 100); // E5
                setTimeout(() => this.sound.playTone(784, 0.2, 'sine'), 200); // G5
            }
        }
    }

    // 檢查條件類成就
    checkAchievementCondition(type) {
        ACHIEVEMENTS.forEach(ach => {
            if (ach.type === 'event' && !this.playerStats.unlockedAchievements.includes(ach.id)) {
                if (ach.condition(this)) {
                    this.unlockAchievement(ach);
                }
            }
        });
    }

    // 顯示成就彈窗
    showAchievementPopup(achievement) {
        const popup = document.createElement('div');
        popup.className = 'achievement-popup';
        popup.innerHTML = `
            <div class="ach-icon">${achievement.icon}</div>
            <div class="ach-content">
                <div class="ach-title">ACHIEVEMENT UNLOCKED!</div>
                <div class="ach-name">${achievement.title}</div>
                <div class="ach-desc">${achievement.desc}</div>
            </div>
        `;
        document.body.appendChild(popup);

        // 動畫進場
        requestAnimationFrame(() => popup.classList.add('visible'));

        // 5秒後移除
        setTimeout(() => {
            popup.classList.remove('visible');
            setTimeout(() => popup.remove(), 500);
        }, 4000);
    }

    // 繪製浮動文字
    drawFloatingTexts() {
        for (const ft of this.floatingTexts) {
            this.ctx.save();

            // 震動效果
            let dx = 0, dy = 0;
            if (ft.shake > 0) {
                dx = (Math.random() - 0.5) * ft.shake;
                dy = (Math.random() - 0.5) * ft.shake;
            }

            this.ctx.translate(ft.x + dx, ft.y + dy);

            // 縮放動畫 (彈出效果)
            const scale = 1 + Math.sin((1 - ft.life) * Math.PI) * 0.2;
            this.ctx.scale(scale, scale);

            // 設置字體和顏色
            this.ctx.font = `bold ${ft.size}px "Press Start 2P", Arial`; // 優先使用 pixel font
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';

            // 透明度漸變
            this.ctx.globalAlpha = Math.max(0, ft.life);

            if (ft.isRainbow) {
                // 彩虹效果
                const hue = (Date.now() / 5) % 360;
                this.ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
                this.ctx.shadowColor = `hsl(${hue}, 100%, 70%)`;
                this.ctx.shadowBlur = 10;
            } else {
                this.ctx.fillStyle = ft.color;
                this.ctx.shadowColor = ft.color;
                this.ctx.shadowBlur = 10;
            }

            // 描邊
            this.ctx.strokeStyle = 'black';
            this.ctx.lineWidth = 3;
            this.ctx.strokeText(ft.text, 0, 0);
            this.ctx.fillText(ft.text, 0, 0);

            this.ctx.restore();
        }
    }

    // 游戏主循环
    gameLoop() {
        // 计算 deltaTime
        const now = performance.now();
        const deltaTime = now - this.lastTime;
        this.lastTime = now;

        // 幀率獨立：計算時間縮放因子（目標 60 FPS = 16.67ms 每幀）
        const targetFrameTime = 1000 / 60; // 16.67ms
        this.timeScale = Math.min(deltaTime / targetFrameTime, 3); // 限制最大 3 倍，防止跳幀過大

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
        this.particlePool.updateAndDraw(this.ctx, this.hexToRgb, this.timeScale);

        // 绘制游戏对象
        this.drawBricks();
        this.drawPaddle();
        this.drawBall();
        this.drawPowerups(); // 绘制道具
        this.drawShield(); // 繪製護盾

        // 繪製 Boss（如果存在）
        if (this.bossManager) {
            this.bossManager.draw(this.ctx);
        }

        // 繪製浮動文字 (最上層)
        this.drawFloatingTexts();

        this.ctx.restore(); // 恢复坐标系

        // 如果游戏正在进行中，更新游戏逻辑
        if (this.gameState === 'playing' || this.gameState === 'win') {
            // 即使在 win 狀態下也讓文字繼續飄動
            this.updateFloatingTexts(deltaTime);

            if (this.gameState === 'win') {
                this.updateWinEffects(deltaTime);
            }
        }

        if (this.gameState === 'playing') {
            this.updatePaddle();
            this.updateBall();
            this.checkBrickCollision();
            this.updatePowerups(); // 更新道具位置
            this.updateActivePowerups(deltaTime); // 更新道具计时器
            this.updateShield(deltaTime); // 更新護盾計時器
            this.updateEndlessMode(deltaTime); // 更新无尽模式

            // Boss 系統更新
            if (this.bossManager && this.bossManager.currentBoss) {
                this.bossManager.update(deltaTime);

                // Boss 碰撞檢測
                const bossResult = this.bossManager.checkCollisions(this.balls, this.paddle);
                if (bossResult.paddleHit) {
                    this.lives--;
                    this.updateUI();
                    this.sound.playBossHit(); // ✅ 播放 Boss 擊中音效

                    // 根據 Boss 類型顯示不同的擊中訊息
                    const attackMessages = {
                        dragon: '🔥 被火球擊中！',
                        kraken: '❄️ 被冰球擊中！',
                        mecha: '⚡ 被雷電擊中！'
                    };
                    const bossType = this.bossManager.currentBoss.type || 'dragon';
                    const msg = attackMessages[bossType] || '被攻擊！';
                    this.showToast(`${msg}-1 生命`, 'error');

                    if (this.lives <= 0) {
                        this.bossManager.onPlayerFail();
                        this.gameOver();
                    }
                }

                // 檢查 Boss 是否被擊敗（僅顯示 Toast，不直接呼叫 winGame）
                if (this.bossManager.isBossDefeated() && !this.bossDefeatedHandled) {
                    this.bossDefeatedHandled = true; // 防止重複顯示
                    this.showToast(`🏆 ${this.bossManager.getBossName()} 被擊敗！`, 'success');
                    this.bossManager.resetDifficultyReduction();
                    // 不直接呼叫 winGame()，讓 checkWin() 統一處理過關邏輯
                }
            }

            // === 菁英磚塊系統更新 ===
            if (this.eliteBricks && this.eliteBricks.length > 0) {
                this.updateEliteBricks(deltaTime);
                this.updateEliteProjectiles(deltaTime);
                this.drawEliteProjectiles();
            }

            // 閒置掉落檢查：3秒未撞擊磚塊，掉3個隨機道具 (持續觸發)
            const timeSinceLastHit = now - this.lastBrickHitTime;
            // v1.6.1: Drop powerups every 3 seconds while idle (not just once)
            if (timeSinceLastHit >= 3000) {
                this.triggerIdleDrop();
                // Reset timer so next drop is 3 seconds later (not immediately)
                this.lastBrickHitTime = now;
            }
        }

        // 继续游戏循环
        requestAnimationFrame(() => this.gameLoop());
    }
}

// 启动游戏
window.addEventListener('load', () => {
    new BrickBreakerGame();

    // ===== 訪客統計系統 =====
    initVisitorStats();
});

// ===== 訪客統計系統 (v1.14 重構版) =====
async function initVisitorStats() {
    // ✅ 配置
    const HEARTBEAT_INTERVAL = 30000;  // 30 秒
    const STATS_INTERVAL = 60000;      // 60 秒
    const MAX_RETRIES = 3;

    let supabaseActive = true;
    let retryCount = 0;

    // ✅ 安全的 DOM 更新
    function safeSetText(id, text) {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    }

    // ✅ 格式化數字
    function formatNumber(num) {
        if (typeof num !== 'number' || isNaN(num)) return '-';
        if (num >= 10000) return (num / 1000).toFixed(1) + 'k';
        return num.toLocaleString();
    }

    // ✅ 安全的查詢包裝器（獨立容錯）
    async function safeQuery(queryFn, fallback = null, label = '') {
        try {
            const result = await queryFn();
            if (result.error) {
                console.debug(`查詢失敗 [${label}]:`, result.error);
                return fallback;
            }
            return result;
        } catch (e) {
            console.debug(`查詢異常 [${label}]:`, e);
            return fallback;
        }
    }

    // ✅ 顯示離線狀態
    function showOffline(error = null) {
        let status = '離線';
        if (error?.code) status += ` (${error.code})`;
        else if (error?.status) status += ` (${error.status})`;

        safeSetText('statTotalVisitors', status);
        safeSetText('statTodayVisitors', '-');
        safeSetText('statOnlinePlayers', '-');
        safeSetText('statTodayChallengers', '-');
    }

    // ===== 1. 生成訪客 ID =====
    let visitorId = localStorage.getItem('brick_visitor_id');
    if (!visitorId) {
        visitorId = 'v_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
        localStorage.setItem('brick_visitor_id', visitorId);
    }

    // ===== 2. 記錄訪問（容錯） =====
    const visitResult = await safeQuery(
        () => supabase.from('visits').insert({ visitor_id: visitorId }),
        null, 'recordVisit'
    );
    if (!visitResult) {
        supabaseActive = false;
        showOffline();
    }

    // ===== 3. 心跳更新 =====
    async function updateHeartbeat() {
        if (!supabaseActive) return;
        await safeQuery(
            () => supabase.from('active_users').upsert(
                { visitor_id: visitorId, last_seen: new Date().toISOString() },
                { onConflict: 'visitor_id' }
            ),
            null, 'heartbeat'
        );
    }

    // 首次心跳 + 定時器
    if (supabaseActive) updateHeartbeat();
    const heartbeatTimer = setInterval(() => {
        if (supabaseActive) updateHeartbeat();
    }, HEARTBEAT_INTERVAL);

    // ===== 4. 離開頁面清理 =====
    window.addEventListener('beforeunload', () => {
        clearInterval(heartbeatTimer);
        if (supabaseActive) {
            // 使用 sendBeacon 或 fetch keepalive
            navigator.sendBeacon?.(`${SUPABASE_URL}/rest/v1/rpc/cleanup_user`,
                JSON.stringify({ visitor_id: visitorId }));
        }
    });

    // ===== 5. 更新統計（獨立容錯） =====
    async function updateStats() {
        if (!supabaseActive) {
            showOffline();
            return;
        }

        const today = new Date();
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const seedStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;

        // ✅ 每個查詢獨立，一個失敗不影響其他
        const [totalResult, todayResult, onlineResult, challengersResult] = await Promise.all([
            // 總訪客數
            safeQuery(() => supabase.from('visits').select('*', { count: 'exact', head: true }),
                { count: null }, 'totalVisitors'),
            // 今日訪客
            safeQuery(() => supabase.from('visits').select('visitor_id').gte('visited_at', todayStart),
                { data: [] }, 'todayVisitors'),
            // 在線人數
            safeQuery(() => supabase.from('active_users').select('*', { count: 'exact', head: true }).gte('last_seen', fiveMinutesAgo),
                { count: null }, 'onlinePlayers'),
            // 今日挑戰者
            safeQuery(() => supabase.from('scores').select('*', { count: 'exact', head: true }).eq('seed', seedStr),
                { count: null }, 'todayChallengers')
        ]);

        // 計算今日訪客不重複數
        const todayVisitors = todayResult?.data
            ? new Set(todayResult.data.map(v => v.visitor_id)).size
            : 0;

        // ✅ 漸進式更新 UI（有多少顯示多少）
        safeSetText('statTotalVisitors', formatNumber(totalResult?.count ?? 0));
        safeSetText('statTodayVisitors', formatNumber(todayVisitors));
        safeSetText('statOnlinePlayers', formatNumber(onlineResult?.count ?? 0));
        safeSetText('statTodayChallengers', formatNumber(challengersResult?.count ?? 0));

        // ✅ 成功則重置重試計數
        retryCount = 0;
    }

    // 首次載入 + 定時器
    if (supabaseActive) updateStats();
    const statsTimer = setInterval(() => {
        if (supabaseActive) updateStats();
    }, STATS_INTERVAL);
}
