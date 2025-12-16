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
| `playWin()` | - | void | 遊戲通關音 (v1.12+) |
| `playBossHit()` | - | void | Boss 擊中擋板音 (v1.9+) |
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
new Boss(type, canvasWidth, game)  // v1.11+: 需傳入 game 引用
```

### 屬性

| 屬性 | 型別 | 說明 |
|------|------|------|
| `hp` | number | 當前血量 |
| `maxHp` | number | 最大血量 |
| `x`, `y` | number | 位置 |
| `emoji` | string | Boss 表情符號 (🐲/🐙/⚡) |
| `projectileEmoji` | string | 投射物表情符號 (🔥/❄️/🔋) |
| `game` | object | 遊戲實例引用 (v1.11+) |
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
| `escapeHtml(text)` | 防止 XSS 的 HTML 轉義 |
| `updateSoundButton()` | 更新音效按鈕文字狀態 |

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

---

## v1.15+ 新增方法

### DOM 安全輔助函式

| 方法 | 參數 | 回傳 | 說明 |
|------|------|------|------|
| `_safeGetEl(id)` | string | Element/null | 安全取得元素 |
| `_safeSetText(id, text)` | string, string | void | 安全設定文字 |
| `_safeSetHtml(id, html)` | string, string | void | 安全設定 HTML |
| `_safeToggleClass(id, className, force)` | string, string, boolean | void | 安全切換 class |

### Modal 統一關閉 (v1.19)

| 方法 | 參數 | 說明 |
|------|------|------|
| `_setupModalBackdropClose(modalId, contentClass, hideCallback)` | string, string, Function | 設定點擊背景關閉 |
| `hideHelp()` | - | 隱藏說明 Modal |
| `hideShareModal()` | - | 隱藏分享 Modal |

### 排行榜快取 (v1.19)

| 方法 | 參數 | 說明 |
|------|------|------|
| `getLeaderboard(forceRefresh)` | boolean | 取得排行榜（預設使用快取）|

**快取結構**：
```javascript
this._leaderboardCache = {
    key: 'leaderboard_YYYYMMDD',
    timestamp: Date.now(),
    data: []
}
```
**TTL**：2 分鐘

### 全螢幕直式鎖定 (v1.21-v1.22)

| 方法 | 說明 |
|------|------|
| `toggleFullscreen()` | async 方法，使用遊戲容器進入全螢幕，前後雙重鎖定直式 |

---

## v1.23+ 新增方法

### 成績卡片安全 (v1.23)
- 所有按鈕綁定加 null 檢查
- `playAgainBtn` 加防抖 (`_isResetting`)
- `saveScoreBtn` 保存後禁用

### 排行榜快取失效 (v1.24)
- 保存成績後執行 `this._leaderboardCache = null`

### 多標籤排行榜 (v1.25)

| 方法 | 參數 | 說明 |
|------|------|------|
| `showLeaderboard(tabType)` | 'today'/'alltime'/'weekly'/'myhistory' | 顯示指定分頁 |
| `_queryLeaderboard({ limit, weekStart })` | object | 通用查詢方法 |
| `_queryMyHistory()` | - | 使用 localStorage 玩家名稱查詢 |

### localStorage Key (v1.25)
- `brickBreaker_playerName`：儲存玩家名稱供「我的歷史」使用
