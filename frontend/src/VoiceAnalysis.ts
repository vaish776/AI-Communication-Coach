
export type VoiceMetrics = {
  pitch: number | null;
  speakingPace: string;
};

export function analyzeVoice(
  analyser: AnalyserNode
): VoiceMetrics {
  const buffer = new Float32Array(analyser.fftSize);

  analyser.getFloatTimeDomainData(buffer);

  // Calculate the signal's average energy.
  let energy = 0;

  for (const sample of buffer) {
    energy += sample * sample;
  }

  const rms = Math.sqrt(energy / buffer.length);

  // Very quiet audio is treated as silence.
  if (rms < 0.015) {
    return {
      pitch: null,
      speakingPace: "Pause / silence",
    };
  }

  // Estimate pitch using an autocorrelation method.
  const sampleRate = analyser.context.sampleRate;
  const minFrequency = 70;
  const maxFrequency = 350;

  const minLag = Math.floor(sampleRate / maxFrequency);
  const maxLag = Math.floor(sampleRate / minFrequency);

  let bestLag = -1;
  let bestCorrelation = 0;

  for (let lag = minLag; lag <= maxLag; lag++) {
    let correlation = 0;

    for (let i = 0; i < buffer.length - lag; i++) {
      correlation += buffer[i] * buffer[i + lag];
    }

    correlation /= buffer.length - lag;

    if (correlation > bestCorrelation) {
      bestCorrelation = correlation;
      bestLag = lag;
    }
  }

  let pitch: number | null = null;

  if (bestLag > 0 && bestCorrelation > 0.01) {
    pitch = Math.round(sampleRate / bestLag);
  }

  return {
    pitch,
    speakingPace: "Voice activity detected",
  };
}
