/**
 * Brick Breaker - Sound Manager Module
 * Handles all audio: BGM sequencing, SFX, volume control.
 * Depends on: config.js (BGM_THEMES)
 */

class SoundManager {
    constructor() {
        this.audioContext = null;
        this.enabled = true;
        this.bgmEnabled = true;
        this.volume = 0.3;

        // BGM 狀態
        this.currentBgm = null;
        this.currentBgmName = null;
        this.nextNoteTime = 0;
        this.noteIndex = 0;
        this.isPlayingBgm = false;
        this.bgmTimerId = null;
    }

    // 初始化音频上下文
    init() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }

    // BGM 播放
    startBgm(themeName) {
        if (!this.enabled || !this.bgmEnabled || !this.audioContext) return;

        if (this.currentBgmName === themeName && this.isPlayingBgm) return;

        this.stopBgm();
        const theme = BGM_THEMES[themeName];
        if (!theme) return;

        this.currentBgmName = themeName;
        this.isPlayingBgm = true;
        this.noteIndex = 0;
        this.nextNoteTime = this.audioContext.currentTime;

        this.scheduleNote(theme);
    }

    scheduleNote(theme) {
        if (!this.isPlayingBgm || !this.audioContext) return;

        while (this.nextNoteTime < this.audioContext.currentTime + 0.1) {
            const note = theme.notes[this.noteIndex];
            this.playBgmNote(note.freq, note.dur, theme.bpm);

            const secondsPerBeat = 60.0 / theme.bpm;
            const noteDuration = secondsPerBeat * (note.dur / 4);

            this.nextNoteTime += noteDuration;

            this.noteIndex++;
            if (this.noteIndex >= theme.notes.length) {
                this.noteIndex = 0;
            }
        }

        this.bgmTimerId = setTimeout(() => this.scheduleNote(theme), 25);
    }

    playBgmNote(freq, durUnits, bpm) {
        if (freq === 0) return;

        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.connect(gain);
        gain.connect(this.audioContext.destination);

        osc.type = 'square';
        osc.frequency.value = freq;

        const secondsPerBeat = 60.0 / bpm;
        const duration = secondsPerBeat * (durUnits / 4);

        const now = this.nextNoteTime;
        gain.gain.setValueAtTime(this.volume * 0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + duration - 0.05);

        osc.start(now);
        osc.stop(now + duration);
    }

    stopBgm() {
        this.isPlayingBgm = false;
        if (this.bgmTimerId) {
            clearTimeout(this.bgmTimerId);
            this.bgmTimerId = null;
        }
        this.currentBgmName = null;
    }

    // 通用音調播放
    playTone(frequency, duration, type = 'square', volumeMultiplier = 1) {
        if (!this.enabled || !this.audioContext) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.frequency.value = frequency;
        oscillator.type = type;

        const volume = this.volume * volumeMultiplier;
        const now = this.audioContext.currentTime;
        gainNode.gain.setValueAtTime(volume, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);

        oscillator.start(now);
        oscillator.stop(now + duration);
    }

    // ===== 遊戲音效 =====
    playPaddleHit() {
        this.playTone(220, 0.1, 'sine', 0.8);
    }

    playBrickHit(row = 0) {
        const baseFreq = 400 + row * 50;
        this.playTone(baseFreq, 0.1, 'square', 0.6);
        setTimeout(() => this.playTone(baseFreq * 1.5, 0.05, 'sine', 0.3), 50);
    }

    playComboSound(combo) {
        const scale = [261.6, 293.6, 329.6, 349.2, 392.0, 440.0, 493.9, 523.2];
        const noteIndex = (combo - 1) % scale.length;
        const octave = Math.floor((combo - 1) / scale.length) + 1;
        const freq = scale[noteIndex] * octave;

        this.playTone(freq, 0.1, 'triangle', 0.7);
        setTimeout(() => this.playTone(freq * 1.5, 0.1, 'square', 0.3), 20);
    }

    playWallHit() {
        this.playTone(150, 0.05, 'triangle', 0.4);
    }

    playLoseLife() {
        this.stopBgm();
        this.playTone(200, 0.15, 'sawtooth', 0.5);
        setTimeout(() => this.playTone(150, 0.15, 'sawtooth', 0.4), 150);
        setTimeout(() => this.playTone(100, 0.2, 'sawtooth', 0.3), 300);
    }

    playGameOver() {
        this.stopBgm();
        const notes = [392, 330, 294, 262];
        notes.forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 0.3, 'sine', 0.5), i * 200);
        });
    }

    playLevelComplete() {
        this.stopBgm();
        const notes = [523, 659, 784, 1047];
        notes.forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 0.15, 'sine', 0.6), i * 100);
        });
    }

    playStart() {
        this.playTone(440, 0.1, 'sine', 0.5);
        setTimeout(() => this.playTone(554, 0.1, 'sine', 0.5), 100);
        setTimeout(() => this.playTone(659, 0.15, 'sine', 0.6), 200);
    }

    playExplosion() {
        this.playTone(100, 0.1, 'sawtooth', 0.8);
        setTimeout(() => this.playTone(80, 0.15, 'square', 0.6), 50);
        setTimeout(() => this.playTone(50, 0.2, 'sawtooth', 0.5), 150);
    }

    playPowerup() {
        this.playTone(880, 0.08, 'sine', 0.5);
        setTimeout(() => this.playTone(1100, 0.08, 'sine', 0.5), 80);
        setTimeout(() => this.playTone(1320, 0.12, 'sine', 0.6), 160);
    }

    playCoin() {
        this.playTone(1200, 0.08, 'sine', 0.6);
        setTimeout(() => this.playTone(1500, 0.1, 'sine', 0.5), 60);
        setTimeout(() => this.playTone(1800, 0.12, 'sine', 0.4), 120);
    }

    playLightning() {
        this.playTone(800, 0.05, 'sawtooth', 0.7);
        setTimeout(() => this.playTone(1200, 0.08, 'square', 0.5), 40);
        setTimeout(() => this.playTone(600, 0.1, 'sawtooth', 0.6), 80);
        setTimeout(() => this.playTone(1000, 0.06, 'square', 0.4), 140);
    }

    playShield() {
        this.playTone(400, 0.15, 'sine', 0.4);
        setTimeout(() => this.playTone(500, 0.15, 'sine', 0.5), 100);
        setTimeout(() => this.playTone(600, 0.2, 'sine', 0.4), 200);
    }

    playFreeze() {
        this.playTone(1500, 0.1, 'sine', 0.5);
        setTimeout(() => this.playTone(1800, 0.08, 'triangle', 0.4), 50);
        setTimeout(() => this.playTone(2000, 0.12, 'sine', 0.3), 100);
    }

    playTeleport() {
        this.playTone(300, 0.1, 'sine', 0.5);
        setTimeout(() => this.playTone(600, 0.15, 'sine', 0.6), 100);
        setTimeout(() => this.playTone(1200, 0.1, 'sine', 0.4), 200);
        setTimeout(() => this.playTone(400, 0.1, 'triangle', 0.3), 300);
    }

    // 音效開關
    toggle() {
        this.enabled = !this.enabled;
        if (!this.enabled) {
            this.stopBgm();
        }
        return this.enabled;
    }
}

// 創建全局音效管理器實例
const soundManager = new SoundManager();
