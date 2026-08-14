/**
 * Hands-Free Voice Assistant Service
 * Reads cooking steps aloud using the Web Speech Synthesis API
 */

class VoiceAssistant {
  constructor() {
    this.synth = window.speechSynthesis || null;
    this.isSpeaking = false;
    this.isEnabled = true;
    this.voice = null;

    if (this.synth) {
      // Load voices when available
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.loadVoice();
      }
      this.loadVoice();
    }
  }

  loadVoice() {
    if (!this.synth) return;
    const voices = this.synth.getVoices();
    // Prefer warm natural English voices (Google UK English, Samantha, Daniel, Natural English)
    this.voice = voices.find(v => 
      v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Premium') || v.name.includes('Samantha'))
    ) || voices.find(v => v.lang.startsWith('en')) || voices[0];
  }

  speak(text) {
    if (!this.synth || !this.isEnabled || !text) return;

    this.stop();

    // Clean text of timer buttons or extra symbols
    const cleanText = text.replace(/⏱️|👨‍🍳|🎉|✨|[-•]/g, '').trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    if (this.voice) {
      utterance.voice = this.voice;
    }
    utterance.rate = 0.95; // Gentle cooking tempo
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      this.isSpeaking = true;
      window.dispatchEvent(new CustomEvent('culinaria:voice-state', { detail: { isSpeaking: true } }));
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      window.dispatchEvent(new CustomEvent('culinaria:voice-state', { detail: { isSpeaking: false } }));
    };

    utterance.onerror = () => {
      this.isSpeaking = false;
      window.dispatchEvent(new CustomEvent('culinaria:voice-state', { detail: { isSpeaking: false } }));
    };

    this.synth.speak(utterance);
  }

  stop() {
    if (this.synth && this.synth.speaking) {
      this.synth.cancel();
      this.isSpeaking = false;
      window.dispatchEvent(new CustomEvent('culinaria:voice-state', { detail: { isSpeaking: false } }));
    }
  }

  toggle() {
    this.isEnabled = !this.isEnabled;
    if (!this.isEnabled) {
      this.stop();
    }
    return this.isEnabled;
  }
}

export const voiceAssistant = new VoiceAssistant();
