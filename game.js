/**
 * 彭彭大槌王：平衡木生死鬥
 * Mobile-First First-Person 3x3 Grid Reaction Block Game
 */

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const W = canvas.width;   // 720
const H = canvas.height;  // 1280

// DOM Elements
const hpBarFill = document.getElementById('hp-bar-fill');
const hpBarDamage = document.getElementById('hp-bar-damage');
const hpText = document.getElementById('hp-text');
const stageBadge = document.getElementById('stage-badge');
const timerDisplay = document.getElementById('timer-display');
const bossSpeech = document.getElementById('boss-speech');
const damageFlash = document.getElementById('damage-flash');

const startOverlay = document.getElementById('start-overlay');
const gameoverOverlay = document.getElementById('gameover-overlay');
const settingsOverlay = document.getElementById('settings-overlay');

const btnStart = document.getElementById('btn-start');
const btnRetry = document.getElementById('btn-retry');
const btnShare = document.getElementById('btn-share');
const btnDownload = document.getElementById('btn-download');
const btnMute = document.getElementById('btn-mute');
const btnSettings = document.getElementById('btn-settings');
const btnOpenTuner = document.getElementById('btn-open-tuner');
const btnCloseSettings = document.getElementById('btn-close-settings');
const btnSaveSettings = document.getElementById('btn-save-settings');
const btnResetSettings = document.getElementById('btn-reset-settings');

const shareCanvas = document.getElementById('share-canvas');
const shareCtx = shareCanvas.getContext('2d');
const shareImagePreview = document.getElementById('share-image-preview');

// 預設遊戲平衡參數（實際試玩後鎖定的數值；設定面板的「恢復預設」也回到這組）
const DEFAULT_CONFIG = {
  maxHits: 6,          // 被擊中 6 次陣亡
  lv1FillTime: 1.00,   // Lv.1 黑槌推進填滿秒數 (微笑輕浮)
  lv2FillTime: 0.75,   // Lv.2 黑槌推進填滿秒數 (表情嚴肅)
  lv3FillTime: 0.55,   // Lv.3 黑槌推進填滿秒數 (咬牙出力)
  lv4FillTime: 0.36,   // Lv.4 黑槌推進填滿秒數 (脹紅臉吼拉連擊)
  lv4StartTime: 25,    // 幾秒後進入 Lv.4 暴走必死階段
  bgmVolume: 18,       // 背景音樂音量百分比 (0~50)
  useRealVoice: false  // true = 頭目台詞全部改用影片擷取的真人原音；false = 中文配音
};

let config = { ...DEFAULT_CONFIG };

// 載入圖片素材
const images = {};
const IMAGE_SOURCES = {
  bg: 'assets/images/arena_bg_v2.jpg',
  // 劍道中段持槌立繪（tools/make_boss_kendo.py 產生）：lvN = 待命原圖、lvNBody = 擦掉槌頭的攻擊用立繪
  lv1: 'assets/images/kendo/boss_lv1_kendo_full.png',
  lv2: 'assets/images/kendo/boss_lv2_kendo_full.png',
  lv3: 'assets/images/kendo/boss_lv3_kendo_full.png',
  lv4: 'assets/images/kendo/boss_lv4_kendo_full.png',
  lv1Body: 'assets/images/kendo/boss_lv1_kendo.png',
  lv2Body: 'assets/images/kendo/boss_lv2_kendo.png',
  lv3Body: 'assets/images/kendo/boss_lv3_kendo.png',
  lv4Body: 'assets/images/kendo/boss_lv4_kendo.png',
  hammerFront: 'assets/images/kendo/hammer_front.png',
  victory: 'assets/images/kendo/boss_victory.png',
  hammer: 'assets/images/hammer_head.png',
  hands: 'assets/images/player_hands.png'
};

let imagesLoaded = 0;
const totalImages = Object.keys(IMAGE_SOURCES).length;

Object.entries(IMAGE_SOURCES).forEach(([key, src]) => {
  const img = new Image();
  img.onload = () => {
    imagesLoaded++;
  };
  img.src = src;
  images[key] = img;
});

// 頭目配音
// 預設：中文台詞配音（assets/audio/zh，由 tools/make_voice_zh.py 產生，聲線貼近影片中的頭目）
// boss_real：從原始影片 56.85s~59.15s 擷取的 2.3 秒真人原音（useRealVoice 開啟時所有頭目台詞都改用它）
const REAL_VOICE_KEY = 'boss_real';
const REAL_VOICE_SECONDS = 2.3;
const voiceClips = {};      // HTMLAudio 備援
const voiceBuffers = {};    // Web Audio 解碼後的緩衝（手機播放零延遲、可重疊）

// 台詞文字，要改台詞時 tools/make_voice_zh.py 也要一起改並重新產生配音
const VOICE_LINES = {
  start:     '呵呵…做好覺悟了嗎？',
  lv2_taunt: '看招！',
  lv3_push:  '喝！哈！',          // 健身出力的喊聲，不是笑聲
  lv4_ora:   '吼拉吼拉吼拉！',
  victory:   '呵呵，是我贏了！',
  atk_lv1_1: '嘿！', atk_lv1_2: '看這邊！', atk_lv1_3: '那裡！',
  atk_lv2_1: '看招！', atk_lv2_2: '太慢了！', atk_lv2_3: '喝！',
  atk_lv3_1: '哈！', atk_lv3_2: '喝！', atk_lv3_3: '嗯，哈！',
  atk_lv4_1: '吼拉！', atk_lv4_2: '吼拉吼拉！', atk_lv4_3: '吼拉！'
};
// 網址加 ?tuner 是自己調參數用的模式：顯示設定按鈕，也才會載入真人原音（發布版不附原音檔）
const TUNER_MODE = new URLSearchParams(location.search).has('tuner');
const VOICE_KEYS = [...(TUNER_MODE ? [REAL_VOICE_KEY] : []), ...Object.keys(VOICE_LINES)];
const voicePath = key => (key === REAL_VOICE_KEY ? `assets/audio/${key}.mp3` : `assets/audio/zh/${key}.mp3`);

VOICE_KEYS.forEach(key => {
  const audio = new Audio(voicePath(key));
  audio.preload = 'auto';
  voiceClips[key] = audio;
});

// ==========================================
// 音效與四階段動態背景音樂引擎 (Web Audio API)
// ==========================================
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.bgmTimer = null;
    this.bgmStep = 0;
    this.currentStage = 1;
    this.lastVoiceTime = 0;
    this.activeSources = [];
    this.buffersLoading = false;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
      this.voiceGain = this.ctx.createGain();
      this.voiceGain.gain.value = 1.0;
      this.voiceGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    this.loadVoiceBuffers();
  }

  // 將配音解碼成 Web Audio 緩衝：手機上播放零延遲，且「吼拉吼拉」可以重疊連發
  loadVoiceBuffers() {
    if (this.buffersLoading || !this.ctx || location.protocol === 'file:') return;
    this.buffersLoading = true;
    VOICE_KEYS.forEach(key => {
      fetch(voicePath(key))
        .then(r => r.arrayBuffer())
        .then(ab => new Promise((resolve, reject) => this.ctx.decodeAudioData(ab, resolve, reject)))
        .then(buf => { voiceBuffers[key] = buf; })
        .catch(() => {});
    });
  }

  // cooldownMs：同一時間不讓台詞互相蓋過；force 用於開場 / 換階段 / 勝利台詞
  playVoiceClip(key, volume = 0.9, playbackRate = 1.0, force = false, cooldownMs = 900) {
    if (this.muted) return;
    if (config.useRealVoice) {
      // 真人原音只有一段 2.3 秒，冷卻至少要等它播完，避免台詞互相疊在一起
      key = REAL_VOICE_KEY;
      cooldownMs = Math.max(cooldownMs, (REAL_VOICE_SECONDS / playbackRate) * 1000);
    }
    const now = performance.now();
    if (!force && now - this.lastVoiceTime < cooldownMs) return;
    this.lastVoiceTime = now;

    if (force) this.stopAllVoices();

    const buf = voiceBuffers[key];
    if (buf && this.ctx) {
      const src = this.ctx.createBufferSource();
      const g = this.ctx.createGain();
      src.buffer = buf;
      src.playbackRate.value = playbackRate;
      g.gain.value = Math.min(1.2, volume);
      src.connect(g).connect(this.voiceGain);
      src.start();
      this.activeSources.push(src);
      src.onended = () => {
        this.activeSources = this.activeSources.filter(s => s !== src);
      };
      return;
    }

    // 備援：HTMLAudio
    const clip = voiceClips[key];
    if (!clip) return;
    try {
      clip.currentTime = 0;
      clip.volume = Math.min(1, volume);
      clip.playbackRate = playbackRate;
      clip.play().catch(() => {});
    } catch (e) {}
  }

  stopAllVoices() {
    this.activeSources.forEach(s => { try { s.stop(); } catch (e) {} });
    this.activeSources = [];
    Object.values(voiceClips).forEach(clip => {
      try {
        clip.pause();
        clip.currentTime = 0;
      } catch (e) {}
    });
  }

  // 頭目每次出槌的喊聲（依階段切換台詞與語速）
  playBossAttackVocal(stage) {
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    if (stage === 1) {
      // 輕浮：嘿！ / 看這邊！ / 那裡！
      this.playVoiceClip(pick(['atk_lv1_1', 'atk_lv1_2', 'atk_lv1_3']), 0.85, 1.0, false, 1400);
    } else if (stage === 2) {
      // 嚴肅：看招！ / 太慢了！ / 喝！
      this.playVoiceClip(pick(['atk_lv2_1', 'atk_lv2_2', 'atk_lv2_3']), 0.9, 1.0, false, 1100);
    } else if (stage === 3) {
      // 出力：健身式喊聲 哈！ / 喝！ / 嗯，哈！
      this.playVoiceClip(pick(['atk_lv3_1', 'atk_lv3_2', 'atk_lv3_3']), 0.95, 1.05, false, 800);
    } else {
      // 暴走：吼拉！ / 吼拉吼拉！ 高速連發
      this.playVoiceClip(pick(['atk_lv4_1', 'atk_lv4_2', 'atk_lv4_3']), 1.0, 1.12, false, 420);
    }
  }

  // 木板成功擋下黑槌的清脆撞擊音效「砰！叩！」
  playWoodBlock() {
    if (this.muted || !this.ctx) return;
    const now = this.ctx.currentTime;

    // 木板共鳴音
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.09);
    gain.gain.setValueAtTime(0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.11);

    // 清脆高頻敲擊聲
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'square';
    osc2.frequency.setValueAtTime(780, now);
    osc2.frequency.exponentialRampToValueAtTime(240, now + 0.045);
    gain2.gain.setValueAtTime(0.22, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc2.connect(gain2).connect(this.ctx.destination);
    osc2.start(now);
    osc2.stop(now + 0.05);
  }

  // 玩家被黑槌擊中扣血的重低音「咚！！」
  playPlayerHit() {
    if (this.muted || !this.ctx) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(38, now + 0.28);
    gain.gain.setValueAtTime(0.55, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.30);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.30);
  }

  // 四階段動態背景音樂 (BGM) — 音量輕柔，隨難度 Lv.1~Lv.4 加快節奏與熱血度
  startBGM() {
    this.stopBGM();
    this.bgmStep = 0;

    const tick = () => {
      if (!gameState.running) return;
      const stage = gameState.stage;
      const vol = (config.bgmVolume / 100) * 0.25; // 保持低調背景襯托

      if (!this.muted && this.ctx && vol > 0.002) {
        const now = this.ctx.currentTime;
        const step = this.bgmStep % 8;

        // 四階段不同音階與節奏感
        const scales = {
          1: [261.6, 329.6, 392.0, 523.3, 392.0, 329.6, 293.7, 392.0], // C 大調輕快街機
          2: [220.0, 261.6, 329.6, 293.7, 220.0, 329.6, 293.7, 246.9], // A 小調認真推進
          3: [196.0, 233.1, 293.7, 392.0, 293.7, 233.1, 261.6, 311.1], // G 小調緊張出力
          4: [164.8, 246.9, 329.6, 392.0, 493.9, 392.0, 329.6, 293.7]  // E 小調快打暴走高速琶音
        };

        const notes = scales[stage] || scales[1];
        const freq = notes[step];

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = stage >= 3 ? 'sawtooth' : 'triangle';
        osc.frequency.setValueAtTime(freq, now);

        const noteLen = stage === 4 ? 0.09 : 0.13;
        gain.gain.setValueAtTime(vol, now);
        gain.gain.exponentialRampToValueAtTime(0.0008, now + noteLen);

        osc.connect(gain).connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + noteLen);

        // 重拍低音鼓點
        if (step % 2 === 0) {
          const kick = this.ctx.createOscillator();
          const kGain = this.ctx.createGain();
          kick.type = 'sine';
          kick.frequency.setValueAtTime(stage === 4 ? 120 : 95, now);
          kick.frequency.exponentialRampToValueAtTime(35, now + 0.08);
          kGain.gain.setValueAtTime(vol * 1.3, now);
          kGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
          kick.connect(kGain).connect(this.ctx.destination);
          kick.start(now);
          kick.stop(now + 0.09);
        }
      }

      this.bgmStep++;
      // 根據難度階段調整 BPM 速度
      const intervals = { 1: 250, 2: 200, 3: 155, 4: 110 };
      const nextDelay = intervals[gameState.stage] || 220;
      this.bgmTimer = setTimeout(tick, nextDelay);
    };

    tick();
  }

  stopBGM() {
    if (this.bgmTimer) {
      clearTimeout(this.bgmTimer);
      this.bgmTimer = null;
    }
  }
}

const sound = new SoundEngine();

// ==========================================
// 九宮格圓圈座標配置 (3x3 Grid)
// ==========================================
const GRID_CELLS = [];
const GRID_CENTER_X = W / 2;
const GRID_CENTER_Y = 720;
const GRID_SPACING_X = 205;
const GRID_SPACING_Y = 185;
const CELL_RADIUS = 78;

for (let row = 0; row < 3; row++) {
  for (let col = 0; col < 3; col++) {
    GRID_CELLS.push({
      index: row * 3 + col,
      row,
      col,
      x: GRID_CENTER_X + (col - 1) * GRID_SPACING_X,
      y: GRID_CENTER_Y + (row - 1) * GRID_SPACING_Y,
      r: CELL_RADIUS
    });
  }
}

// ==========================================
// 遊戲狀態管理
// ==========================================
// 階段台詞見 VOICE_LINES（lv2_taunt / lv3_push / lv4_ora）
const STAGE_INFO = {
  1: { name: 'Lv.1 輕浮微笑', badgeClass: 'stage-1' },
  2: { name: 'Lv.2 嚴肅認真', badgeClass: 'stage-2' },
  3: { name: 'Lv.3 咬牙出力', badgeClass: 'stage-3' },
  4: { name: 'Lv.4 脹紅臉暴走', badgeClass: 'stage-4' }
};

let gameState = {
  running: false,
  celebratingVictory: false,
  victoryStartTime: 0,
  startTime: 0,
  survivalTime: 0,
  stage: 1,
  maxStageReached: 1,
  hp: 100,
  maxHp: 100,
  damagePerHit: 20,
  blocksCount: 0,
  hitsTaken: 0,
  activeAttacks: [], // { cellIndex, progress (0..1), fillDuration, spawnTime, oraText }
  blockEffects: [],  // { cellIndex, x, y, time, duration }
  retracting: [],    // 收回中的黑槌 { cellIndex, progress }
  particles: [],     // 火花/木屑/衝擊波
  floatingTexts: [], // { x, y, text, color, alpha, vy, scale }
  screenShake: 0,
  bossLunge: 0,      // 頭目出槌前衝動畫量 (0..1)
  handsTargetX: W / 2,
  handsTargetY: H - 125,
  handsCurX: W / 2,
  handsCurY: H - 125,
  handsThrust: 0,    // 玩家雙手推木板動畫 (0..1)
  nextAttackTimer: 0,
  speechTimeout: null
};

function showBossSpeech(text, isRage = false, duration = 1600) {
  bossSpeech.textContent = text;
  bossSpeech.classList.remove('hidden');
  if (isRage) {
    bossSpeech.classList.add('rage');
  } else {
    bossSpeech.classList.remove('rage');
  }
  if (gameState.speechTimeout) clearTimeout(gameState.speechTimeout);
  gameState.speechTimeout = setTimeout(() => {
    bossSpeech.classList.add('hidden');
  }, duration);
}

// 顯示配音台詞氣泡
function showBossLine(key, isRage = false, duration = 1600) {
  showBossSpeech(VOICE_LINES[key], isRage, duration);
}

// 計算目前生存秒數對應的難度階段 (1~4)
function getStageByTime(t) {
  const lv4Start = config.lv4StartTime;
  const lv2Start = Math.max(4, Math.round(lv4Start * 0.28)); // 預設約 6秒
  const lv3Start = Math.max(9, Math.round(lv4Start * 0.62)); // 預設約 14秒

  if (t >= lv4Start) return 4;
  if (t >= lv3Start) return 3;
  if (t >= lv2Start) return 2;
  return 1;
}

// 取得當前難度的黑槌推進填滿秒數 與 下一次攻擊間隔
function getStageParams(stage, t) {
  const lv4Start = config.lv4StartTime;
  if (stage === 1) {
    return {
      fillDuration: config.lv1FillTime,
      attackInterval: config.lv1FillTime * 0.92,
      maxConcurrent: 1
    };
  }
  if (stage === 2) {
    return {
      fillDuration: config.lv2FillTime,
      attackInterval: config.lv2FillTime * 0.78,
      maxConcurrent: 2
    };
  }
  if (stage === 3) {
    return {
      fillDuration: config.lv3FillTime,
      attackInterval: config.lv3FillTime * 0.68,
      maxConcurrent: 2
    };
  }
  // Stage 4: 脹紅臉暴走「吼拉吼拉」連擊，隨時間越久越快，直到玩家必死
  const overtime = Math.max(0, t - lv4Start);
  const speedUp = Math.min(0.15, overtime * 0.012);
  const fillDuration = Math.max(0.20, config.lv4FillTime - speedUp);
  return {
    fillDuration,
    attackInterval: Math.max(0.15, fillDuration * 0.48),
    maxConcurrent: 4
  };
}

// 啟動新的一局
function startGame() {
  sound.init();
  sound.stopAllVoices();

  setFriendView(false);
  hideShareHelp();
  startOverlay.classList.remove('active');
  gameoverOverlay.classList.remove('active');
  settingsOverlay.classList.remove('active');

  const damagePerHit = Math.round(100 / config.maxHits);

  gameState = {
    running: true,
    celebratingVictory: false,
    victoryStartTime: 0,
    startTime: performance.now(),
    survivalTime: 0,
    stage: 1,
    maxStageReached: 1,
    hp: 100,
    maxHp: 100,
    damagePerHit,
    blocksCount: 0,
    hitsTaken: 0,
    activeAttacks: [],
    blockEffects: [],
    retracting: [],
    particles: [],
    floatingTexts: [],
    screenShake: 0,
    bossLunge: 0,
    handsTargetX: W / 2,
    handsTargetY: H - 120,
    handsCurX: W / 2,
    handsCurY: H - 120,
    handsThrust: 0,
    nextAttackTimer: 0.65,
    speechTimeout: null
  };

  updateHpUI();
  updateStageUI(1);
  timerDisplay.innerHTML = `00.00<small>s</small>`;

  sound.playVoiceClip('start', 0.9, 1.0, true);
  sound.startBGM();
  showBossLine('start', false, 1800);
}

function updateHpUI() {
  const pct = Math.max(0, Math.min(100, (gameState.hp / gameState.maxHp) * 100));
  hpBarFill.style.width = `${pct}%`;
  hpBarDamage.style.width = `${pct}%`;
  hpText.textContent = `${Math.max(0, gameState.hp)} / ${gameState.maxHp}`;
}

function updateStageUI(stage) {
  const info = STAGE_INFO[stage];
  stageBadge.textContent = info.name;
  stageBadge.className = `stage-badge ${info.badgeClass}`;
}

// 頭目發動一次黑槌推進攻擊
function spawnBossAttack() {
  const params = getStageParams(gameState.stage, gameState.survivalTime);
  if (gameState.activeAttacks.length >= params.maxConcurrent) return;

  // 找出目前沒有被攻擊的九宮格
  const occupied = new Set(gameState.activeAttacks.map(a => a.cellIndex));
  const available = GRID_CELLS.filter(c => !occupied.has(c.index));
  if (available.length === 0) return;

  const chosen = available[Math.floor(Math.random() * available.length)];

  gameState.activeAttacks.push({
    cellIndex: chosen.index,
    progress: 0, // 0.0 -> 1.0 (1.0 代表黑槌完全填滿圓圈)
    fillDuration: params.fillDuration,
    spawnTime: performance.now()
  });

  gameState.bossLunge = 1.0;
  sound.playBossAttackVocal(gameState.stage);

  if (gameState.stage === 4) {
    // 暴走階段在畫面隨機跳出「吼拉！」漫畫字
    addFloatingText(
      chosen.x + (Math.random() - 0.5) * 60,
      chosen.y - 55,
      '吼拉！',
      '#fde047',
      1.15
    );
  }
}

function addFloatingText(x, y, text, color = '#fff', scale = 1.0) {
  gameState.floatingTexts.push({
    x,
    y,
    text,
    color,
    alpha: 1.0,
    vy: -90,
    scale
  });
}

function spawnParticles(x, y, color, count = 12) {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
    const speed = 120 + Math.random() * 240;
    gameState.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r: 4 + Math.random() * 6,
      color,
      alpha: 1.0,
      decay: 2.2 + Math.random() * 1.2
    });
  }
}

// 玩家點擊畫面或九宮格進行木板格擋
function handlePlayerInput(clientX, clientY) {
  if (!gameState.running || gameState.celebratingVictory) return;

  const rect = canvas.getBoundingClientRect();
  const x = ((clientX - rect.left) / rect.width) * W;
  const y = ((clientY - rect.top) / rect.height) * H;

  // 找出玩家點擊的是哪一個九宮格圓圈 (容許稍微寬鬆的觸控半徑)
  let clickedCell = null;
  let minDist = Infinity;

  for (const cell of GRID_CELLS) {
    const dist = Math.hypot(x - cell.x, y - cell.y);
    if (dist <= cell.r * 1.32 && dist < minDist) {
      minDist = dist;
      clickedCell = cell;
    }
  }

  if (!clickedCell) return;

  // 移動下方第一人稱雙手與木板到該九宮格方向
  gameState.handsTargetX = W / 2 + (clickedCell.x - W / 2) * 0.55;
  gameState.handsTargetY = H - 140 + (clickedCell.y - GRID_CENTER_Y) * 0.25;
  gameState.handsThrust = 1.0;

  // 顯示木板格擋殘影在該九宮格上
  gameState.blockEffects.push({
    cellIndex: clickedCell.index,
    x: clickedCell.x,
    y: clickedCell.y,
    alpha: 1.0
  });

  // 檢查該九宮格是否有正在推進的黑槌
  const attackIdx = gameState.activeAttacks.findIndex(a => a.cellIndex === clickedCell.index);
  if (attackIdx !== -1) {
    // 格擋成功！
    const blocked = gameState.activeAttacks.splice(attackIdx, 1)[0];
    gameState.retracting.push({ cellIndex: blocked.cellIndex, progress: blocked.progress });
    gameState.blocksCount++;
    gameState.screenShake = Math.max(gameState.screenShake, 7);

    sound.playWoodBlock();
    if (navigator.vibrate) navigator.vibrate(18);

    spawnParticles(clickedCell.x, clickedCell.y, '#f59e0b', 14);
    addFloatingText(clickedCell.x, clickedCell.y - 20, '🪵 擋住！', '#4ade80', 1.15);
  } else {
    // 空揮木板輕微聲
    sound.playWoodBlock();
  }
}

canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  handlePlayerInput(e.clientX, e.clientY);
});

// 當黑槌填滿圓圈且玩家未及時拿木板阻擋 -> 被擊中失血！
function onPlayerHitByHammer(cell) {
  gameState.hitsTaken++;
  gameState.hp = Math.max(0, gameState.hp - gameState.damagePerHit);
  // 確保到達 maxHits 時一定歸零
  if (gameState.hitsTaken >= config.maxHits) {
    gameState.hp = 0;
  }

  updateHpUI();
  sound.playPlayerHit();
  if (navigator.vibrate) navigator.vibrate([60, 30, 80]);

  gameState.screenShake = 26;
  damageFlash.classList.add('active');
  setTimeout(() => damageFlash.classList.remove('active'), 160);

  spawnParticles(cell.x, cell.y, '#ef4444', 20);
  addFloatingText(cell.x, cell.y, `💥 -${gameState.damagePerHit} HP!`, '#ff1e42', 1.35);

  if (gameState.hp <= 0) {
    triggerBossVictory();
  }
}

// 玩家血條歸零 -> 頭目高舉黑色鎚子獲勝慶祝！
function triggerBossVictory() {
  gameState.celebratingVictory = true;
  gameState.victoryStartTime = performance.now();
  gameState.activeAttacks = [];
  gameState.retracting = [];
  sound.stopBGM();
  sound.playVoiceClip('victory', 1.0, 1.0, true);
  showBossLine('victory', true, 3000);

  // 噴發慶祝彩帶粒子
  for (let i = 0; i < 45; i++) {
    spawnParticles(
      W * 0.2 + Math.random() * W * 0.6,
      250 + Math.random() * 250,
      ['#facc15', '#ef4444', '#38bdf8', '#4ade80'][i % 4],
      2
    );
  }

  // 讓玩家欣賞 1.8 秒頭目高舉黑槌慶祝畫面後，彈出戰績分享卡
  setTimeout(() => {
    gameState.running = false;
    generateShareCardImage();
    gameoverOverlay.classList.add('active');
  }, 1850);
}

// ==========================================
// 主遊戲迴圈 (Update & Render)
// ==========================================
let lastFrameTime = performance.now();

function gameLoop(now) {
  const dt = Math.min(0.05, (now - lastFrameTime) / 1000);
  lastFrameTime = now;

  update(dt, now);
  render(now);

  requestAnimationFrame(gameLoop);
}

function update(dt, now) {
  if (gameState.screenShake > 0) {
    gameState.screenShake = Math.max(0, gameState.screenShake - dt * 60);
  }

  if (gameState.bossLunge > 0) {
    gameState.bossLunge = Math.max(0, gameState.bossLunge - dt * 4.5);
  }

  if (gameState.handsThrust > 0) {
    gameState.handsThrust = Math.max(0, gameState.handsThrust - dt * 5.5);
  } else {
    // 雙手回到畫面正下方待命位置
    gameState.handsTargetX += (W / 2 - gameState.handsTargetX) * dt * 6;
    gameState.handsTargetY += (H - 120 - gameState.handsTargetY) * dt * 6;
  }

  gameState.handsCurX += (gameState.handsTargetX - gameState.handsCurX) * Math.min(1, dt * 22);
  gameState.handsCurY += (gameState.handsTargetY - gameState.handsCurY) * Math.min(1, dt * 22);

  // 黑槌收回動畫
  for (let i = gameState.retracting.length - 1; i >= 0; i--) {
    const rt = gameState.retracting[i];
    rt.progress -= dt * 4.2;
    if (rt.progress <= 0.06) gameState.retracting.splice(i, 1);
  }

  // 更新粒子與浮動文字
  for (let i = gameState.particles.length - 1; i >= 0; i--) {
    const p = gameState.particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.alpha -= p.decay * dt;
    if (p.alpha <= 0) gameState.particles.splice(i, 1);
  }

  for (let i = gameState.floatingTexts.length - 1; i >= 0; i--) {
    const ft = gameState.floatingTexts[i];
    ft.y += ft.vy * dt;
    ft.alpha -= dt * 1.45;
    if (ft.alpha <= 0) gameState.floatingTexts.splice(i, 1);
  }

  for (let i = gameState.blockEffects.length - 1; i >= 0; i--) {
    const be = gameState.blockEffects[i];
    be.alpha -= dt * 3.8;
    if (be.alpha <= 0) gameState.blockEffects.splice(i, 1);
  }

  if (!gameState.running || gameState.celebratingVictory) return;

  // 更新生存計時器
  gameState.survivalTime = (now - gameState.startTime) / 1000;
  timerDisplay.innerHTML = `${gameState.survivalTime.toFixed(2).padStart(5, '0')}<small>s</small>`;

  // 檢查難度階段升級 (Lv.1 -> Lv.2 -> Lv.3 -> Lv.4)
  const newStage = getStageByTime(gameState.survivalTime);
  if (newStage !== gameState.stage) {
    gameState.stage = newStage;
    gameState.maxStageReached = Math.max(gameState.maxStageReached, newStage);
    updateStageUI(newStage);

    // 階段切換：頭目台詞氣泡 + 配音
    const stageLine = { 2: 'lv2_taunt', 3: 'lv3_push', 4: 'lv4_ora' }[newStage];
    showBossLine(stageLine, newStage === 4, 2200);
    sound.playVoiceClip(stageLine, newStage === 2 ? 0.9 : 1.0, 1.0, true);
  }

  // 頭目定時發動黑槌推進攻擊
  gameState.nextAttackTimer -= dt;
  if (gameState.nextAttackTimer <= 0) {
    spawnBossAttack();
    const params = getStageParams(gameState.stage, gameState.survivalTime);
    // 加入些許隨機性，讓節奏更生動
    const jitter = 0.88 + Math.random() * 0.24;
    gameState.nextAttackTimer = params.attackInterval * jitter;
  }

  // 更新場上所有正在推進的黑色鎚子
  for (let i = gameState.activeAttacks.length - 1; i >= 0; i--) {
    const atk = gameState.activeAttacks[i];
    atk.progress += dt / atk.fillDuration;

    if (atk.progress >= 1.0) {
      // 黑槌已經完全填滿圓圈，玩家未及時放木板 -> 失血！
      const cell = GRID_CELLS[atk.cellIndex];
      gameState.activeAttacks.splice(i, 1);
      gameState.retracting.push({ cellIndex: atk.cellIndex, progress: 1 });
      onPlayerHitByHammer(cell);
      if (gameState.celebratingVictory) break;
    }
  }
}

// ==========================================
// 畫面繪製 (Canvas Rendering)
// ==========================================
function render(now) {
  ctx.save();

  // 畫面震動效果
  if (gameState.screenShake > 0) {
    const sx = (Math.random() - 0.5) * gameState.screenShake;
    const sy = (Math.random() - 0.5) * gameState.screenShake;
    ctx.translate(sx, sy);
  }

  // 1. 繪製競技場平衡木背景
  if (images.bg && images.bg.complete && images.bg.naturalWidth > 0) {
    ctx.drawImage(images.bg, 0, 0, W, H);
  } else {
    ctx.fillStyle = '#1b1429';
    ctx.fillRect(0, 0, W, H);
  }

  // Lv.4 暴走階段紅色熱血速度線背景光暈
  if (gameState.running && gameState.stage === 4 && !gameState.celebratingVictory) {
    const pulse = 0.16 + 0.1 * Math.sin(now * 0.025);
    ctx.fillStyle = `rgba(255, 20, 40, ${pulse})`;
    ctx.fillRect(0, 0, W, H);
  }

  // 2. 繪製頭目 (5 種狀態：Lv.1 微笑、Lv.2 嚴肅、Lv.3 出力、Lv.4 脹紅臉暴走、Victory 高舉黑槌慶祝)
  drawBoss(now);

  // 3. 繪製九宮格圓圈 與 正在推進放大的黑色鎚子
  if (!gameState.celebratingVictory) {
    drawGridAndHammers(now);
  }

  // 4. 繪製木板格擋特效
  drawBlockShieldEffects();

  // 5. 繪製第一人稱玩家雙手拿木板 (CS 風格視角)
  if (!gameState.celebratingVictory) {
    drawPlayerHands(now);
  }

  // 6. 繪製粒子與浮動文字
  drawParticlesAndTexts();

  ctx.restore();
}

// ==========================================
// 頭目劍道中段持槌：預備 -> 往後蓄力 -> 往玩家突刺
// ==========================================
// 立繪 kendo/boss_lvN_kendo_full.png（待命，原圖）與 boss_lvN_kendo.png（已擦掉胸前槌頭，攻擊時用）
// 由 tools/make_boss_kendo.py 產生，以下座標為立繪原圖像素（560x750）
const KENDO_BALL = { x: 279.8, y: 243, r: 56 };   // 胸前槌頭中心與半徑（與 make_boss_kendo.py 的 BALL_C / BALL_R 對應）
const KENDO_GRIP = { x: 311, y: 291 };            // 前手握柄處（長柄從這裡伸出去）
const HAMMER_IMG_SCALE = 316 / 300;               // hammer_front.png 寬度 / 槌頭直徑
const WINDUP = 0.22;                              // 攻擊前 22% 時間為「往後拉槌蓄力」，之後才往前刺

// 頭目目前的繪製姿勢（每幀由 drawBoss 更新，供黑槌定位）
const bossPose = { cx: W / 2, cy: 400, k: 1, scale: 1, rot: 0, imgW: 1, imgH: 1 };

function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
function clamp01(t) { return Math.min(1, Math.max(0, t)); }
function lerpPt(a, b, t) { return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }; }

// 立繪原圖座標 -> 畫布座標（套用頭目目前的位移 / 縮放 / 旋轉）
function bossToCanvas(pt) {
  const x = (pt.x - bossPose.imgW / 2) * bossPose.k * bossPose.scale;
  const y = (pt.y - bossPose.imgH / 2) * bossPose.k * bossPose.scale;
  const c = Math.cos(bossPose.rot);
  const s = Math.sin(bossPose.rot);
  return { x: bossPose.cx + x * c - y * s, y: bossPose.cy + x * s + y * c };
}

// 攻擊進度 p (0..1) -> 蓄力量 wind 與突刺量 thrust
// retracting：收槌時不再蓄力，直接沿原路徑拉回
function thrustPhase(p, retracting = false) {
  p = clamp01(p);
  if (!retracting && p < WINDUP) {
    return { wind: Math.sin((p / WINDUP) * Math.PI / 2), thrust: 0, t: 0 };
  }
  const t = clamp01((p - WINDUP) / (1 - WINDUP));
  return { wind: retracting ? 0 : 1 - easeOutCubic(Math.min(1, t * 3)), thrust: easeOutCubic(t), t };
}

// 決定頭目身體姿勢與「手上那支槌」的主攻：最往前推的攻擊，沒有的話看收回中的黑槌
function getLeadAttack() {
  let lead = null;
  for (const a of gameState.activeAttacks) {
    if (!lead || a.progress > lead.progress) lead = a;
  }
  if (lead) return { attack: lead, cellIndex: lead.cellIndex, phase: thrustPhase(lead.progress) };
  let rt = null;
  for (const r of gameState.retracting) {
    if (!rt || r.progress > rt.progress) rt = r;
  }
  return rt ? { attack: rt, cellIndex: rt.cellIndex, phase: thrustPhase(rt.progress, true) } : null;
}

function drawBoss(now) {
  const lead = gameState.celebratingVictory ? null : getLeadAttack();
  const stage = gameState.stage;

  // 待命用原圖；攻擊中改用擦掉槌頭的立繪，槌頭由程式畫出去
  let bossImg = lead ? images[`lv${stage}Body`] : images[`lv${stage}`];
  if (gameState.celebratingVictory) bossImg = images.victory;

  if (!bossImg || !bossImg.complete || bossImg.naturalWidth === 0) return;

  // 呼吸起伏
  const breathe = Math.sin(now * 0.005) * 4;

  // 劍道突刺：先縮身把槌往後拉，再往玩家（鏡頭）踏步衝刺，身體朝目標格方向偏
  const wind = lead ? lead.phase.wind : 0;
  const thrust = lead ? lead.phase.thrust : 0;
  const leadCell = lead ? GRID_CELLS[lead.cellIndex] : null;
  const towardX = leadCell ? (leadCell.x - W / 2) : 0;
  const towardY = leadCell ? (leadCell.y - GRID_CENTER_Y) : 0;

  // 出槌瞬間的小反衝（bossLunge 由 spawnBossAttack 設為 1 後衰減）
  const kick = gameState.bossLunge * 0.03;
  const scale = 1 - wind * 0.05 + thrust * 0.16 + kick;
  const rageShakeX = (stage === 4 && !gameState.celebratingVictory)
    ? (Math.random() - 0.5) * 10
    : 0;

  const cx = W / 2 + rageShakeX + towardX * 0.12 * thrust;
  const cy = gameState.celebratingVictory
    ? 540
    : 405 + breathe - wind * 14 + thrust * 40 + towardY * 0.05 * thrust;
  // 蓄力時微微後仰，突刺時朝目標方向前傾
  const rot = gameState.celebratingVictory ? 0 : -0.04 * wind + (towardX / W) * 0.14 * thrust;

  const targetHeight = gameState.celebratingVictory ? 580 : 480;
  const k = targetHeight / bossImg.naturalHeight;
  const drawW = bossImg.naturalWidth * k;
  const drawH = targetHeight;

  ctx.save();
  ctx.translate(cx, cy);

  // 頭目獲勝慶祝時背後的金色聚光圈
  if (gameState.celebratingVictory) {
    const grad = ctx.createRadialGradient(0, 0, 30, 0, 0, 320);
    grad.addColorStop(0, 'rgba(250, 204, 21, 0.75)');
    grad.addColorStop(1, 'rgba(250, 204, 21, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, 320, 0, Math.PI * 2);
    ctx.fill();
  }

  // 突刺時身後的衝刺殘影
  if (thrust > 0.25 && !gameState.celebratingVictory) {
    ctx.save();
    ctx.globalAlpha = 0.2 * thrust;
    ctx.scale(scale * 0.93, scale * 0.93);
    ctx.drawImage(bossImg, -drawW / 2 - towardX * 0.08, -drawH / 2 - 30, drawW, drawH);
    ctx.restore();
  }

  ctx.rotate(rot);
  ctx.scale(scale, scale);
  ctx.drawImage(bossImg, -drawW / 2, -drawH / 2, drawW, drawH);
  ctx.restore();

  bossPose.cx = cx;
  bossPose.cy = cy;
  bossPose.k = k;
  bossPose.scale = scale;
  bossPose.rot = rot;
  bossPose.imgW = bossImg.naturalWidth;
  bossPose.imgH = bossImg.naturalHeight;
}

// 正面槌頭（從頭目立繪切下來的同一顆槌）
function drawHammerHeadFront(x, y, r, alpha = 1) {
  const img = images.hammerFront;
  if (!img || !img.complete || img.naturalWidth === 0) return;
  const w = r * 2 * HAMMER_IMG_SCALE;
  const h = w * (img.naturalHeight / img.naturalWidth);
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.drawImage(img, x - w / 2, y - h / 2, w, h);
  ctx.restore();
}

// 錐形長柄（透視：越靠近鏡頭越粗）
function drawShaft(a, b, wA, wB) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  ctx.fillStyle = '#18181b';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(a.x + nx * wA, a.y + ny * wA);
  ctx.lineTo(b.x + nx * wB, b.y + ny * wB);
  ctx.lineTo(b.x - nx * wB, b.y - ny * wB);
  ctx.lineTo(a.x - nx * wA, a.y - ny * wA);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // 長柄高光
  ctx.strokeStyle = 'rgba(160, 160, 170, 0.45)';
  ctx.lineWidth = Math.max(1.5, wA * 0.4);
  ctx.beginPath();
  ctx.moveTo(a.x + nx * wA * 0.4, a.y + ny * wA * 0.4);
  ctx.lineTo(b.x + nx * wB * 0.4, b.y + ny * wB * 0.4);
  ctx.stroke();
}

// 黑槌姿勢：從頭目胸前的槌頭位置出發，蓄力時往回收，突刺時飛向目標格並放大
function getHammerPose(cell, p, retracting) {
  const s = bossPose.k * bossPose.scale;
  const { wind, thrust, t } = thrustPhase(p, retracting);
  const rest = bossToCanvas(KENDO_BALL);
  const grip = bossToCanvas(KENDO_GRIP);
  const restR = KENDO_BALL.r * s;

  // 蓄力：槌頭往手的方向收回一點、稍微變小
  const pulled = lerpPt(rest, grip, 0.35 * wind);
  const startR = restR * (1 - 0.12 * wind);

  // 槌頭：約 80% 時間就對準目標格，之後持續放大逼近鏡頭，在 p=1 時剛好填滿圓圈
  const travel = easeOutCubic(Math.min(1, t * 1.25));
  const head = lerpPt(pulled, cell, travel);
  const r = startR + (cell.r - startR) * Math.pow(t, 1.3);
  return { head, r, grip, thrust, s };
}

// 頭目手上那支黑槌（從前手握柄伸出去）
function drawHeldHammer(cell, p, now, retracting = false) {
  if (!cell) return; // 待命時槌頭就在立繪上
  const { head, r, grip, thrust, s } = getHammerPose(cell, p, retracting);

  // 突刺軌跡與速度線（推得越前面越明顯）
  if (thrust > 0.35) {
    ctx.save();
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.2 * thrust})`;
    ctx.lineWidth = r * 1.1;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(grip.x + (head.x - grip.x) * 0.3, grip.y + (head.y - grip.y) * 0.3);
    ctx.lineTo(head.x, head.y);
    ctx.stroke();
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.25 + 0.4 * thrust})`;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'butt';
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + now * 0.002;
      const r2 = r * (1.45 + 0.25 * Math.sin(now * 0.02 + i));
      ctx.beginPath();
      ctx.moveTo(head.x + Math.cos(a) * r * 1.15, head.y + Math.sin(a) * r * 1.15);
      ctx.lineTo(head.x + Math.cos(a) * r2, head.y + Math.sin(a) * r2);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawShaft(grip, head, 6 * s, Math.max(6 * s, r * 0.28));
  drawHammerHeadFront(head.x, head.y, r);
}

// 同時有多支攻擊時，其餘的黑槌畫成半透明殘影（連擊感）
function drawGhostHammer(cell, p, now, retracting = false) {
  const { head, r, grip, thrust, s } = getHammerPose(cell, p, retracting);
  if (thrust <= 0.001) return;
  ctx.save();
  ctx.globalAlpha = 0.45;
  drawShaft(grip, head, 6 * s, Math.max(6 * s, r * 0.28));
  drawHammerHeadFront(head.x, head.y, r);
  ctx.restore();
}

function drawGridAndHammers(now) {
  // 九宮格半透明背板框
  const boardPad = 102;
  const bx = GRID_CENTER_X - GRID_SPACING_X - boardPad;
  const by = GRID_CENTER_Y - GRID_SPACING_Y - boardPad;
  const bw = (GRID_SPACING_X + boardPad) * 2;
  const bh = (GRID_SPACING_Y + boardPad) * 2;

  ctx.save();
  ctx.fillStyle = 'rgba(10, 14, 26, 0.22)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(bx, by, bw, bh, 24);
  ctx.fill();
  ctx.stroke();

  // 先畫每個九宮格圓圈底座
  for (const cell of GRID_CELLS) {
    const atk = gameState.activeAttacks.find(a => a.cellIndex === cell.index);

    ctx.beginPath();
    ctx.arc(cell.x, cell.y, cell.r, 0, Math.PI * 2);

    if (atk) {
      const dangerAlpha = 0.14 + atk.progress * 0.38;
      ctx.fillStyle = `rgba(255, 25, 55, ${dangerAlpha})`;
      ctx.fill();
    } else {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.fill();
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cell.x, cell.y, cell.r * 0.84, 0, Math.PI * 2);
      ctx.lineWidth = 1.8;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.26)';
      ctx.stroke();
    }
  }

  // 頭目手上那支黑槌（最往前的攻擊；沒有攻擊時是待命握法），其餘同時攻擊畫成殘影
  const held = getLeadAttack();
  for (const rt of gameState.retracting) {
    if (!held || rt !== held.attack) drawGhostHammer(GRID_CELLS[rt.cellIndex], rt.progress, now, true);
  }
  for (const atk of gameState.activeAttacks) {
    if (!held || atk !== held.attack) drawGhostHammer(GRID_CELLS[atk.cellIndex], atk.progress, now);
  }
  if (held) {
    drawHeldHammer(GRID_CELLS[held.cellIndex], held.attack.progress, now, gameState.retracting.includes(held.attack));
  } else {
    drawHeldHammer(null, 0, now);
  }

  // 紅色警示細框畫在槌頭上方，讓玩家看清楚「槌頭何時填滿圓圈」
  for (const atk of gameState.activeAttacks) {
    const cell = GRID_CELLS[atk.cellIndex];
    const p = Math.min(1, Math.max(0, atk.progress));
    ctx.save();
    ctx.beginPath();
    ctx.arc(cell.x, cell.y, cell.r, 0, Math.PI * 2);
    ctx.lineWidth = 4.5;
    ctx.strokeStyle = p > 0.75 ? '#facc15' : '#ff1e42';
    ctx.shadowColor = '#ff1e42';
    ctx.shadowBlur = 16;
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

// 繪製點擊九宮格時放上的木板阻擋視覺效果
function drawBlockShieldEffects() {
  for (const be of gameState.blockEffects) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, be.alpha);
    ctx.translate(be.x, be.y);

    // 繪製厚實木板擋在圓圈上的效果
    const w = CELL_RADIUS * 1.9;
    const h = CELL_RADIUS * 1.15;
    ctx.rotate(-0.06);

    ctx.fillStyle = '#854d0e';
    ctx.strokeStyle = '#271705';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, 8);
    ctx.fill();
    ctx.stroke();

    // 木紋線條
    ctx.strokeStyle = '#a16207';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-w * 0.38, -h * 0.2);
    ctx.lineTo(w * 0.38, -h * 0.2);
    ctx.moveTo(-w * 0.35, h * 0.18);
    ctx.lineTo(w * 0.35, h * 0.18);
    ctx.stroke();

    ctx.restore();
  }
}

// 繪製畫面下方 CS 第一人稱雙手拿木板
function drawPlayerHands(now) {
  if (!images.hands || !images.hands.complete || images.hands.naturalWidth === 0) return;

  ctx.save();
  const swayX = Math.sin(now * 0.004) * 8;
  const swayY = Math.cos(now * 0.008) * 5;
  const thrustOffsetY = -gameState.handsThrust * 65;
  const thrustScale = 1 + gameState.handsThrust * 0.14;

  const drawX = gameState.handsCurX + swayX;
  const drawY = gameState.handsCurY + swayY + thrustOffsetY;

  ctx.translate(drawX, drawY);
  ctx.scale(thrustScale, thrustScale);

  const w = 540;
  const h = w * (images.hands.naturalHeight / images.hands.naturalWidth);
  ctx.drawImage(images.hands, -w / 2, -h / 2, w, h);

  ctx.restore();
}

function drawParticlesAndTexts() {
  for (const p of gameState.particles) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.alpha);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  for (const ft of gameState.floatingTexts) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, ft.alpha);
    ctx.font = `900 ${Math.round(26 * ft.scale)}px "Microsoft JhengHei", sans-serif`;
    ctx.textAlign = 'center';
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#000';
    ctx.strokeText(ft.text, ft.x, ft.y);
    ctx.fillStyle = ft.color;
    ctx.fillText(ft.text, ft.x, ft.y);
    ctx.restore();
  }
}

// ==========================================
// 結算稱號評語系統 與 社群分享截圖生成器
// ==========================================
// 稱號（依序第 1~5 級）；tools/make_share_pages.py 會讀這裡的 title / comment 產生 LINE 分享預覽圖，改完要重跑
const RANKS = [
  { below: 10, title: '🍼 一推就倒・紙糊木板人', comment: '頭目連熱身都還沒開始，你就已經掉進海綿池了！' },
  { below: 18, title: '🪵 平衡木搖晃的新手沙包', comment: '頭目才剛露出嚴肅表情，你的木板就已經跟不上啦！' },
  { below: 24, title: '🛡️ 銅牆鐵壁・人形木板王', comment: '反應神速！成功逼出頭目咬牙出力的認真模式！' },
  { below: 32, title: '🔥 吼拉吼拉暴走倖存者', comment: '太猛了！竟然在脹紅臉「吼拉吼拉」瘋狂連推下撐過這麼久！' },
  { below: Infinity, title: '👑 超越人類極限・傳說神之手', comment: '這手速是開外掛吧？！連爆氣黑槌都差點推不倒你！' }
];

// 回傳 { title, comment, level }，level 為 1~5
function getSurvivalRank(seconds) {
  const i = RANKS.findIndex(r => seconds < r.below);
  return { ...RANKS[i], level: i + 1 };
}

function generateShareCardImage() {
  const sw = shareCanvas.width;  // 720
  const sh = shareCanvas.height; // 960

  // 1. 背景圖與暗色漸層遮罩
  if (images.bg && images.bg.complete && images.bg.naturalWidth > 0) {
    shareCtx.drawImage(images.bg, 0, 0, sw, sh);
  }
  const bgGrad = shareCtx.createLinearGradient(0, 0, 0, sh);
  bgGrad.addColorStop(0, 'rgba(15, 10, 28, 0.78)');
  bgGrad.addColorStop(0.45, 'rgba(25, 12, 32, 0.45)');
  bgGrad.addColorStop(1, 'rgba(10, 8, 18, 0.96)');
  shareCtx.fillStyle = bgGrad;
  shareCtx.fillRect(0, 0, sw, sh);

  // 2. 金色勝利光芒與頭目高舉黑槌慶祝插畫
  const glow = shareCtx.createRadialGradient(sw / 2, 310, 20, sw / 2, 310, 280);
  glow.addColorStop(0, 'rgba(250, 204, 21, 0.65)');
  glow.addColorStop(1, 'rgba(250, 204, 21, 0)');
  shareCtx.fillStyle = glow;
  shareCtx.beginPath();
  shareCtx.arc(sw / 2, 310, 280, 0, Math.PI * 2);
  shareCtx.fill();

  if (images.victory && images.victory.complete && images.victory.naturalWidth > 0) {
    const vh = 430;
    const vw = vh * (images.victory.naturalWidth / images.victory.naturalHeight);
    shareCtx.drawImage(images.victory, (sw - vw) / 2, 95, vw, vh);
  }

  // 3. 頂部標題橫幅
  shareCtx.fillStyle = '#dc2626';
  shareCtx.beginPath();
  shareCtx.roundRect(sw / 2 - 170, 24, 340, 38, 19);
  shareCtx.fill();

  shareCtx.font = '900 20px "Microsoft JhengHei", sans-serif';
  shareCtx.fillStyle = '#fff';
  shareCtx.textAlign = 'center';
  shareCtx.fillText('🏆 彭彭大槌王・生死格擋戰績單', sw / 2, 50);

  shareCtx.font = '900 32px "Microsoft JhengHei", sans-serif';
  shareCtx.fillStyle = '#fde047';
  shareCtx.strokeStyle = '#000';
  shareCtx.lineWidth = 6;
  shareCtx.strokeText('頭目高舉黑槌獲勝慶祝！！', sw / 2, 98);
  shareCtx.fillText('頭目高舉黑槌獲勝慶祝！！', sw / 2, 98);

  // 4. 下方戰績數據卡片框
  shareCtx.fillStyle = 'rgba(20, 16, 36, 0.92)';
  shareCtx.strokeStyle = '#facc15';
  shareCtx.lineWidth = 4;
  shareCtx.beginPath();
  shareCtx.roundRect(36, 515, sw - 72, 395, 24);
  shareCtx.fill();
  shareCtx.stroke();

  // 存活秒數大字
  shareCtx.font = '800 22px "Microsoft JhengHei", sans-serif';
  shareCtx.fillStyle = '#94a3b8';
  shareCtx.fillText('在黑色巨槌無情推進下，我成功存活了', sw / 2, 565);

  const timeStr = `${gameState.survivalTime.toFixed(2)} 秒`;
  shareCtx.font = '900 76px Consolas, "Microsoft JhengHei", monospace';
  shareCtx.fillStyle = '#38bdf8';
  shareCtx.shadowColor = 'rgba(56, 189, 248, 0.6)';
  shareCtx.shadowBlur = 18;
  shareCtx.fillText(timeStr, sw / 2, 650);
  shareCtx.shadowBlur = 0;

  // 段位稱號與搞笑評語
  const rank = getSurvivalRank(gameState.survivalTime);

  shareCtx.fillStyle = 'rgba(250, 204, 21, 0.16)';
  shareCtx.strokeStyle = 'rgba(250, 204, 21, 0.6)';
  shareCtx.lineWidth = 2;
  shareCtx.beginPath();
  shareCtx.roundRect(70, 675, sw - 140, 56, 14);
  shareCtx.fill();
  shareCtx.stroke();

  shareCtx.font = '900 28px "Microsoft JhengHei", sans-serif';
  shareCtx.fillStyle = '#fde047';
  shareCtx.fillText(rank.title, sw / 2, 713);

  shareCtx.font = '700 20px "Microsoft JhengHei", sans-serif';
  shareCtx.fillStyle = '#e2e8f0';
  shareCtx.fillText(rank.comment, sw / 2, 765);

  // 格擋次數與到達難度統計
  shareCtx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  shareCtx.beginPath();
  shareCtx.moveTo(80, 792);
  shareCtx.lineTo(sw - 80, 792);
  shareCtx.stroke();

  const stageName = STAGE_INFO[gameState.maxStageReached].name;
  shareCtx.font = '800 21px "Microsoft JhengHei", sans-serif';
  shareCtx.fillStyle = '#4ade80';
  shareCtx.fillText(`🪵 成功拿木板格擋：${gameState.blocksCount} 次   ｜   🔥 最高難度：${stageName}`, sw / 2, 832);

  // 底部挑戰宣言
  shareCtx.font = '800 18px "Microsoft JhengHei", sans-serif';
  shareCtx.fillStyle = '#f97316';
  shareCtx.fillText('👉 不服來戰！看你能撐過幾秒「吼拉吼拉」連擊！', sw / 2, 882);

  // 將 Canvas 轉為 DataURL 顯示在預覽圖片上（方便手機長按儲存或分享）
  try {
    const dataUrl = shareCanvas.toDataURL('image/png');
    shareImagePreview.src = dataUrl;
  } catch (e) {
    console.error('Failed to generate share image:', e);
  }

  // 先把圖片檔準備好：iPhone Safari 只允許在「點擊當下」叫出分享選單，
  // 點了才轉檔會超過時限被擋，所以結算時就先轉好
  shareFile = null;
  shareCanvas.toBlob(blob => {
    if (blob) {
      shareFile = new File([blob], `彭彭大槌王_${gameState.survivalTime.toFixed(2)}秒.png`, { type: 'image/png' });
    }
  }, 'image/png');
  hideShareHelp();
}

// ==========================================
// 分享戰績（Android / iPhone / LINE 等 App 內建瀏覽器）
// ==========================================
// 主要分享方式和心理測驗網站一樣：分享「連結」。每個稱號有自己的預覽頁 r/rankN.html
// （tools/make_share_pages.py 產生），LINE 會抓頁面裡的預覽圖顯示成大卡片；
// 朋友點開後轉回遊戲，看到分享者的戰績卡和「我也要挑戰」按鈕。
// 圖片檔則另外用「儲存戰績圖」：LINE 等 App 內建瀏覽器不能分享檔案、也不能下載，改教長按儲存
const UA = navigator.userAgent;
const IS_LINE = /\bLine\//i.test(UA);
const IS_IN_APP = IS_LINE || /FBAN|FBAV|Instagram|MicroMessenger|KAKAOTALK/i.test(UA);
const IS_IOS = /iPhone|iPad|iPod/i.test(UA) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const SITE_BASE = location.origin + location.pathname.replace(/[^/]*$/, '');
const GAME_URL = SITE_BASE + 'index.html';

let shareFile = null;

const shareHelp = document.getElementById('share-help');
const shareHelpText = document.getElementById('share-help-text');
const btnOpenBrowser = document.getElementById('btn-open-browser');
const btnShareLine = document.getElementById('btn-share-line');
const btnCopyLink = document.getElementById('btn-copy-link');
const resultBadge = document.querySelector('.result-header .ko-badge');
const resultTitle = document.querySelector('.result-header h2');

function getShareText() {
  return `我在《彭彭大槌王》拿木板撐了 ${gameState.survivalTime.toFixed(2)} 秒！獲得「${getSurvivalRank(gameState.survivalTime).title}」稱號，你敢來挑戰嗎？`;
}

function getResultParams() {
  return new URLSearchParams({
    r: gameState.survivalTime.toFixed(2),
    b: String(gameState.blocksCount),
    s: String(gameState.maxStageReached)
  });
}

// 分享用網址：對應稱號的預覽頁 + 戰績參數
function getShareUrl() {
  return `${SITE_BASE}r/rank${getSurvivalRank(gameState.survivalTime).level}.html?${getResultParams()}`;
}

function hideShareHelp() {
  shareHelp.hidden = true;
}

// 不能直接存 / 分享圖片時，顯示對應手機系統的儲存教學與其他分享方式
function showShareHelp() {
  const how = IS_IOS ? '長按上方戰績圖 →「加入照片」' : '長按上方戰績圖 →「下載圖片」';
  shareHelpText.textContent = IS_LINE
    ? `LINE 裡面不能直接下載圖片：請${how}，或改用手機瀏覽器開啟後再存。`
    : `這個瀏覽器不能直接下載圖片：請${how}。也可以直接傳連結給朋友。`;
  btnOpenBrowser.hidden = !IS_LINE;
  shareHelp.hidden = false;
  shareHelp.scrollIntoView({ block: 'nearest' });
}

// 主要分享：傳「戰績文字 + 預覽連結」，朋友在聊天室會看到戰績大卡片
function shareResultLink() {
  const text = getShareText();
  const url = getShareUrl();
  if (IS_LINE) {
    // LINE 內建瀏覽器：用 LINE 官方分享網址直接選好友傳送
    shareToLine();
    return;
  }
  if (navigator.share) {
    navigator.share({ title: '彭彭大槌王：平衡木生死鬥', text, url }).catch(err => {
      if (err && err.name !== 'AbortError') showShareHelp();
    });
    return;
  }
  // 電腦版瀏覽器沒有分享選單：複製連結
  copyGameLink();
  showShareHelp();
}

// 儲存戰績圖：iPhone 用分享選單（可選「儲存影像」到相簿）、其他瀏覽器直接下載；App 內建瀏覽器教長按儲存
function saveResultImage() {
  if (IS_IN_APP) {
    showShareHelp();
    return;
  }
  if (IS_IOS && shareFile && navigator.canShare && navigator.canShare({ files: [shareFile] })) {
    navigator.share({ files: [shareFile] }).catch(err => {
      if (err && err.name !== 'AbortError') showShareHelp();
    });
    return;
  }
  const link = document.createElement('a');
  link.download = `彭彭大槌王_戰績_${gameState.survivalTime.toFixed(2)}秒.png`;
  link.href = shareCanvas.toDataURL('image/png');
  document.body.appendChild(link);
  link.click();
  link.remove();
}

// 用 LINE 傳「戰績文字 + 預覽連結」（LINE 官方分享網址，Android / iPhone 都支援）
function shareToLine() {
  const text = `${getShareText()}\n${getShareUrl()}`;
  location.href = `https://line.me/R/share?text=${encodeURIComponent(text)}`;
}

function copyGameLink() {
  const text = `${getShareText()}\n${getShareUrl()}`;
  const done = () => { btnCopyLink.textContent = '✅ 已複製'; setTimeout(() => { btnCopyLink.textContent = '🔗 複製連結'; }, 1500); };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done, () => legacyCopy(text, done));
  } else {
    legacyCopy(text, done);
  }
}

// 舊式複製（部分 App 內建瀏覽器沒有 clipboard API）
function legacyCopy(text, done) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;';
  document.body.appendChild(ta);
  ta.select();
  ta.setSelectionRange(0, text.length);
  try { document.execCommand('copy'); done(); } catch (e) {}
  ta.remove();
}

// LINE 官方參數 openExternalBrowser=1：在手機預設瀏覽器（Safari / Chrome）重新開啟同一張戰績卡
function openInExternalBrowser() {
  const params = getResultParams();
  params.set('openExternalBrowser', '1');
  location.href = `${GAME_URL}?${params}`;
}

// 朋友點分享連結進來：顯示「朋友的戰績」，主按鈕改成「我也要挑戰」
function setFriendView(on) {
  resultBadge.textContent = on ? '朋友的戰績' : 'K.O. 頭目獲勝！';
  resultTitle.textContent = on
    ? `你的朋友撐了 ${gameState.survivalTime.toFixed(2)} 秒！換你挑戰！`
    : '你被黑槌推下平衡木了！';
  btnShare.hidden = on;
  btnDownload.hidden = on;
  document.querySelector('.save-hint').hidden = on;
  btnRetry.textContent = on ? '🪵 我也要挑戰！' : '🔄 再戰一場';
}

// 從網址帶回來的戰績（朋友點分享連結、或 LINE 改用手機瀏覽器開啟）：直接顯示戰績卡
function restoreResultFromUrl() {
  const q = new URLSearchParams(location.search);
  const t = parseFloat(q.get('r'));
  if (!(t > 0) || t > 999) return;
  gameState.survivalTime = t;
  gameState.blocksCount = Math.max(0, parseInt(q.get('b'), 10) || 0);
  gameState.maxStageReached = Math.min(4, Math.max(1, parseInt(q.get('s'), 10) || 1));
  startOverlay.classList.remove('active');
  const show = () => {
    generateShareCardImage();
    setFriendView(q.get('from') === 'share');
    gameoverOverlay.classList.add('active');
  };
  // 等圖片載入完再畫戰績卡
  if (imagesLoaded >= totalImages) show();
  else {
    const wait = setInterval(() => {
      if (imagesLoaded >= totalImages) { clearInterval(wait); show(); }
    }, 100);
  }
}

// ==========================================
// 難度與秒數即時微調面板綁定
// ==========================================
const optMaxHits = document.getElementById('opt-max-hits');
const optLv1Time = document.getElementById('opt-lv1-time');
const optLv2Time = document.getElementById('opt-lv2-time');
const optLv3Time = document.getElementById('opt-lv3-time');
const optLv4Time = document.getElementById('opt-lv4-time');
const optLv4Start = document.getElementById('opt-lv4-start');
const optBgmVol = document.getElementById('opt-bgm-vol');
const optRealVoice = document.getElementById('opt-real-voice');

function syncSettingsUI() {
  optMaxHits.value = config.maxHits;
  document.getElementById('val-max-hits').textContent = `${config.maxHits} 次`;

  optLv1Time.value = config.lv1FillTime;
  document.getElementById('val-lv1-time').textContent = `${Number(config.lv1FillTime).toFixed(2)} 秒`;

  optLv2Time.value = config.lv2FillTime;
  document.getElementById('val-lv2-time').textContent = `${Number(config.lv2FillTime).toFixed(2)} 秒`;

  optLv3Time.value = config.lv3FillTime;
  document.getElementById('val-lv3-time').textContent = `${Number(config.lv3FillTime).toFixed(2)} 秒`;

  optLv4Time.value = config.lv4FillTime;
  document.getElementById('val-lv4-time').textContent = `${Number(config.lv4FillTime).toFixed(2)} 秒`;

  optLv4Start.value = config.lv4StartTime;
  document.getElementById('val-lv4-start').textContent = `${config.lv4StartTime} 秒`;

  optBgmVol.value = config.bgmVolume;
  document.getElementById('val-bgm-vol').textContent = `${config.bgmVolume}%`;

  optRealVoice.checked = config.useRealVoice;
}

[optMaxHits, optLv1Time, optLv2Time, optLv3Time, optLv4Time, optLv4Start, optBgmVol, optRealVoice].forEach(el => {
  el.addEventListener('input', () => {
    config.maxHits = parseInt(optMaxHits.value, 10);
    config.lv1FillTime = parseFloat(optLv1Time.value);
    config.lv2FillTime = parseFloat(optLv2Time.value);
    config.lv3FillTime = parseFloat(optLv3Time.value);
    config.lv4FillTime = parseFloat(optLv4Time.value);
    config.lv4StartTime = parseInt(optLv4Start.value, 10);
    config.bgmVolume = parseInt(optBgmVol.value, 10);
    config.useRealVoice = optRealVoice.checked;
    syncSettingsUI();
  });
});

btnStart.addEventListener('click', startGame);
btnRetry.addEventListener('click', startGame);
btnShare.addEventListener('click', shareResultLink);
btnDownload.addEventListener('click', saveResultImage);
btnOpenBrowser.addEventListener('click', openInExternalBrowser);
btnShareLine.addEventListener('click', shareToLine);
btnCopyLink.addEventListener('click', copyGameLink);

btnMute.addEventListener('click', () => {
  sound.muted = !sound.muted;
  btnMute.textContent = sound.muted ? '🔇' : '🔊';
  if (sound.muted) sound.stopAllVoices();
});

function openSettings() {
  syncSettingsUI();
  settingsOverlay.classList.add('active');
}

function closeSettings() {
  settingsOverlay.classList.remove('active');
}

// 參數已鎖定：設定按鈕預設隱藏，只有網址加上 ?tuner（例如 index.html?tuner）時才顯示，方便自己微調
if (TUNER_MODE) {
  btnSettings.hidden = false;
  btnOpenTuner.hidden = false;
}

btnSettings.addEventListener('click', openSettings);
btnOpenTuner.addEventListener('click', openSettings);
btnCloseSettings.addEventListener('click', closeSettings);
btnSaveSettings.addEventListener('click', closeSettings);

btnResetSettings.addEventListener('click', () => {
  config = { ...DEFAULT_CONFIG };
  syncSettingsUI();
});

// 啟動渲染迴圈
syncSettingsUI();
restoreResultFromUrl();
requestAnimationFrame(gameLoop);
