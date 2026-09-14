// Audio preview helper using HTML5 Audio or Web Audio API synthesis
let audioCtx: AudioContext | null = null;
let currentOscillators: OscillatorNode[] = [];
let gainNode: GainNode | null = null;
let isSynthPlaying = false;

export function playSynthPreview(bpm = 124): () => void {
  stopSynthPreview();

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return () => {};

    audioCtx = new AudioContextClass();
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    gainNode = audioCtx.createGain();
    gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
    gainNode.connect(audioCtx.destination);

    // Chords: Am - F - C - G
    const chords = [
      [220, 261.63, 329.63], // A3, C4, E4
      [174.61, 220, 261.63], // F3, A3, C4
      [261.63, 329.63, 392.0], // C4, E4, G4
      [196.0, 246.94, 293.66], // G3, B3, D4
    ];

    let chordIndex = 0;
    const intervalMs = (60 / bpm) * 1000 * 2; // change every 2 beats

    const playChord = () => {
      if (!audioCtx || !gainNode) return;

      // Stop previous
      currentOscillators.forEach(osc => {
        try {
          osc.stop();
          osc.disconnect();
        } catch (e) {}
      });
      currentOscillators = [];

      const currentNotes = chords[chordIndex % chords.length];
      chordIndex++;

      currentNotes.forEach(freq => {
        if (!audioCtx || !gainNode) return;
        const osc = audioCtx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

        const noteGain = audioCtx.createGain();
        noteGain.gain.setValueAtTime(0.06, audioCtx.currentTime);
        noteGain.gain.exponentialRampToValueAtTime(0.02, audioCtx.currentTime + 1.2);

        osc.connect(noteGain);
        noteGain.connect(gainNode);

        osc.start();
        currentOscillators.push(osc);
      });
    };

    playChord();
    const timer = setInterval(playChord, intervalMs);
    isSynthPlaying = true;

    return () => {
      clearInterval(timer);
      stopSynthPreview();
    };
  } catch (err) {
    console.warn('Audio preview synthesizer initialization error:', err);
    return () => {};
  }
}

export function stopSynthPreview() {
  if (currentOscillators.length > 0) {
    currentOscillators.forEach(osc => {
      try {
        osc.stop();
        osc.disconnect();
      } catch (e) {}
    });
    currentOscillators = [];
  }
  if (audioCtx) {
    try {
      audioCtx.close();
    } catch (e) {}
    audioCtx = null;
  }
  gainNode = null;
  isSynthPlaying = false;
}
