
from typing import Optional


def analyze_voice_metrics(
    duration_seconds: int,
    average_volume: float,
    voice_activity_percent: int,
    average_pitch_hz: Optional[float],
    lowest_pitch_hz: Optional[float],
    highest_pitch_hz: Optional[float],
) -> dict:
    """
    Analyze voice measurements collected by the frontend.

    These are technical indicators, not definitive judgments
    about confidence, emotion, or personality.
    """

    observations = []
    recommendations = []

    # 1. Session duration
    if duration_seconds < 15:
        observations.append(
            "The practice session was relatively short."
        )
        recommendations.append(
            "Try a longer practice session to collect more useful data."
        )
    else:
        observations.append(
            "The session provided a useful period for measurement."
        )

    # 2. Microphone signal level
    if average_volume < 0.015:
        observations.append(
            "The average microphone signal level was relatively low."
        )
        recommendations.append(
            "Check microphone distance, input gain, and recording conditions."
        )
    else:
        observations.append(
            "The microphone captured a measurable audio signal."
        )

    # 3. Signal activity
    if voice_activity_percent < 20:
        observations.append(
            "A relatively small proportion of sampled frames crossed "
            "the configured audio activity threshold."
        )
        recommendations.append(
            "Review the recording to distinguish pauses from low-level speech."
        )
    else:
        observations.append(
            "A measurable proportion of sampled frames crossed "
            "the configured audio activity threshold."
        )

    # 4. Pitch measurements
    pitch_range_hz = None

    if (
        average_pitch_hz is not None
        and lowest_pitch_hz is not None
        and highest_pitch_hz is not None
    ):
        pitch_range_hz = round(
            highest_pitch_hz - lowest_pitch_hz, 2
        )

        observations.append(
            f"The measured average pitch was {average_pitch_hz} Hz."
        )

        observations.append(
            f"The observed pitch span was {pitch_range_hz} Hz."
        )

        recommendations.append(
            "Listen to the recording to assess whether vocal variation "
            "supports clear and engaging delivery."
        )
    else:
        observations.append(
            "Reliable pitch measurements were not available."
        )
        recommendations.append(
            "Try recording in a quieter environment for better pitch analysis."
        )

    return {
        "duration_seconds": duration_seconds,
        "average_volume_rms": round(average_volume, 4),
        "audio_activity_percent": voice_activity_percent,
        "average_pitch_hz": average_pitch_hz,
        "lowest_pitch_hz": lowest_pitch_hz,
        "highest_pitch_hz": highest_pitch_hz,
        "observed_pitch_span_hz": pitch_range_hz,
        "observations": observations,
        "recommendations": recommendations,
        "limitations": [
            "Audio activity is based on an amplitude threshold, "
            "not verified speech detection.",
            "Microphone RMS is a signal measurement, not a calibrated "
            "measurement of loudness.",
            "Pitch measurements can be affected by background noise "
            "and estimation errors.",
            "Pitch alone cannot determine confidence or emotion."
        ]
    }
