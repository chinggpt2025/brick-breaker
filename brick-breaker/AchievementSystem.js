/**
 * Brick Breaker - Achievement System Module
 * Handles player statistics and achievement tracking.
 * Depends on: config.js (ACHIEVEMENTS)
 */

class PlayerStats {
    constructor(game) {
        this.game = game;
        this.stats = this.loadStats();
        this.unlockedAchievements = this.loadAchievements();
    }

    loadStats() {
        const defaultStats = {
            perfectBounces: 0,
            bombExplosions: 0,
            lightningTriggers: 0,
            freezeTriggers: 0,
            sRankCount: 0,
            bossKills: 0,
            totalScore: 0
        };
        const saved = localStorage.getItem('brickBreakerStats');
        return saved ? { ...defaultStats, ...JSON.parse(saved) } : defaultStats;
    }

    saveStats() {
        localStorage.setItem('brickBreakerStats', JSON.stringify(this.stats));
    }

    loadAchievements() {
        const saved = localStorage.getItem('brickBreakerAchievements');
        return saved ? JSON.parse(saved) : [];
    }

    unlockAchievement(id) {
        if (!this.unlockedAchievements.includes(id)) {
            this.unlockedAchievements.push(id);
            localStorage.setItem('brickBreakerAchievements', JSON.stringify(this.unlockedAchievements));
            return true; // 新解鎖
        }
        return false;
    }

    incrementStat(key, value = 1) {
        if (this.stats[key] !== undefined) {
            this.stats[key] += value;
            this.saveStats();
            this.checkStatAchievements();
        }
    }

    checkStatAchievements() {
        ACHIEVEMENTS.forEach(ach => {
            if (ach.type === 'stat' && !this.unlockedAchievements.includes(ach.id)) {
                if (this.stats[ach.stat] >= ach.target) {
                    this.game.unlockAchievement(ach);
                }
            }
        });
    }
}
