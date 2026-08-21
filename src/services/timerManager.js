/**
 * Advanced Multi-Timer Kitchen Manager & Web Audio DSP Chime Synthesizer
 * Supports multiple concurrent timers with pitch variation and drift-free delta tracking
 */

let audioCtx = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      audioCtx = new AudioContext();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Synthesizes a pleasant culinary bell chime sequence with optional base pitch multiplier
 */
export function playChimeSound(pitchMultiplier = 1.0) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const baseNotes = [659.25, 830.61, 987.77, 1318.51]; // E5, G#5, B5, E6
    const notes = baseNotes.map(f => f * pitchMultiplier);

    notes.forEach((freq, index) => {
      const startTime = ctx.currentTime + index * 0.15;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.exponentialRampToValueAtTime(0.3, startTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.65);
    });
  } catch (e) {
    console.warn('Audio chime playback prevented:', e);
  }
}

class MultiTimerManager {
  constructor() {
    this.timers = new Map(); // id -> TimerObject
    this.intervalId = null;
    this.listeners = [];
    this.startGlobalLoop();
  }

  startGlobalLoop() {
    if (typeof window === 'undefined') return;
    if (this.intervalId) clearInterval(this.intervalId);

    this.intervalId = setInterval(() => {
      if (this.timers.size === 0) return;
      const now = Date.now();
      let hasChanges = false;

      for (const [, timer] of this.timers.entries()) {
        if (timer.status === 'running') {
          const left = Math.max(0, Math.round((timer.endTime - now) / 1000));
          if (left !== timer.remainingSeconds) {
            timer.remainingSeconds = left;
            hasChanges = true;
          }

          if (left === 0) {
            timer.status = 'completed';
            hasChanges = true;
            playChimeSound(timer.pitch || 1.0);
            this.notify('completed', timer);
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('culinaria:toast', {
                detail: { message: `🔔 Timer Done: ${timer.title}!` }
              }));
            }
          }
        }
      }

      if (hasChanges) {
        this.notify('tick');
      }
    }, 500);
  }

  createTimer(title = 'Kitchen Timer', seconds = 60, pitch = 1.0) {
    getAudioContext();
    const id = 'timer_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    const safeSecs = Math.max(1, Math.round(seconds) || 60);

    const timer = {
      id,
      title: title || 'Step Timer',
      totalSeconds: safeSecs,
      remainingSeconds: safeSecs,
      endTime: Date.now() + safeSecs * 1000,
      status: 'running',
      pitch
    };

    this.timers.set(id, timer);
    this.notify('started', timer);
    return timer;
  }

  pauseTimer(id) {
    const timer = this.timers.get(id);
    if (!timer || timer.status !== 'running') return;
    timer.status = 'paused';
    this.notify('paused', timer);
  }

  resumeTimer(id) {
    const timer = this.timers.get(id);
    if (!timer || timer.status !== 'paused') return;
    getAudioContext();
    timer.endTime = Date.now() + timer.remainingSeconds * 1000;
    timer.status = 'running';
    this.notify('resumed', timer);
  }

  addTime(id, extraSeconds = 60) {
    const timer = this.timers.get(id);
    if (!timer) return;
    timer.totalSeconds += extraSeconds;
    timer.remainingSeconds += extraSeconds;
    if (timer.status === 'running') {
      timer.endTime += extraSeconds * 1000;
    }
    this.notify('updated', timer);
  }

  removeTimer(id) {
    if (this.timers.has(id)) {
      this.timers.delete(id);
      this.notify('removed', { id });
    }
  }

  clearAll() {
    this.timers.clear();
    this.notify('cleared');
  }

  getAll() {
    return Array.from(this.timers.values());
  }

  // Backwards compatibility methods
  start(seconds, title = 'Step Timer') {
    // Clear old default single timer if exists
    for (const [id, t] of this.timers.entries()) {
      if (t.isDefault) this.timers.delete(id);
    }
    const timer = this.createTimer(title, seconds);
    timer.isDefault = true;
    return timer;
  }

  stop() {
    for (const [id, t] of this.timers.entries()) {
      if (t.isDefault) this.removeTimer(id);
    }
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify(event, data = null) {
    const state = {
      event,
      data,
      timers: this.getAll(),
      activeCount: this.getAll().filter(t => t.status === 'running').length
    };

    this.listeners.forEach(fn => {
      try { fn(state); } catch (e) { console.error('Timer listener error:', e); }
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('culinaria:timers-updated', { detail: state }));
    }
  }

  formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
}

export const timerManager = new MultiTimerManager();
export const activeTimer = timerManager;
