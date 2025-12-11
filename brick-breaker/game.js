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
        this.lives = 5;
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

        for (let c = 0; c < CONFIG.brickColumnCount; c++) {
            this.bricks[c] = [];
            for (let r = 0; r < CONFIG.brickRowCount; r++) {
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
    }

    // 检查是否为 Boss 关卡（每 7 关：第 7、14、21...）
    isBossLevel(level) {
        return level >= 7 && level % 7 === 0;
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

    toggleSound(enabled) {
        if (enabled !== undefined) {
            this.sound.enabled = enabled;
        } else {
            this.sound.toggle();
        }
        localStorage.setItem('brickBreakerSound', this.sound.enabled);
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
            // 如果開啟且正在遊戲中，重新開始 BGM
            let theme = 'normal';
            if (this.isBossLevel(this.level)) theme = 'boss';
            else if (this.level >= 4) theme = 'fast';
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

        // 播放 BGM
        let theme = 'normal';

        if (this.isBossLevel(this.level)) {
            theme = 'boss';
        } else if (this.level >= 10) {
            theme = 'fast'; // 10關以後這麽快
        } else {
            // 1-9 關循環：Normal -> Journey -> Adventure
            const cycle = ['normal', 'journey', 'adventure'];
            theme = cycle[(this.level - 1) % 3];
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

        // 恢復 BGM
        let theme = 'normal';
        if (this.isBossLevel(this.level)) theme = 'boss';
        else if (this.level >= 4) theme = 'fast';
        this.sound.startBgm(theme);
    }

    resetGame() {
        this.score = 0;
        this.lives = 5;
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

        this.hideScoreCard();
        this.updateUI();
    }

    showOverlay(title, message) {
        const overlay = document.getElementById('overlay');
        document.getElementById('overlayTitle').textContent = title;
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
            for (let r = 0; r < CONFIG.brickRowCount; r++) {
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
        const speed = this.paddle.speed * (this.timeScale || 1);
        if (this.keys.left && this.paddle.x > 0) {
            this.paddle.x -= speed;
        }
        if (this.keys.right && this.paddle.x < CONFIG.canvasWidth - this.paddle.width) {
            this.paddle.x += speed;
        }
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

        // 更新 this.ball 引用（指向第一个球）
        this.ball = this.balls[0] || null;
    }

    // 砖块碰撞检测（支持多球和特殊磚塊）
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

        // 失敗回饋與動機
        this.consecutiveLosses++;

        // 計算剩餘磚塊
        let remainingBricks = 0;
        for (let c = 0; c < CONFIG.brickColumnCount; c++) {
            for (let r = 0; r < CONFIG.brickRowCount; r++) {
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
    }

    winGame() {
        this.consecutiveLosses = 0; // 重置連續失敗計數
        const completedLevel = this.level;
        const wasBossLevel = this.isBossLevel(completedLevel);

        // 計算評級
        this.currentRank = this.calculateRank(completedLevel, this.score, this.maxCombo, this.missCount);
        const isNewBest = this.saveBestRank(completedLevel, this.currentRank);

        this.level++;
        this.updateHighScore();

        // 過關獎勵
        const maxLives = 10;
        let lifeMessage = '';
        let bonusMessage = '';

        if (wasBossLevel) {
            // 🏆 Boss 過關特殊獎勵：+3 生命、+500 分（無盡模式只加分）
            if (!this.endlessMode) {
                const bonusLives = Math.min(3, maxLives - this.lives);
                this.lives = Math.min(this.lives + 3, maxLives);
                bonusMessage = `🏆 BOSS 擊敗！+${bonusLives} 生命 +500 分！`;
            } else {
                bonusMessage = `🏆 BOSS 擊敗！+500 分！`;
            }
            this.score += 500;
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

        // 增加难度：每过一关速度增加 0.2，上限為 7
        this.currentBallSpeed = Math.min(this.currentBallSpeed + 0.2, CONFIG.maxBallSpeed);

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

        // 顯示過關訊息（含評級 - 獎牌+霓虹字母風格）
        const rankDisplay = this.getRankDisplay(this.currentRank);
        const rankText = `${rankDisplay}${isNewBest ? ' 🎉NEW!' : ''}`;

        if (wasBossLevel) {
            this.showOverlay(`👑 第 ${completedLevel} 关 BOSS 擊敗!`, `${rankText}\n${bonusMessage}`);
        } else if (this.isBossLevel(this.level)) {
            // 下一關是 Boss 關
            this.showOverlay(`🎉 第 ${completedLevel} 关完成!`, `${rankText}\n${lifeMessage}⚠️ 下一關是 BOSS 關！`);
        } else {
            this.showOverlay(`🎉 第 ${completedLevel} 关完成!`, `${rankText}\n${lifeMessage}按空格键进入下一关`);
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
        const displays = {
            'S': '<span class="rank-s">🏆 [S] PERFECT!</span>',
            'A': '<span class="rank-a">🥇 [A] EXCELLENT!</span>',
            'B': '<span class="rank-b">🥈 [B] GOOD!</span>',
            'C': '<span class="rank-c">🥉 [C] PASS</span>',
            'D': '<span class="rank-d">⚫ [D] TRY AGAIN</span>'
        };
        return displays[rank] || '⚫ [?]';
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
                alert('複製失敗，請長按圖片保存');
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

            // 閒置掉落檢查：2秒未撞擊磚塊，掉3個隨機道具
            const timeSinceLastHit = now - this.lastBrickHitTime;
            if (timeSinceLastHit >= 2000 && !this.idleDropTriggered) {
                this.triggerIdleDrop();
                this.idleDropTriggered = true;
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

// ===== 訪客統計系統 =====
async function initVisitorStats() {
    // 1. 生成或讀取訪客 ID
    let visitorId = localStorage.getItem('brick_visitor_id');
    if (!visitorId) {
        visitorId = 'v_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
        localStorage.setItem('brick_visitor_id', visitorId);
    }

    // 2. 記錄訪問
    try {
        await supabase.from('visits').insert({ visitor_id: visitorId });
    } catch (e) {
        console.warn('記錄訪問失敗:', e);
    }

    // 3. 更新在線狀態（心跳）
    async function updateHeartbeat() {
        try {
            await supabase.from('active_users').upsert(
                { visitor_id: visitorId, last_seen: new Date().toISOString() },
                { onConflict: 'visitor_id' }
            );
        } catch (e) {
            console.warn('心跳更新失敗:', e);
        }
    }

    // 首次心跳
    updateHeartbeat();

    // 每 30 秒心跳一次
    const heartbeatInterval = setInterval(updateHeartbeat, 30000);

    // 4. 離開頁面時清理
    window.addEventListener('beforeunload', async () => {
        clearInterval(heartbeatInterval);
        try {
            await supabase.from('active_users').delete().eq('visitor_id', visitorId);
        } catch (e) {
            // 忽略錯誤
        }
    });

    // 5. 查詢並顯示統計數據
    async function updateStats() {
        const today = new Date();
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const seedStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;

        try {
            // 總訪客數（不重複）
            const { count: totalVisitors } = await supabase
                .from('visits')
                .select('visitor_id', { count: 'exact', head: true });

            // 今日訪客數（不重複）
            const { data: todayData } = await supabase
                .from('visits')
                .select('visitor_id')
                .gte('visited_at', todayStart);
            const todayVisitors = todayData ? new Set(todayData.map(v => v.visitor_id)).size : 0;

            // 正在遊玩人數
            const { count: onlinePlayers } = await supabase
                .from('active_users')
                .select('visitor_id', { count: 'exact', head: true })
                .gte('last_seen', fiveMinutesAgo);

            // 今日挑戰者（提交過成績的）
            const { count: todayChallengers } = await supabase
                .from('scores')
                .select('id', { count: 'exact', head: true })
                .eq('seed', seedStr);

            // 更新 UI
            document.getElementById('statTotalVisitors').textContent = formatNumber(totalVisitors || 0);
            document.getElementById('statTodayVisitors').textContent = formatNumber(todayVisitors);
            document.getElementById('statOnlinePlayers').textContent = formatNumber(onlinePlayers || 0);
            document.getElementById('statTodayChallengers').textContent = formatNumber(todayChallengers || 0);

        } catch (e) {
            console.warn('統計查詢失敗:', e);
            // 離線狀態提示
            document.getElementById('statTotalVisitors').textContent = '離線';
            document.getElementById('statTodayVisitors').textContent = '-';
            document.getElementById('statOnlinePlayers').textContent = '-';
            document.getElementById('statTodayChallengers').textContent = '-';
        }
    }

    // 格式化數字
    function formatNumber(num) {
        if (num >= 10000) {
            return (num / 1000).toFixed(1) + 'k';
        }
        return num.toLocaleString();
    }

    // 首次載入統計
    updateStats();

    // 每 60 秒更新一次統計
    setInterval(updateStats, 60000);
}
