# ui.md - UI 組件與互動定義

> **依賴聲明**：本文件引用 `data.md`、`api.md` 和 `system.md` 中定義的結構。

---

## UI 層級結構

```
body
├── .game-container
│   ├── #portrait-warning         // 直立模式警告
│   ├── .game-header              // 標題與統計
│   ├── #gameCanvas               // 遊戲畫布
│   ├── .game-controls            // 控制按鈕
│   ├── #visitorStats             // 訪客統計
│   └── #powerupTimers            // 道具時間條
├── #overlay                      // 開始/暫停覆蓋層
├── #scoreCard                    // 成績卡片
├── #leaderboardModal             // 排行榜
├── #continueOverlay              // 續關畫面
├── #shareModal                   // 分享圖片
├── #achievementsModal            // 成就列表
├── #helpModal                    // 遊戲說明
├── #settingsModal                // 遊戲設定
└── #toastContainer               // Toast 通知
```

---

## 核心組件

### 遊戲畫布 (#gameCanvas)

| 屬性 | 值 | 說明 |
|------|-----|------|
| 寬度 | 800px | CONFIG.canvasWidth |
| 高度 | 600px | CONFIG.canvasHeight |
| 事件 | touch, mouse | 擋板控制 |

---

## Modal 組件

| ID | 觸發元素 | 顯示條件 | 關閉方式 |
|----|----------|----------|----------|
| `#overlay` | - | idle/paused | 點擊/空格 |
| `#scoreCard` | - | gameover/win | #playAgainBtn |
| `#leaderboardModal` | #viewLeaderboardBtn | 手動開啟 | #closeLeaderboardBtn |
| `#settingsModal` | #settingsBtn | 手動開啟 | #closeSettingsBtn |
| `#helpModal` | #helpBtn | 手動開啟 | #closeHelpBtn |
| `#achievementsModal` | #viewAchievementsBtn | 手動開啟 | #closeAchievementsBtn |
| `#shareModal` | #shareBtn | 手動開啟 | #closeShareBtn |
| `#continueOverlay` | - | 生命歸零 | 點擊/空格 |

---

## 控制按鈕

| ID | 文字 | data-i18n | 觸發方法 |
|----|------|-----------|----------|
| `#soundToggle` | 🔊 音效 | ui.soundOn | toggleSound() |
| `#fullscreenBtn` | 📺 全螢幕 | - | toggleFullscreen() |
| `#settingsBtn` | ⚙️ 設定 | ui.settings | showSettings() |
| `#viewAchievementsBtn` | 🏅 成就 | ui.achievements | showAchievements() |
| `#helpBtn` | ❓ 說明 | ui.help | showHelp() |

---

## 成績卡片元素

| ID | 內容 | 來源 |
|----|------|------|
| `#cardTitle` | 標題 | scoreCard.title(isWin) |
| `#cardScore` | 最終分數 | game.score |
| `#cardMaxCombo` | 最高連擊 | game.maxCombo |
| `#cardHighScore` | 最高分 | game.highScore |
| `#cardSeed` | 每日種子 | #YYYYMMDD |
| `#cardFeedback` | 情緒反饋 | 根據表現生成 |
| `#cardRankBadge` | 評級徽章 | S/A/B/C/D |
| `#playerName` | 輸入框 | 暱稱 (max 12) |

---

## i18n 屬性映射

| 屬性 | 用途 | 範例 |
|------|------|------|
| `data-i18n` | 純文字 | `<span data-i18n="ui.score">分數</span>` |
| `data-i18n-html` | HTML 內容 | `<p data-i18n-html="controls.spaceStart">按 <kbd>空格</kbd></p>` |
| `data-i18n-prefix` | 帶前綴 | `<h1 data-i18n-prefix="messages.title">🎮 打磚塊</h1>` |
| `data-i18n-placeholder` | 輸入框佔位符 | `<input data-i18n-placeholder="scoreCard.enterName">` |

---

## 響應式斷點

| 斷點 | 行為 |
|------|------|
| `< 600px` | 行動版：縮放 + 精簡 UI |
| `600-1400px` | 平板：等比縮放 |
| `> 1400px` | 桌面：原生尺寸 |

### 行動版縮放邏輯

```javascript
// 橫向：以高度為基準
scale = Math.min(innerWidth / 1280, innerHeight / 800) * 0.96;

// 直向：以寬度為基準
scale = innerWidth / 900;
```

---

## Toast 通知系統

```javascript
showToast(message, type, duration)
```

| type | 顏色 | 圖示 |
|------|------|------|
| `error` | 紅 | ❌ |
| `success` | 綠 | ✅ |
| `info` | 藍 | ℹ️ |
| `warning` | 黃 | ⚠️ |

---

## 事件綁定摘要

| 事件 | 目標 | 處理器 |
|------|------|--------|
| keydown | window | _handleKeyDown |
| keyup | window | _handleKeyUp |
| touchstart | window | _handleTouchStart |
| touchmove | window | _handleTouchMove |
| mousedown | canvas | _handleMouseDown |
| mousemove | canvas | _handleMouseMove |

---

## v1.16+ UI 更新

### 控制按鈕新增 (v1.16)

| ID | 文字 | class | 觸發方法 |
|----|------|-------|----------|
| `#mainLeaderboardBtn` | 🏆 排行榜 | `.leaderboard-toggle` | showLeaderboard() |

### Modal 統一關閉 (v1.19)

所有 5 個 Modal 現支援點擊背景關閉：
- `#leaderboardModal`
- `#settingsModal`
- `#achievementsModal`
- `#helpModal`
- `#shareModal`

### Modal 標題樣式 (v1.20)

統一標題樣式：
- **顏色**：`var(--accent-gold)` (金色)
- **字體大小**：`1.8rem`
- **陰影**：`text-shadow: 0 2px 4px rgba(0,0,0,0.5)`
