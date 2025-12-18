# Brick Breaker｜打磚塊遊戲（Vibe Coding 專案）

## Why This Project Exists｜專案存在的原因

這個專案是一個**中等複雜度的 Vibe Coding 實驗**。

我刻意不從框架、演算法或效能優化出發，而是先以**規則、狀態與系統邊界**建立完整設計，再由 AI 作為**純執行層**完成實作。
目標不是展示寫程式的技巧，而是驗證一件事：

> 在沒有傳統程式訓練背景的前提下，是否仍能用自然語言與系統思維，
> 把一個具備演進性、可控性、可停止性的中型專案完整跑起來。

因此，這個專案刻意強調：

* 狀態機是否清楚
* 子系統是否可拆、可改、可接手
* 系統是否能持續演進，而不是一次性完成

---

## Project Overview｜專案概覽

這是一個現代化、完成度高的 Arkanoid / Breakout 類型 Web 遊戲，
以 **Vanilla JavaScript + HTML5 Canvas** 實作，並搭配完整的系統設計與文件化結構。

除了可實際遊玩，這個專案同時也是一個
**「以 vibe coding 管理複雜度」的實例展示**。

![Game Screenshot](assets/icon-512.png) <!-- Placeholder for actual screenshot -->

---

## ✨ Key Features

### 🎮 Core Gameplay

* **28 個關卡**：具備不同磚塊配置與節奏變化
* **Boss 關卡設計**：每 7 關出現一次 Boss

  * Mini Boss（L7）
  * Fire Dragon（L14）
  * Ice Kraken（L21）
  * Thunder Mecha（L28）
* **Seeded RNG（每日挑戰）**
  使用固定種子產生每日關卡，確保所有玩家在相同條件下競爭排行榜

---

### ⚡ Power-ups & Items

超過 15 種道具與變化：

* **Buff 類**

  * 多球（🔵）
  * 擋板加寬（🔴）
  * 穿透／雷射（⚡）
  * 火球（🔥）
  * 磁力（🧲）
  * 安全網（🛡️）
* **Debuff 類**

  * 擋板縮小（💀）
  * 時間減速（⏱️）
* **Elite Bricks**

  * 具備火、冰、雷等反擊行為的特殊磚塊

---

### 🏆 Progression & Social

* **全球排行榜（Supabase）**

  * Daily / Weekly / All-Time
* **即時訪客統計**

  * 總訪客、今日訪客、線上玩家
* **成就系統**

  * 例如 Perfect Bounces、Combo Maniac、Boss Hunter
* **本地存檔**

  * High Score、設定、成就皆以 LocalStorage 保存

---

### 📱 Modern Tech Stack

* **PWA 支援**

  * 可安裝為桌面或手機 App
  * 支援離線遊玩
* **響應式設計**

  * 桌面滑鼠／鍵盤
  * 行動裝置觸控
* **視覺回饋**

  * 粒子特效
  * 畫面震動
  * 動態光效與動畫

---

## 🕹️ Controls｜操作方式

| 操作   | 桌面版        | 行動裝置  |
| ---- | ---------- | ----- |
| 移動擋板 | 滑鼠移動 / ← → | 拖曳    |
| 發射球  | 左鍵 / 空白鍵   | 點擊    |
| 暫停   | 空白鍵        | UI 按鈕 |
| 靜音   | M          | UI 按鈕 |
| 全螢幕  | F          | UI 按鈕 |

---

## 🚀 Installation & Usage｜安裝與執行

### 1️⃣ Clone Repository

```
git clone https://github.com/yourusername/brick-breaker.git
cd brick-breaker
```

### 2️⃣ 啟動本地伺服器（建議）

由於使用 ES6 Modules、Service Worker、AudioContext，
不建議直接開啟 index.html。

* **VS Code**

  * 使用 Live Server
* **Python**

  ```
  python3 -m http.server 8000
  ```
* **Node**

  ```
  npx http-server .
  ```

### 3️⃣ 開始遊玩

瀏覽 `http://localhost:8000`

---

## 🛠️ Architecture Overview｜架構說明

專案刻意採用**模組化拆分**，並搭配文件作為架構約束：

* **game.js**
  核心遊戲迴圈、狀態管理、事件處理
* **config.js**
  全域設定、常數、i18n
* **system.md / data.md / api.md**
  定義狀態機、資料模型與系統規則
* **components/**

  * SoundManager.js：音效與 BGM
  * ParticleSystem.js：粒子池
  * BossManager.js：Boss AI 與攻擊模式
  * AchievementSystem.js：成就與統計

> 這樣的拆分不是為了炫技，而是刻意優先考慮
> **可控性、可重構性與未來接手成本**。

---

## 👾 Game Mechanics｜遊戲機制補充

* **Combo 系統**

  * 球未碰到擋板前連續擊破磚塊可累積倍率
* **Insert Coin 接關**

  * 生命歸零時可消耗 10,000 分或 1 Credit
  * 恢復 3 條命並短暫無敵
* **難度調整**

  * 球速隨關卡提升
  * 設有上限避免失控

---

## 📄 License

本專案為 **Vibe Coding 實驗與教學用途**，
用來展示以自然語言與系統思維管理中型專案的可行性。



