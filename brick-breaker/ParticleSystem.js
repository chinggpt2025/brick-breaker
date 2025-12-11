/**
 * Brick Breaker - Particle System Module
 * Object pool pattern for efficient particle effects.
 */

class ParticlePool {
    constructor(size = 200) {
        this.pool = [];
        this.activeParticles = [];
        this.size = size;

        // 預創建粒子對象
        for (let i = 0; i < size; i++) {
            this.pool.push({
                x: 0, y: 0, dx: 0, dy: 0,
                radius: 0, color: '', life: 0,
                active: false
            });
        }
    }

    // 獲取一個空閒粒子
    spawn(x, y, color, isExplosion = false) {
        let p = null;
        // 找一個非活躍粒子
        for (let i = 0; i < this.size; i++) {
            if (!this.pool[i].active) {
                p = this.pool[i];
                break;
            }
        }

        // 如果池滿了，強制復用最舊的活躍粒子
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

            // 繪製
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
