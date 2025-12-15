# data.md - 資料模型定義

> **權威性聲明**：本文件定義所有資料結構與常數。其他系統文件不得與此處定義衝突。

---

## 遊戲核心常數 (CONFIG)

| 鍵 | 型別 | 值 | 說明 |
|----|------|-----|------|
| `canvasWidth` | number | 800 | 畫布寬度 (px) |
| `canvasHeight` | number | 600 | 畫布高度 (px) |
| `paddleWidth` | number | 120 | 擋板寬度 |
| `paddleHeight` | number | 15 | 擋板高度 |
| `paddleSpeed` | number | 10 | 擋板移動速度 |
| `ballRadius` | number | 10 | 球半徑 |
| `ballSpeed` | number | 4.6 | 初始球速 |
| `maxBallSpeed` | number | 7 | 最大球速 |
| `brickRowCount` | number | 5 | 磚塊行數（Boss 關 +2） |
| `brickColumnCount` | number | 10 | 磚塊列數 |
| `brickWidth` | number | 68 | 磚塊寬度 |
| `brickHeight` | number | 25 | 磚塊高度 |
| `brickPadding` | number | 8 | 磚塊間距 |
| `brickOffsetTop` | number | 50 | 磚塊上方偏移 |
| `brickOffsetLeft` | number | 24 | 磚塊左方偏移 |
| `lives` | number | 5 | 初始生命數 |
| `continueCost` | number | 1000 | 接關所需分數 |
| `continueCountdown` | number | 9 | 接關倒數秒數 |
| `initialCredits` | number | 0 | 初始代幣數 |

---

## 道具常數

| 常數 | 值 | 說明 |
|------|-----|------|
| `POWERUP_DROP_CHANCE` | 0.20 | 磚塊掉落道具機率 (20%) |
| `POWERUP_SPEED` | 3 | 道具下落速度 |
| `POWERUP_SIZE` | 25 | 道具圓形直徑 (px) |

---

## 遊戲狀態機 (GameState)

```
idle → playing ↔ paused → gameover / win
```

| 狀態 | 說明 | 觸發條件 |
|------|------|----------|
| `idle` | 初始等待 | 遊戲載入時 |
| `playing` | 進行中 | 按空格鍵開始 |
| `paused` | 暫停 | 遊戲中按空格鍵 |
| `gameover` | 遊戲結束 | 生命歸零 |
| `win` | 過關 | 清空所有磚塊 |

---

## 接關系統 (Continue System)

街機風格的復活機制，生命歸零時觸發。

| 條件 | 說明 |
|------|------|
| 觸發 | `lives === 0` 且 `score >= continueCost` 或 `credits > 0` |
| 費用 | 扣除 1000 分數，或使用 1 代幣 |
| 倒數 | 9 秒內按空格鍵或點擊螢幕 |
| 復活 | 恢復 3 條生命 + 3 秒無敵時間 |
| 超時 | 顯示 Game Over 成績卡 |

---

## 磚塊顏色 (BRICK_COLORS)

```javascript
[
  { main: '#ff6b6b', light: '#ff8787', dark: '#fa5252' }, // 紅
  { main: '#feca57', light: '#fed77a', dark: '#f9c22e' }, // 黃
  { main: '#48dbfb', light: '#72e4fc', dark: '#1dd1fd' }, // 藍
  { main: '#ff9ff3', light: '#ffb8f6', dark: '#f368e0' }, // 粉
  { main: '#54a0ff', light: '#74b3ff', dark: '#2e86de' }  // 深藍
]
```

---

## BGM 主題 (BGM_THEMES)

| 鍵 | BPM | 風格 | 使用關卡 |
|----|-----|------|----------|
| `normal` | 120 | 歡快 | 1-3, 7-9 |
| `journey` | 125 | 冒險 | 2-4, 8 |
| `adventure` | 130 | 探索 | 3-5, 9 |
| `mystic` | 100 | 神秘空靈 | 10-14 |
| `fast` | 150 | 快節奏 | 15-19 |
| `triumph` | 140 | 勝利凱旋 | 20+ |
| `boss` | 180 | 緊張威脅 | Boss 關卡 |

---

## 特殊磚塊類型 (SpecialBrickType)

| 類型 | Emoji | 效果 | 出現關卡 |
|------|-------|------|----------|
| `bomb` | 💣 | 3×3 爆炸 | L1+ |
| `gold` | ⭐ | 雙倍分數 | L2+ |
| `lightning` | ⚡ | 清除整排 | L3+ |
| `shield` | 🛡️ | 底部護盾 8 秒 | L4+ |
| `freeze` | ❄️ | 減速 70% | L5+ |
| `teleport` | 🌀 | 隨機傳送 | L5+ |
| `random` | 🎲 | 隨機道具 | L5+ |

---

## 道具類型 (POWERUP_TYPES)

### 普通道具

| 鍵 | Emoji | 持續時間 | 效果 |
|----|-------|----------|------|
| `expand` | 🔴 | 10s | 擴大擋板 |
| `multiball` | 🔵 | 即時 | 分裂多球 |
| `pierce` | ⚡ | 8s | 穿透球 |
| `slow` | 🐢 | 8s | 減速球 |
| `shrink` | 💀 | 5s | 縮小擋板 |

### 特殊道具 (SPECIAL_POWERUP_TYPES)

| 鍵 | Emoji | 持續時間 | 效果 |
|----|-------|----------|------|
| `fireball` | 🔥 | 6s | 燒毀周圍磚塊 |
| `magnet` | 🧲 | 8s | 球自動追蹤 |
| `invincible` | 🌟 | 10s | 底部護盾 |
| `scoreDouble` | 💎 | 15s | 分數 ×2 |
| `timeSlow` | ⏱️ | 10s | 遊戲速度 50% |

---

## 菁英磚塊類型 (ELITE_BRICK_TYPES)

| 鍵 | 名稱 | HP | 攻擊間隔 | 攻擊類型 | 分數 |
|----|------|-----|----------|----------|------|
| `flameLord` | 🔥 火焰領主 | 8 | 3s | fireball | 500 |
| `thunderGuard` | ⚡ 雷霆守衛 | 6 | 4s | lightning | 400 |
| `magnetCore` | 🧲 磁力核心 | 10 | 持續 | magnet | 600 |

---

## Boss 類型 (BOSS_TYPES)

| 鍵 | 名稱 | HP | 攻擊間隔 | 攻擊類型 | 出現關卡 |
|----|------|-----|----------|----------|----------|
| `dragon` | 🐲 Fire Dragon | 10 | 3s | fire | L14 |
| `kraken` | 🐙 Ice Kraken | 12 | 2.5s | ice（減速） | L21 |
| `mecha` | ⚡ Thunder Mecha | 15 | 2s | lightning（閃屏） | L28+ |

---

## 成就定義 (ACHIEVEMENTS)

| ID | 類型 | 目標 | 說明 |
|----|------|------|------|
| `physicist` | stat | perfectBounces ≥ 100 | 物理學家 |
| `demolition` | stat | bombExplosions ≥ 100 | 爆破專家 |
| `electrical` | stat | lightningTriggers ≥ 50 | 電氣工程師 |
| `cryogenic` | stat | freezeTriggers ≥ 50 | 低溫專家 |
| `chain_reaction` | event | combo ≥ 10 | 連鎖反應 |
| `combo_maniac` | event | combo ≥ 20 | 連擊狂魔 |
| `ultimate_combo` | event | combo ≥ 30 | 極限連擊 |
| `perfectionist` | stat | sRankCount ≥ 10 | 完美主義者 |
| `boss_hunter` | stat | bossKills ≥ 10 | Boss 獵人 |
| `speed_demon` | event | 球速 ≥ 7.0 過關 | 速度惡魔 |

---

## 玩家統計數據 (PlayerStats)

```javascript
{
  perfectBounces: number,    // 完美反彈次數
  bombExplosions: number,    // 炸彈爆炸次數
  lightningTriggers: number, // 閃電觸發次數
  freezeTriggers: number,    // 冰凍觸發次數
  sRankCount: number,        // S 級評價次數
  bossKills: number,         // Boss 擊敗次數
  totalScore: number         // 累計總分
}
```

---

## LocalStorage 鍵值規範

| 鍵 | 型別 | 說明 |
|----|------|------|
| `brickBreakerHighScore` | number | 最高分 |
| `brickBreakerLang` | string | 語言 (zh-TW/en) |
| `brickBreakerSound` | boolean | 音效開關 |
| `brickBreakerBgm` | boolean | 背景音樂開關 |
| `brickBreakerStats` | JSON | 玩家統計數據 |
| `brickBreakerAchievements` | JSON | 已解鎖成就 ID 陣列 |
| `brickBreakerBestRanks` | JSON | 各關最佳評級 |
| `brickBreaker_reduceMotion` | boolean | 減少動態效果 |
