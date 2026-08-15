/**
 * MultiTimerDock Component
 * Floating, collapsible kitchen dock for managing concurrent cooking timers
 */
import { timerManager } from '../services/timerManager.js';

export class MultiTimerDock {
  constructor() {
    this.dockEl = null;
    this.isExpanded = false;
    this.init();
  }

  init() {
    // Create floating dock container if not already in DOM
    let existing = document.getElementById('floatingTimerDock');
    if (!existing) {
      this.dockEl = document.createElement('aside');
      this.dockEl.id = 'floatingTimerDock';
      this.dockEl.className = 'timer-dock-container hidden';
      this.dockEl.setAttribute('role', 'region');
      this.dockEl.setAttribute('aria-label', 'Active Kitchen Timers');
      document.body.appendChild(this.dockEl);
    } else {
      this.dockEl = existing;
    }

    // Subscribe to timerManager updates
    timerManager.subscribe((state) => this.render(state));

    // Listen for custom trigger to create timer
    window.addEventListener('culinaria:create-timer', (e) => {
      const { title, seconds, pitch } = e.detail || {};
      timerManager.createTimer(title, seconds, pitch);
    });
  }

  render(state) {
    const timers = state.timers || [];
    
    if (timers.length === 0) {
      this.dockEl.classList.add('hidden');
      this.dockEl.setAttribute('aria-hidden', 'true');
      this.dockEl.inert = true;
      return;
    }

    this.dockEl.classList.remove('hidden');
    this.dockEl.setAttribute('aria-hidden', 'false');
    this.dockEl.inert = false;
    const runningCount = timers.filter(t => t.status === 'running').length;

    this.dockEl.innerHTML = `
      <div class="timer-dock-pill ${this.isExpanded ? 'is-expanded' : ''}" id="timerDockHeader">
        <div class="dock-pill-header" data-action="toggle-expand">
          <div class="dock-pill-icon">⏱️</div>
          <div class="dock-pill-info">
            <span class="dock-pill-count">${runningCount} Active ${runningCount === 1 ? 'Timer' : 'Timers'}</span>
            <span class="dock-pill-preview">${timers[0] ? `${timers[0].title}: ${timerManager.formatTime(timers[0].remainingSeconds)}` : ''}</span>
          </div>
          <button class="dock-toggle-btn" aria-label="Toggle Timers Dock">
            ${this.isExpanded ? '▼' : '▲'}
          </button>
        </div>

        ${this.isExpanded ? `
          <div class="dock-body">
            <div class="dock-timers-list">
              ${timers.map(timer => {
                const progress = Math.min(100, Math.max(0, ((timer.totalSeconds - timer.remainingSeconds) / timer.totalSeconds) * 100));
                const isDone = timer.status === 'completed';
                return `
                  <div class="dock-timer-card ${isDone ? 'timer-done' : ''}" data-id="${timer.id}">
                    <div class="dock-timer-top">
                      <span class="dock-timer-name">${timer.title}</span>
                      <span class="dock-timer-digits ${isDone ? 'digits-done' : ''}">${isDone ? '🎉 DONE' : timerManager.formatTime(timer.remainingSeconds)}</span>
                    </div>
                    
                    <div class="dock-progress-bar">
                      <div class="dock-progress-fill" style="width: ${progress}%;"></div>
                    </div>

                    <div class="dock-timer-actions">
                      ${!isDone ? `
                        <button class="dock-btn-sm" data-action="${timer.status === 'running' ? 'pause' : 'resume'}" data-id="${timer.id}">
                          ${timer.status === 'running' ? '⏸️ Pause' : '▶️ Resume'}
                        </button>
                        <button class="dock-btn-sm" data-action="add-time" data-id="${timer.id}" data-seconds="60">+1m</button>
                      ` : ''}
                      <button class="dock-btn-sm dock-btn-dismiss" data-action="dismiss" data-id="${timer.id}">✕ Dismiss</button>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>

            <div class="dock-quick-add">
              <span class="quick-add-label">Quick Timer:</span>
              <div class="quick-add-chips">
                <button class="dock-chip" data-quick="60" data-title="1m Step">1m</button>
                <button class="dock-chip" data-quick="180" data-title="3m Soft Boil">3m</button>
                <button class="dock-chip" data-quick="300" data-title="5m Simmer">5m</button>
                <button class="dock-chip" data-quick="600" data-title="10m Pasta">10m</button>
                <button class="dock-chip" data-quick="900" data-title="15m Bake">15m</button>
              </div>
            </div>
          </div>
        ` : ''}
      </div>
    `;

    this.attachEvents();
  }

  attachEvents() {
    const header = this.dockEl.querySelector('[data-action="toggle-expand"]');
    if (header) {
      header.addEventListener('click', () => {
        this.isExpanded = !this.isExpanded;
        this.render({ timers: timerManager.getAll() });
      });
    }

    this.dockEl.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = btn.dataset.action;
        const id = btn.dataset.id;

        if (action === 'pause') {
          timerManager.pauseTimer(id);
        } else if (action === 'resume') {
          timerManager.resumeTimer(id);
        } else if (action === 'add-time') {
          const secs = parseInt(btn.dataset.seconds, 10) || 60;
          timerManager.addTime(id, secs);
        } else if (action === 'dismiss') {
          timerManager.removeTimer(id);
        }
      });
    });

    this.dockEl.querySelectorAll('.dock-chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        const secs = parseInt(chip.dataset.quick, 10) || 60;
        const title = chip.dataset.title || 'Timer';
        timerManager.createTimer(title, secs);
      });
    });
  }
}

export const multiTimerDock = new MultiTimerDock();
