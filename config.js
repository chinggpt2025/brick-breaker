/**
 * Brick Breaker - Configuration Module
 * Contains all game constants, language packs, achievements, and audio themes.
 */

// ============================
// 遊戲核心設定 (Core Settings)
// ============================
const CONFIG = {
    canvasWidth: 800,
    canvasHeight: 600,
    paddleWidth: 120,
    paddleHeight: 15,
    paddleSpeed: 10,
    ballRadius: 10,
    ballSpeed: 4.6,
    maxBallSpeed: 7,
    brickRowCount: 5,
    brickColumnCount: 10,
    brickWidth: 68,
    brickHeight: 25,
    brickPadding: 8,
    brickOffsetTop: 50,
    brickOffsetLeft: 24,
    // 生命與接關系統
    lives: 3,            // 初始生命數（已從 5 降至 3）
    continueCost: 15000, // 接關所需分數（已從 10000 提升至 15000）
    continueCountdown: 5,// 接關倒數秒數（已從 9 降至 5）
    initialCredits: 0    // 初始代幣數
};

// ============================
// 磚塊顏色 (Brick Colors)
// ============================
const BRICK_COLORS = [
    { main: '#ff6b6b', light: '#ff8787', dark: '#fa5252' },
    { main: '#feca57', light: '#fed77a', dark: '#f9c22e' },
    { main: '#48dbfb', light: '#72e4fc', dark: '#1dd1fd' },
    { main: '#ff9ff3', light: '#ffb8f6', dark: '#f368e0' },
    { main: '#54a0ff', light: '#74b3ff', dark: '#2e86de' }
];

// 道具設定 (Powerup Types)
// ============================
// 普通道具 (可從磚塊掉落 + 2秒未撞擊掉落)
const POWERUP_TYPES = {
    expand: { color: '#ff6b6b', emoji: '🔴', duration: 10000, name: '扩大挡板' },
    multiball: { color: '#48dbfb', emoji: '🔵', duration: 0, name: '多球' },
    pierce: { color: '#feca57', emoji: '💎', duration: 8000, name: '穿透球' },
    slow: { color: '#1dd1a1', emoji: '🐢', duration: 8000, name: '减速' },
    shrink: { color: '#9b59b6', emoji: '💀', duration: 5000, name: '缩小挡板' }
};

// 特殊道具 (只在2秒未撞擊時掉落，不會從普通磚塊掉落)
const SPECIAL_POWERUP_TYPES = {
    fireball: { color: '#ff4757', emoji: '🔥', duration: 6000, name: '火球', desc: '球帶火焰，撞擊時燒毀周圍磚塊' },
    magnet: { color: '#ffa502', emoji: '🧲', duration: 8000, name: '磁鐵', desc: '球自動追蹤擋板' },
    invincible: { color: '#00d2d3', emoji: '🌟', duration: 10000, name: '無敵護盾', desc: '底部出現保護層，球不會掉落' },
    scoreDouble: { color: '#ffd700', emoji: '💎', duration: 15000, name: '分數加倍', desc: '15秒內分數 x2' },
    timeSlow: { color: '#a29bfe', emoji: '⏱️', duration: 10000, name: '時間減速', desc: '遊戲速度變慢50%' }
};

// 合併所有道具
const ALL_POWERUP_TYPES = { ...POWERUP_TYPES, ...SPECIAL_POWERUP_TYPES };

const POWERUP_KEYS = Object.keys(POWERUP_TYPES);
const SPECIAL_POWERUP_KEYS = Object.keys(SPECIAL_POWERUP_TYPES);
const ALL_POWERUP_KEYS = Object.keys(ALL_POWERUP_TYPES);

const POWERUP_DROP_CHANCE = 0.20;
const POWERUP_SPEED = 3;
const POWERUP_SIZE = 25;

// ============================
// 菁英磚塊類型 (Elite Bricks)
// 在特定關卡(7, 14, 21...)生成，擁有高血量和主動攻擊能力
// ============================
const ELITE_BRICK_TYPES = {
    flameLord: {
        name: '🔥 火焰領主',
        emoji: '🔥',
        hp: 8,
        color: '#ff4757',
        glowColor: '#ff6b81',
        attackInterval: 3000, // 3秒發射一次
        attackType: 'fireball',
        projectileSpeed: 4,
        projectileColor: '#ff4757',
        points: 500
    },
    thunderGuard: {
        name: '⚡ 雷霆守衛',
        emoji: '⚡',
        hp: 6,
        color: '#74b9ff',
        glowColor: '#a29bfe',
        attackInterval: 4000, // 4秒放電一次
        attackType: 'lightning',
        slowDuration: 1000, // 玩家減速1秒
        points: 400
    },
    magnetCore: {
        name: '🔮 磁力核心',
        emoji: '🔮',
        hp: 10,
        color: '#a855f7',
        glowColor: '#c084fc',
        attackInterval: 0, // 持續效果
        attackType: 'magnet',
        pullStrength: 0.3, // 吸引力強度
        points: 600
    }
};

const ELITE_BRICK_KEYS = Object.keys(ELITE_BRICK_TYPES);

// 菁英磚塊出現的關卡 (每7關一次)
const ELITE_BRICK_LEVELS = [7, 14, 21, 28, 35, 42, 49];

// ============================
// 成就定義 (Achievements)
// ============================
const ACHIEVEMENTS = [
    // 🔧 工程師系列
    { id: 'physicist', icon: '🔧', title: '物理學家', desc: '觸發 100 次完美角度反彈', type: 'stat', stat: 'perfectBounces', target: 100 },
    { id: 'demolition', icon: '💣', title: '爆破專家', desc: '引爆 100 個炸彈磚塊', type: 'stat', stat: 'bombExplosions', target: 100 },
    { id: 'electrical', icon: '⚡', title: '電氣工程師', desc: '觸發 50 次閃電磚塊', type: 'stat', stat: 'lightningTriggers', target: 50 },
    { id: 'cryogenic', icon: '❄️', title: '低溫專家', desc: '觸發 50 次冰凍磚塊', type: 'stat', stat: 'freezeTriggers', target: 50 },

    // ⚡ 連擊大師系列
    { id: 'chain_reaction', icon: '🔗', title: '連鎖反應', desc: '達成 x10 連擊', type: 'event', condition: (game) => game.combo >= 10 },
    { id: 'combo_maniac', icon: '🔥', title: '連擊狂魔', desc: '達成 x20 連擊', type: 'event', condition: (game) => game.combo >= 20 },
    { id: 'ultimate_combo', icon: '🌈', title: '極限連擊', desc: '達成 x30 連擊', type: 'event', condition: (game) => game.combo >= 30 },

    // 🏆 挑戰系列
    { id: 'perfectionist', icon: '🏆', title: '完美主義者', desc: '獲得 10 個 S 級評價', type: 'stat', stat: 'sRankCount', target: 10 },
    { id: 'boss_hunter', icon: '👹', title: 'Boss 獵人', desc: '擊敗 10 個 Boss', type: 'stat', stat: 'bossKills', target: 10 },
    { id: 'speed_demon', icon: '🚀', title: '速度惡魔', desc: '在球速 7.0 下過關', type: 'event', condition: (game) => game.currentBallSpeed >= 7.0 && game.gameState === 'win' }
];

// ============================
// BGM 旋律數據 (8-bit Style)
// ============================
const BGM_THEMES = {
    normal: {
        bpm: 120,
        notes: [
            { freq: 262, dur: 4 }, { freq: 330, dur: 4 }, { freq: 392, dur: 4 }, { freq: 523, dur: 8 },
            { freq: 392, dur: 4 }, { freq: 330, dur: 4 }, { freq: 262, dur: 8 },
            { freq: 294, dur: 4 }, { freq: 349, dur: 4 }, { freq: 440, dur: 4 }, { freq: 587, dur: 8 },
            { freq: 440, dur: 4 }, { freq: 349, dur: 4 }, { freq: 294, dur: 8 }
        ]
    },
    journey: {
        bpm: 125,
        notes: [
            { freq: 349, dur: 4 }, { freq: 440, dur: 4 }, { freq: 523, dur: 4 }, { freq: 698, dur: 8 },
            { freq: 523, dur: 4 }, { freq: 440, dur: 4 }, { freq: 349, dur: 8 },
            { freq: 392, dur: 4 }, { freq: 493, dur: 4 }, { freq: 587, dur: 4 }, { freq: 783, dur: 8 },
            { freq: 587, dur: 4 }, { freq: 493, dur: 4 }, { freq: 392, dur: 8 }
        ]
    },
    adventure: {
        bpm: 130,
        notes: [
            { freq: 440, dur: 2 }, { freq: 0, dur: 2 }, { freq: 440, dur: 2 }, { freq: 523, dur: 2 },
            { freq: 440, dur: 4 }, { freq: 349, dur: 4 }, { freq: 329, dur: 8 },
            { freq: 294, dur: 2 }, { freq: 0, dur: 2 }, { freq: 294, dur: 2 }, { freq: 349, dur: 2 },
            { freq: 392, dur: 4 }, { freq: 330, dur: 4 }, { freq: 220, dur: 8 }
        ]
    },
    fast: {
        bpm: 150,
        notes: [
            { freq: 523, dur: 2 }, { freq: 0, dur: 2 }, { freq: 523, dur: 2 }, { freq: 659, dur: 2 },
            { freq: 392, dur: 4 }, { freq: 0, dur: 2 }, { freq: 392, dur: 2 },
            { freq: 440, dur: 2 }, { freq: 0, dur: 2 }, { freq: 440, dur: 2 }, { freq: 523, dur: 2 },
            { freq: 349, dur: 4 }, { freq: 0, dur: 2 }, { freq: 349, dur: 2 }
        ]
    },
    boss: {
        bpm: 180,  // 更快的節奏增加緊張感
        notes: [
            // 低沉威脅的開場
            { freq: 82, dur: 2 }, { freq: 0, dur: 1 }, { freq: 82, dur: 2 }, { freq: 0, dur: 1 },
            { freq: 98, dur: 2 }, { freq: 0, dur: 1 }, { freq: 98, dur: 2 }, { freq: 110, dur: 2 },
            // 緊張上升
            { freq: 110, dur: 2 }, { freq: 123, dur: 2 }, { freq: 130, dur: 2 }, { freq: 146, dur: 2 },
            // 高潮段落
            { freq: 164, dur: 1 }, { freq: 0, dur: 1 }, { freq: 164, dur: 1 }, { freq: 0, dur: 1 },
            { freq: 174, dur: 2 }, { freq: 146, dur: 2 }, { freq: 130, dur: 4 },
            // 重低音結尾
            { freq: 82, dur: 4 }, { freq: 0, dur: 2 }, { freq: 65, dur: 4 }
        ]
    },
    // 🌙 神秘風格 - 適合中期關卡
    mystic: {
        bpm: 100,
        notes: [
            // 空靈開場
            { freq: 220, dur: 8 }, { freq: 0, dur: 2 }, { freq: 277, dur: 4 }, { freq: 330, dur: 4 },
            { freq: 440, dur: 8 }, { freq: 0, dur: 4 },
            // 神秘旋律
            { freq: 349, dur: 4 }, { freq: 392, dur: 2 }, { freq: 440, dur: 2 }, { freq: 523, dur: 8 },
            { freq: 440, dur: 4 }, { freq: 349, dur: 4 }, { freq: 330, dur: 8 },
            // 回旋段落
            { freq: 262, dur: 2 }, { freq: 294, dur: 2 }, { freq: 330, dur: 2 }, { freq: 392, dur: 2 },
            { freq: 440, dur: 4 }, { freq: 0, dur: 2 }, { freq: 330, dur: 6 }
        ]
    },
    // 🏆 勝利凱旋 - 適合高分時刻
    triumph: {
        bpm: 140,
        notes: [
            // 凱旋號角
            { freq: 392, dur: 2 }, { freq: 523, dur: 2 }, { freq: 659, dur: 4 }, { freq: 784, dur: 8 },
            { freq: 659, dur: 4 }, { freq: 523, dur: 4 },
            // 勝利主題
            { freq: 440, dur: 2 }, { freq: 523, dur: 2 }, { freq: 659, dur: 2 }, { freq: 784, dur: 2 },
            { freq: 880, dur: 8 }, { freq: 0, dur: 2 },
            // 歡慶段落
            { freq: 659, dur: 2 }, { freq: 784, dur: 2 }, { freq: 880, dur: 4 }, { freq: 784, dur: 2 },
            { freq: 659, dur: 2 }, { freq: 523, dur: 8 }
        ]
    }
};

// ============================
// 多語言配置 (i18n)
// ============================
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
            settings: '⚙️ 設定',
            achievements: '🏅 成就',
            leaderboard: '🏆 排行榜'
        },
        controls: {
            arrows: '⬅️ ➡️ 方向鍵控制擋板',
            touch: '👆 觸控：點擊開始，滑動移動擋板',
            spaceStart: '按 <kbd>空格鍵</kbd> 開始/暫停遊戲',
            mute: '按 <kbd>M</kbd> 靜音'
        },
        messages: {
            title: '阿愷諾：輝光戰記',
            start: '按空格鍵開始遊戲',
            startTouch: '點擊螢幕開始遊戲',
            paused: '暫停',
            pauseMsg: '按空格鍵繼續',
            pauseMsgTouch: '點擊螢幕繼續',
            gameOver: '遊戲結束',
            gameOverMsg: '再接再厲！',
            win: '恭喜過關！',
            winMsg: '準備挑戰下一關',
            loseLife: '💔 失去一條生命',
            livesLeft: (n) => `剩餘 ${n} 條生命  按空格鍵繼續`,
            livesLeftTouch: (n) => `剩餘 ${n} 條生命  點擊螢幕繼續`,
            copied: '✅ 已複製到剪貼板！',
            saved: '✅ 成績已儲存！',
            eliteBricksSpawn: (count) => `⚠️ ${count} 個菁英磚塊出現！`,
            reduceMotionOn: '已開啟減少動態效果',
            reduceMotionOff: '已關閉減少動態效果',
            gameComplete: '🎯 你征服了所有 Boss！遊戲完結！'
        },
        powerups: {
            expand: '擴大擋板',
            multiball: '多球',
            pierce: '穿透球',
            slow: '減速',
            shrink: '縮小擋板',
            fireball: '火球',
            magnet: '磁鐵',
            invincible: '無敵護盾',
            scoreDouble: '分數加倍',
            timeSlow: '時間減速'
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
            settings: '⚙️ Settings',
            achievements: '🏅 Achievements',
            leaderboard: '🏆 Leaderboard'
        },
        controls: {
            arrows: '⬅️ ➡️ Arrow keys to move paddle',
            touch: '👆 Touch: Tap to start, swipe to move',
            spaceStart: 'Press <kbd>SPACE</kbd> to start/pause',
            mute: 'Press <kbd>M</kbd> to mute'
        },
        messages: {
            title: 'Ar-Kai-noid: Chronicles of Hui',
            start: 'Press SPACE to start',
            startTouch: 'Tap screen to start',
            paused: 'Paused',
            pauseMsg: 'Press SPACE to continue',
            pauseMsgTouch: 'Tap screen to continue',
            gameOver: 'Game Over',
            gameOverMsg: 'Better luck next time!',
            win: 'Level Complete!',
            winMsg: 'Get ready for next level',
            loseLife: '💔 Life lost',
            livesLeft: (n) => `${n} lives left  Press SPACE`,
            livesLeftTouch: (n) => `${n} lives left  Tap to continue`,
            copied: '✅ Copied to clipboard!',
            saved: '✅ Score saved!',
            eliteBricksSpawn: (count) => `⚠️ ${count} Elite Bricks appeared!`,
            reduceMotionOn: 'Reduce motion enabled',
            reduceMotionOff: 'Reduce motion disabled',
            gameComplete: '🎯 You have conquered all Bosses! Game Complete!'
        },
        powerups: {
            expand: 'Expand Paddle',
            multiball: 'Multi Ball',
            pierce: 'Piercing Ball',
            slow: 'Slow Down',
            shrink: 'Shrink Paddle',
            fireball: 'Fireball',
            magnet: 'Magnet',
            invincible: 'Invincible Shield',
            scoreDouble: 'Score Double',
            timeSlow: 'Time Slow'
        },
        scoreCard: {
            title: (isWin) => isWin ? '🎉 Level Complete!' : '💀 Game Over',
            finalScore: 'Final Score',
            maxCombo: 'Max Combo',
            dailyChallenge: 'Daily Challenge',
            playAgain: '🔄 Play Again',
            share: '📋 Copy Score',
            enterName: 'Enter name to save',
            saveScore: '💾 Save',
            viewLeaderboard: '🏆 Leaderboard'
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
            title: '❓ How to Play',
            controls: '🎮 Controls',
            controlArrows: '⬅️➡️ Arrow keys to move',
            controlSpace: 'SPACE to start/pause/launch',
            controlTouch: '👆 Touch & swipe to move',
            controlM: 'M to mute',
            powerups: '🎁 Power-ups',
            powerupExpand: 'Wider paddle',
            powerupMultiball: 'Multi-ball mode',
            powerupPierce: 'Piercing ball',
            powerupSlow: 'Slow ball',
            powerupShrink: 'Smaller paddle (danger!)',
            bricks: '🧱 Brick Types',
            brick1: '1 HP: Red/Yellow',
            brick2: '2 HP: Shows number 2',
            brick3: '3 HP: Shows number 3',
            brickBomb: '💣 Bomb: Explodes nearby',
            tips: '💡 Tips',
            tip1: 'Combos give bonus points!',
            tip2: 'Daily levels are fixed, challenge the board!',
            tip3: 'Ball speed increases each level',
            close: 'Got it!'
        },
        settings: {
            title: '⚙️ Settings',
            language: '語言 / Language',
            sound: 'Sound',
            endless: 'Endless Mode',
            clearData: 'Clear Data',
            clear: '🗑️ Clear',
            close: 'Done',
            cleared: 'Data cleared!'
        }
    }
};

// 預設語言
let currentLang = localStorage.getItem('brickBreakerLang') || 'zh-TW';

// 翻譯函數
function t(key, ...args) {
    const keys = key.split('.');
    let value = LANGUAGES[currentLang];
    for (const k of keys) {
        value = value?.[k];
    }
    // If the value is a function (e.g., messages.livesLeft), call it with the provided arguments
    if (typeof value === 'function') {
        return value(...args);
    }
    return value || key;
}
