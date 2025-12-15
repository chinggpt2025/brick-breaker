# api.md - 模組接口契約

> **依賴聲明**：本文件引用 `data.md` 中定義的資料結構。

---

## 模組依賴關係

```
data.md (最低層)
   ↓
api.md (本文件)
   ↓
system.md → ui.md
```

---

## SoundManager

**檔案**：`SoundManager.js`  
**實例化**：全域 `soundManager`

### 屬性

| 屬性 | 型別 | 預設值 | 說明 |
|------|------|--------|------|
| `enabled` | boolean | true | 音效開關 |
| `bgmEnabled` | boolean | true | BGM 開關 |
| `volume` | number | 0.3 | 音量 (0-1) |
| `currentBgmName` | string | null | 當前 BGM 主題 |

### 公開方法

| 方法 | 參數 | 回傳 | 說明 |
|------|------|------|------|
| `init()` | - | void | 初始化 AudioContext |
| `startBgm(themeName)` | string | void | 開始播放 BGM |
| `stopBgm()` | - | void | 停止 BGM |
| `toggle()` | - | boolean | 切換音效開關 |
| `playPaddleHit()` | - | void | 擋板撞擊音 |
| `playBrickHit(row)` | number | void | 磚塊撞擊音 |
| `playComboSound(combo)` | number | void | 連擊音 |
| `playExplosion()` | - | void | 爆炸音 |
| `playPowerup()` | - | void | 道具獲取音 |
| `playLevelComplete()` | - | void | 過關音 |
| `playGameOver()` | - | void | 遊戲結束音 |

---

## ParticlePool

**檔案**：`ParticleSystem.js`

### 建構子

```javascript
new ParticlePool(size = 200)
```

### 公開方法

| 方法 | 參數 | 說明 |
|------|------|------|
| `spawn(x, y, color, isExplosion)` | number, number, string, boolean | 產生粒子 |
| `updateAndDraw(ctx, hexToRgbFn, timeScale)` | CanvasContext, Function, number | 更新並繪製 |
| `reset()` | - | 清空所有粒子 |

---

## PlayerStats

**檔案**：`AchievementSystem.js`

### 建構子

```javascript
new PlayerStats(game)
```

### 屬性

| 屬性 | 型別 | 說明 |
|------|------|------|
| `stats` | object | 玩家統計數據（見 data.md） |
| `unlockedAchievements` | string[] | 已解鎖成就 ID |

### 公開方法

| 方法 | 參數 | 說明 |
|------|------|------|
| `incrementStat(key, value)` | string, number | 累加統計數據 |
| `unlockAchievement(id)` | string | 解鎖成就 |
| `checkStatAchievements()` | - | 檢查統計型成就 |
| `loadStats()` | - | 從 LocalStorage 載入 |
| `saveStats()` | - | 儲存至 LocalStorage |

---

## Boss

**檔案**：`BossManager.js`

### 建構子

```javascript
new Boss(type, canvasWidth)
```

### 屬性

| 屬性 | 型別 | 說明 |
|------|------|------|
| `hp` | number | 當前血量 |
| `maxHp` | number | 最大血量 |
| `x`, `y` | number | 位置 |
| `projectiles` | array | 投射物陣列 |

### 公開方法

| 方法 | 參數 | 回傳 | 說明 |
|------|------|------|------|
| `update(deltaTime, canvasWidth)` | number, number | void | 更新狀態 |
| `attack()` | - | void | 發射投射物 |
| `takeDamage(amount)` | number | void | 受到傷害 |
| `checkBallCollision(ball)` | object | boolean | 檢測球碰撞 |
| `checkProjectileHitPaddle(paddle)` | object | boolean | 投射物擊中擋板 |
| `draw(ctx)` | CanvasContext | void | 繪製 Boss |

---

## BossManager

**檔案**：`BossManager.js`

### 建構子

```javascript
new BossManager(game)
```

### 公開方法

| 方法 | 參數 | 回傳 | 說明 |
|------|------|------|------|
| `isBossLevel(level)` | number | boolean | 是否為 Boss 關 |
| `initBoss(level)` | number | void | 初始化 Boss |
| `update(deltaTime)` | number | void | 更新 Boss |
| `draw(ctx)` | CanvasContext | void | 繪製 Boss |
| `checkCollisions(balls, paddle)` | array, object | void | 碰撞檢測 |
| `isBossDefeated()` | - | boolean | Boss 是否死亡 |
| `onPlayerFail()` | - | void | 玩家失敗時降低難度 |

---

## BrickBreakerGame

**檔案**：`game.js`

### 建構子

```javascript
new BrickBreakerGame()
```

### 核心狀態

| 屬性 | 型別 | 說明 |
|------|------|------|
| `gameState` | string | 遊戲狀態（見 data.md） |
| `level` | number | 當前關卡 |
| `score` | number | 當前分數 |
| `lives` | number | 當前生命 |
| `combo` | number | 當前連擊 |
| `balls` | array | 球陣列 |
| `bricks` | array | 磚塊二維陣列 |
| `powerups` | array | 掉落中的道具 |
| `activePowerups` | object | 生效中的道具 |

### 公開方法

| 方法 | 說明 |
|------|------|
| `startGame()` | 開始遊戲 |
| `pauseGame()` | 暫停遊戲 |
| `resumeGame()` | 繼續遊戲 |
| `resetGame()` | 重置遊戲 |
| `toggleGame()` | 切換遊戲狀態 |
| `nextLevel()` | 進入下一關 |
| `gameOver()` | 遊戲結束 |
| `showToast(message, type, duration)` | 顯示通知 |
| `startContinueCountdown()` | 開始接關倒數 |
| `stopContinueCountdown()` | 停止接關倒數 |
| `continueGame()` | 執行接關（扣費+復活） |
| `winGame()` | 過關邏輯與評級 |
| `checkWin()` | 檢查勝利條件 |
| `showGameOverScreen()` | 顯示失敗畫面 |
| `showOverlay(title, message)` | 顯示覆蓋層 |
| `updateAllUI()` | 更新所有 i18n 文字 |

---

## Supabase 資料庫契約

**資料表**：`scores` *(注意：非 leaderboard)*

| 欄位 | 型別 | 說明 |
|------|------|------|
| `id` | uuid | 主鍵 |
| `name` | string | 玩家暱稱 |
| `score` | number | 分數 |
| `max_combo` | number | 最高連擊 |
| `seed` | string | 每日挑戰種子 |
| `created_at` | timestamp | 建立時間 |

**資料表**：`visitors`

| 欄位 | 型別 | 說明 |
|------|------|------|
| `total_visitors` | number | 總訪客數 |
| `today_visitors` | number | 今日訪客數 |
| `online_players` | number | 在線人數 |
| `today_challengers` | number | 今日挑戰者 |
