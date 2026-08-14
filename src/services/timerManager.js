/**
 * Kitchen Timer Manager & Web Audio Chime Synthesizer
 * Provides crisp audio notifications without external mp3 dependencies
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
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Synthesizes a pleasant culinary bell chime sequence (E5 -> G#5 -> B5)
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
    this.intervalId = null;
    this.isRunning = false;
    this.title = 'Kitchen Timer';
    this.listeners = [];
  }

  start(seconds, title = 'Step Timer') {
    this.stop();
    this.totalSeconds = seconds;
    this.remainingSeconds = seconds;
    this.title = title;
    this.isRunning = true;

    // Wake up audio context on user interaction
    getAudioContext();

    this.intervalId = setInterval(() => {
      if (this.remainingSeconds > 0) {
        this.remainingSeconds--;
        this.notify();
      } else {
        this.stop();
        playChimeSound();
        this.notify('completed');
      }
    }, 1000);

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
    this.intervalId = setInterval(() => {
      if (this.remainingSeconds > 0) {
        this.remainingSeconds--;
        this.notify();
      } else {
        this.stop();
        playChimeSound();
        this.notify('completed');
      }
    }, 1000);
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
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  notify(event = 'tick') {
    const mins = Math.floor(this.remainingSeconds / 60);
    const secs = this.remainingSeconds % 60;
    const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    this.listeners.forEach(fn => fn({
      event,
      title: this.title,
      remainingSeconds: this.remainingSeconds,
      totalSeconds: this.totalSeconds,
      formatted,
      isRunning: this.isRunning
    }));
  }
}

export const activeTimer = new TimerManager();
