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
    brickWidth: 70,
    brickHeight: 25,
    brickPadding: 8,
    brickOffsetTop: 50,
    brickOffsetLeft: 35
};

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
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.highScore = parseInt(localStorage.getItem('brickBreakerHighScore')) || 0;

        // 初始化游戏对象
        this.initPaddle();
        this.initBall();
        this.initBricks();

        // 控制
        this.keys = { left: false, right: false };

        // 粒子效果
        this.particles = [];

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
                    color: BRICK_COLORS[r % BRICK_COLORS.length]
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
            }
        });

        document.addEventListener('keyup', (e) => {
            if (e.key === 'ArrowLeft' || e.key === 'Left') {
                this.keys.left = false;
            } else if (e.key === 'ArrowRight' || e.key === 'Right') {
                this.keys.right = false;
            }
        });
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
        this.initPaddle();
        this.initBall();
        this.initBricks();
        this.particles = [];
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
        document.getElementById('score').textContent = this.score;
        document.getElementById('lives').textContent = this.lives;
        document.getElementById('level').textContent = this.level;
    }

    // 创建粒子效果
    createParticles(x, y, color) {
        for (let i = 0; i < 10; i++) {
            this.particles.push({
                x: x,
                y: y,
                dx: (Math.random() - 0.5) * 8,
                dy: (Math.random() - 0.5) * 8,
                radius: Math.random() * 4 + 2,
                color: color.main,
                life: 1
            });
        }
    }

    // 更新粒子
    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.dx;
            p.y += p.dy;
            p.life -= 0.02;
            p.radius *= 0.98;

            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    // 绘制粒子
    drawParticles() {
        this.particles.forEach(p => {
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(${this.hexToRgb(p.color)}, ${p.life})`;
            this.ctx.fill();
            this.ctx.closePath();
        });
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
        }

        // 上边界碰撞
        if (this.ball.y - this.ball.radius < 0) {
            this.ball.dy = -this.ball.dy;
        }

        // 下边界（失去生命）
        if (this.ball.y + this.ball.radius > CONFIG.canvasHeight) {
            this.lives--;
            this.updateUI();

            if (this.lives <= 0) {
                this.gameOver();
            } else {
                this.resetBallAndPaddle();
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
                        brick.status = 0;
                        this.score += 10;
                        this.updateUI();

                        // 创建粒子效果
                        this.createParticles(
                            brick.x + CONFIG.brickWidth / 2,
                            brick.y + CONFIG.brickHeight / 2,
                            brick.color
                        );

                        // 检查是否赢得游戏
                        if (this.checkWin()) {
                            this.winGame();
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
        this.showOverlay('游戏结束', `最终分数: ${this.score}  按空格键重新开始`);
    }

    winGame() {
        this.level++;
        this.updateHighScore();

        // 进入下一关
        this.initBricks();
        this.resetBallAndPaddle();

        // 增加难度
        this.ball.speed = CONFIG.ballSpeed + (this.level - 1) * 0.5;

        this.updateUI();
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

        // 绘制背景
        this.drawBackground();

        // 更新和绘制粒子
        this.updateParticles();
        this.drawParticles();

        // 绘制游戏对象
        this.drawBricks();
        this.drawPaddle();
        this.drawBall();

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
