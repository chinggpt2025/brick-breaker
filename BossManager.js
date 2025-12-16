/**
 * Brick Breaker - Boss Manager Module
 * Handles Boss encounters with unique attack patterns
 * Depends on: config.js
 */

// Boss 類型定義
const BOSS_TYPES = {
    dragon: {
        name: '🐲 Fire Dragon',
        hp: 10,
        width: 120,
        height: 100,
        sprite: 'assets/boss_dragon.png',
        attackInterval: 3000, // 每 3 秒攻擊
        projectileSprite: 'assets/projectile_fireball.png',
        projectileSpeed: 4,
        projectileSize: 45,
        color: '#ff4444',
        emoji: '🐲',
        projectileEmoji: '🔥', // ✅ 火焰彈
        attackType: 'fire' // 火焰攻擊
    },
    kraken: {
        name: '🐙 Ice Kraken',
        hp: 12,
        width: 140,
        height: 110,
        sprite: 'assets/boss_kraken.png',
        attackInterval: 2500, // 較快的攻擊頻率
        projectileSprite: 'assets/projectile_ice.png',
        projectileSpeed: 3.5,
        projectileSize: 40,
        color: '#4fc3f7',
        emoji: '🐙',
        projectileEmoji: '❄️', // ✅ 冰凍彈
        attackType: 'ice' // 冰凍攻擊（減速玩家）
    },
    mecha: {
        name: '⚡ Thunder Mecha',
        hp: 15,
        width: 130,
        height: 120,
        sprite: 'assets/boss_mecha.png',
        attackInterval: 2000, // 最快的攻擊頻率
        projectileSprite: 'assets/projectile_lightning.png',
        projectileSpeed: 5,
        projectileSize: 35,
        color: '#ffeb3b',
        emoji: '⚡',
        projectileEmoji: '🔋', // ✅ 雷電彈 (電池 emoji 替代)
        attackType: 'lightning' // 雷電攻擊（閃屏）
    }
};

class Boss {
    constructor(type, canvasWidth, game) {  // ✅ FIX: 接收 game 引用
        const config = BOSS_TYPES[type];
        this.type = type;
        this.game = game;  // ✅ 儲存 game 引用，用於 takeDamage 回調
        this.name = config.name;
        this.maxHp = config.hp;
        this.hp = config.hp;
        this.width = config.width;
        this.height = config.height;
        this.x = (canvasWidth - config.width) / 2;
        this.y = 30;
        this.color = config.color;
        this.emoji = config.emoji; // 保存不同 Boss 的 emoji

        // 攻擊設定
        this.attackInterval = config.attackInterval;
        this.lastAttackTime = 0;
        this.projectiles = [];
        this.projectileSpeed = config.projectileSpeed;
        this.projectileSize = config.projectileSize;
        this.projectileEmoji = config.projectileEmoji || '☄️'; // ✅ 儲存投射物 emoji

        // 狀態
        this.isHurt = false;
        this.hurtTimer = 0;
        this.isDead = false;
        this.deathTimer = 0;

        // 載入圖片
        this.sprite = new Image();
        this.sprite.src = config.sprite;
        this.projectileSprite = new Image();
        this.projectileSprite.src = config.projectileSprite;

        // 移動
        this.moveDirection = 1;
        this.moveSpeed = 1;
    }

    update(deltaTime, canvasWidth) {
        if (this.isDead) {
            this.deathTimer += deltaTime;
            return;
        }

        // 受傷閃爍
        if (this.isHurt) {
            this.hurtTimer += deltaTime;
            if (this.hurtTimer > 200) {
                this.isHurt = false;
                this.hurtTimer = 0;
            }
        }

        // 左右移動
        this.x += this.moveDirection * this.moveSpeed;
        if (this.x <= 20 || this.x + this.width >= canvasWidth - 20) {
            this.moveDirection *= -1;
        }

        // 攻擊計時
        const now = Date.now();
        if (now - this.lastAttackTime >= this.attackInterval) {
            this.attack();
            this.lastAttackTime = now;
        }

        // 更新投射物
        this.projectiles.forEach(p => {
            p.y += this.projectileSpeed;
        });

        // 移除出界的投射物
        this.projectiles = this.projectiles.filter(p => p.y < 700);
    }

    attack() {
        // 發射火球
        const projectile = {
            x: this.x + this.width / 2 - this.projectileSize / 2,
            y: this.y + this.height,
            size: this.projectileSize,
            damage: 1
        };
        this.projectiles.push(projectile);
    }

    takeDamage(amount = 1) {
        if (this.isDead) return;

        this.hp -= amount;
        this.isHurt = true;
        this.hurtTimer = 0;

        if (this.hp <= 0) {
            this.hp = 0;
            this.isDead = true;

            // ✅ FIX I1: Boss 死亡時主動觸發通關檢測
            // 使用 setTimeout 確保狀態更新完成後再檢查
            setTimeout(() => {
                if (this.game && this.game.checkWin && this.game.checkWin()) {
                    this.game.winGame();
                }
            }, 100);
        }
    }

    // 檢測球是否擊中 Boss
    checkBallCollision(ball) {
        if (this.isDead) return false;

        // ✅ FIX M2: 防止多球同時擊中造成重複傷害
        const now = Date.now();
        if (this.lastDamageTime && now - this.lastDamageTime < 50) {
            return false; // 50ms 冷卻時間
        }

        const ballLeft = ball.x - ball.radius;
        const ballRight = ball.x + ball.radius;
        const ballTop = ball.y - ball.radius;
        const ballBottom = ball.y + ball.radius;

        const bossLeft = this.x;
        const bossRight = this.x + this.width;
        const bossTop = this.y;
        const bossBottom = this.y + this.height;

        if (ballRight > bossLeft && ballLeft < bossRight &&
            ballBottom > bossTop && ballTop < bossBottom) {
            this.takeDamage(1);
            this.lastDamageTime = now;
            return true; // 擊中
        }
        return false;
    }

    // 檢測投射物是否擊中擋板
    checkProjectileHitPaddle(paddle) {
        const hitProjectiles = [];

        this.projectiles = this.projectiles.filter(p => {
            const pLeft = p.x;
            const pRight = p.x + p.size;
            const pTop = p.y;
            const pBottom = p.y + p.size;

            if (pRight > paddle.x && pLeft < paddle.x + paddle.width &&
                pBottom > paddle.y && pTop < paddle.y + paddle.height) {
                hitProjectiles.push(p);
                return false; // 移除此投射物
            }
            return true;
        });

        return hitProjectiles.length > 0;
    }

    // 檢測球是否擊中投射物（可反彈）
    checkBallHitProjectile(ball) {
        let hit = false;

        this.projectiles = this.projectiles.filter(p => {
            const dist = Math.hypot(ball.x - (p.x + p.size / 2), ball.y - (p.y + p.size / 2));
            if (dist < ball.radius + p.size / 2) {
                hit = true;
                // 火球被球擊中，反彈回去傷害 Boss
                this.takeDamage(2); // 反彈傷害更高
                return false;
            }
            return true;
        });

        return hit;
    }

    draw(ctx) {
        if (this.isDead) {
            // 死亡動畫
            ctx.save();
            ctx.globalAlpha = Math.max(0, 1 - this.deathTimer / 1000);
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y, this.width, this.height);
            ctx.restore();
            return;
        }

        // 受傷閃爍
        if (this.isHurt && Math.floor(this.hurtTimer / 50) % 2 === 0) {
            ctx.save();
            ctx.globalAlpha = 0.5;
        }

        // 繪製 Boss (圓形/有機形狀)
        if (this.sprite.complete && this.sprite.naturalWidth > 0) {
            ctx.drawImage(this.sprite, this.x, this.y, this.width, this.height);
        } else {
            // 備用：圓形光環 + 表情
            ctx.shadowBlur = 20;
            ctx.shadowColor = this.color;

            ctx.beginPath();
            // 使用橢圓形更能代表龍的體型
            ctx.ellipse(
                this.x + this.width / 2,
                this.y + this.height / 2,
                this.width / 2,
                this.height / 2,
                0, 0, Math.PI * 2
            );
            ctx.fillStyle = this.color;
            ctx.fill();

            // 內圈漸層
            const gradient = ctx.createRadialGradient(
                this.x + this.width / 2, this.y + this.height / 2, 5,
                this.x + this.width / 2, this.y + this.height / 2, this.width / 2
            );
            gradient.addColorStop(0, '#ff8a80');
            gradient.addColorStop(1, this.color);
            ctx.fillStyle = gradient;
            ctx.fill();

            ctx.shadowBlur = 0;
            ctx.fillStyle = '#fff';
            ctx.font = '50px Arial'; // 加大 emoji
            ctx.textAlign = 'center';
            ctx.fillText(this.emoji, this.x + this.width / 2, this.y + this.height / 2 + 18);
        }

        if (this.isHurt) {
            ctx.restore();
        }

        // 繪製血條
        const barWidth = this.width;
        const barHeight = 8;
        const barX = this.x;
        const barY = this.y - 15;

        // 背景
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        // 血量
        const hpRatio = this.hp / this.maxHp;
        ctx.fillStyle = hpRatio > 0.5 ? '#4ade80' : hpRatio > 0.25 ? '#ffc837' : '#ff4444';
        ctx.fillRect(barX, barY, barWidth * hpRatio, barHeight);

        // 邊框
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barWidth, barHeight);

        // 繪製投射物
        this.projectiles.forEach(p => {
            if (this.projectileSprite.complete && this.projectileSprite.naturalWidth > 0) {
                ctx.drawImage(this.projectileSprite, p.x, p.y, p.size, p.size);
            } else {
                // ✅ FIX: 每種 Boss 使用不同的 emoji，統一紫色外光
                ctx.save();
                ctx.shadowColor = '#9b59b6'; // ✅ 紫色外光
                ctx.shadowBlur = 15;

                ctx.beginPath();
                ctx.arc(p.x + p.size / 2, p.y + p.size / 2, p.size / 2, 0, Math.PI * 2);
                ctx.fillStyle = '#9b59b6'; // ✅ 紫色填充
                ctx.fill();

                ctx.shadowBlur = 0;
                ctx.font = '24px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#ffffff';
                ctx.fillText(this.projectileEmoji, p.x + p.size / 2, p.y + p.size / 2); // ✅ 使用 Boss 專屬 emoji

                ctx.restore();
            }
        });
    }
}

class BossManager {
    constructor(game) {
        this.game = game;
        this.currentBoss = null;
        this.difficultyReduction = 0; // 失敗次數導致的難度降低
    }

    // 判斷是否為有 Boss 實體的關卡（L14+）
    isBossLevel(level) {
        return level >= 14 && level % 7 === 0;
    }

    // 取得 Boss 類型
    getBossType(level) {
        const bossIndex = Math.floor(level / 7);
        if (bossIndex === 2) return 'dragon';  // L14
        if (bossIndex === 3) return 'kraken';  // L21
        if (bossIndex >= 4) return 'mecha';    // L28+
        return null; // L7 (bossIndex=1) 不應該有 Boss
    }

    // 初始化 Boss
    initBoss(level) {
        const type = this.getBossType(level);
        if (!type) {
            this.currentBoss = null;
            return;
        }

        this.currentBoss = new Boss(type, CONFIG.canvasWidth, this.game);  // ✅ FIX: 傳遞 game 引用

        // 應用難度降低
        if (this.difficultyReduction > 0) {
            const reduction = Math.min(this.difficultyReduction * 2, this.currentBoss.maxHp - 3);
            this.currentBoss.hp -= reduction;
            this.currentBoss.maxHp -= reduction;
            console.log(`[Boss] 難度降低: HP ${this.currentBoss.maxHp} (減少 ${reduction})`);
        }
    }

    // 玩家失敗時增加難度降低
    onPlayerFail() {
        this.difficultyReduction++;
    }

    // 重置難度降低（過關後）
    resetDifficultyReduction() {
        this.difficultyReduction = 0;
    }

    // 更新 Boss
    update(deltaTime) {
        if (!this.currentBoss) return;
        this.currentBoss.update(deltaTime, CONFIG.canvasWidth);
    }

    // 繪製 Boss
    draw(ctx) {
        if (!this.currentBoss) return;
        this.currentBoss.draw(ctx);
    }

    // 檢測碰撞
    checkCollisions(balls, paddle) {
        if (!this.currentBoss || this.currentBoss.isDead) return { bossHit: false, paddleHit: false };

        let bossHit = false;
        let paddleHit = false;

        // 球擊中 Boss
        balls.forEach(ball => {
            if (this.currentBoss.checkBallCollision(ball)) {
                bossHit = true;
                ball.dy = Math.abs(ball.dy); // 反彈向下
            }

            // 球擊中火球（反彈傷害）
            if (this.currentBoss.checkBallHitProjectile(ball)) {
                this.game.showToast('🔥 火球反擊！Boss -2 HP', 'success');
            }
        });

        // 投射物擊中擋板
        if (this.currentBoss.checkProjectileHitPaddle(paddle)) {
            paddleHit = true;
        }

        return { bossHit, paddleHit };
    }

    // Boss 是否已死亡
    isBossDefeated() {
        return this.currentBoss && this.currentBoss.isDead;
    }

    // 取得 Boss 名稱
    getBossName() {
        return this.currentBoss ? this.currentBoss.name : '';
    }
}
