/**
 * Kitchen Timer Manager & Web Audio Chime Synthesizer
 * Provides crisp audio notifications without external mp3 dependencies
 * Uses timestamp delta tracking to prevent background tab drift
 */

let audioCtx = null;

function getAudioContext() {
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
 * Synthesizes a pleasant culinary bell chime sequence (E5 -> G#5 -> B5 -> E6)
 */
export function playChimeSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const notes = [659.25, 830.61, 987.77, 1318.51]; // E5, G#5, B5, E6
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

class TimerManager {
  constructor() {
    this.remainingSeconds = 0;
    this.totalSeconds = 0;
    this.endTime = 0;
    this.intervalId = null;
    this.isRunning = false;
    this.title = 'Kitchen Timer';
    this.listeners = [];
  }

  start(seconds, title = 'Step Timer') {
    this.stop();
    const safeSecs = Math.max(1, Math.round(seconds) || 60);
    this.totalSeconds = safeSecs;
    this.remainingSeconds = safeSecs;
    this.endTime = Date.now() + safeSecs * 1000;
    this.title = title || 'Kitchen Timer';
    this.isRunning = true;

    // Wake up audio context on user interaction
    getAudioContext();

    this.intervalId = setInterval(() => {
      const now = Date.now();
      const left = Math.max(0, Math.round((this.endTime - now) / 1000));
      this.remainingSeconds = left;

      if (left > 0) {
        this.notify('tick');
      } else {
        this.stop();
        playChimeSound();
        this.notify('completed');
      }
    }, 500);

    this.notify('started');
  }

  pause() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    this.notify('paused');
  }

  resume() {
    if (this.remainingSeconds <= 0 || this.isRunning) return;
    this.isRunning = true;
    this.endTime = Date.now() + this.remainingSeconds * 1000;

    this.intervalId = setInterval(() => {
      const now = Date.now();
      const left = Math.max(0, Math.round((this.endTime - now) / 1000));
      this.remainingSeconds = left;

      if (left > 0) {
        this.notify('tick');
      } else {
        this.stop();
        playChimeSound();
        this.notify('completed');
      }
    }, 500);

    this.notify('resumed');
  }

  reset() {
    this.remainingSeconds = this.totalSeconds;
    this.pause();
    this.notify('reset');
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
  }

  subscribe(callback) {
    if (typeof callback === 'function') {
      this.listeners.push(callback);
    }
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  notify(event = 'tick') {
    const safeSecs = Math.max(0, parseInt(this.remainingSeconds, 10) || 0);
    const mins = Math.floor(safeSecs / 60);
    const secs = safeSecs % 60;
    const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    this.listeners.forEach(fn => {
      try {
        fn({
          event,
          title: this.title,
          remainingSeconds: safeSecs,
          totalSeconds: this.totalSeconds,
          formatted,
          isRunning: this.isRunning
        });
      } catch (e) {
        console.error('Timer listener error:', e);
      }
    });
  }
}

export const activeTimer = new TimerManager();
