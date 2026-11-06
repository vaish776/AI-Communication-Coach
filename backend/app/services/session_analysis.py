
from app.services.voice_analysis import analyze_voice_metrics
from app.services.speech_analysis import analyze_speech
from app.services.facial_analysis import analyze_facial_metrics


def analyze_complete_session(session_data: dict) -> dict:
    """
    Run all three analysis services and combine
    their results into one session analysis.
    """

    voice_results = analyze_voice_metrics(
        duration_seconds=session_data.get("duration_seconds", 0),
        average_volume=session_data.get("average_volume", 0.0),
        voice_activity_percent=session_data.get("voice_activity_percent", 0),
        average_pitch_hz=session_data.get("average_pitch_hz"),
        lowest_pitch_hz=session_data.get("lowest_pitch_hz"),
        highest_pitch_hz=session_data.get("highest_pitch_hz"),
    )

    speech_results = analyze_speech(
    transcript=session_data.get("transcript", ""),
    duration_seconds=session_data.get("duration_seconds", 0),
    speaking_duration_seconds=session_data.get("speaking_duration_seconds"),
)

    facial_results = analyze_facial_metrics(
        total_frames=session_data.get("total_frames", 0),
        face_detected_frames=session_data.get(
            "face_detected_frames", 0
        ),
        gaze_directions=session_data.get("gaze_directions", {}),
        head_movement_counts=session_data.get(
            "head_movement_counts", {}
        ),
    )

    coaching_summary = generate_coaching_summary(
        voice=voice_results,
        speech=speech_results,
        facial=facial_results,
    )   
    return {
    "voice_analysis": voice_results,
    "speech_analysis": speech_results,
    "facial_analysis": facial_results,
    "coaching_summary": coaching_summary,
}

def generate_coaching_summary(voice, speech, facial):
    strengths = []
    improvements = []
    recommendations = []

    # Voice feedback
    voice_activity = voice.get("audio_activity_percent", 0)

    if voice_activity >= 20:
        strengths.append("The microphone captured a measurable level of audio activity.")
    else:
        improvements.append("Audio activity was relatively low during the session.")

    # Speech feedback
    filler_count = speech.get("total_fillers", 0)
    speaking_rate = speech.get("speaking_rate_wpm", 0)

    if filler_count == 0:
        strengths.append("No selected filler phrases were detected.")
    else:
        improvements.append(
            f"{filler_count} possible filler phrase occurrences were detected."
        )

    if speaking_rate > 0:
        recommendations.append(
            "Review your speaking pace, remembering that the current rate may include pauses."
        )

    # Facial feedback
    face_visibility = facial.get("face_visibility_percent", 0)

    if face_visibility >= 80:
        strengths.append("Your face was visible in most analyzed frames.")
    else:
        improvements.append(
            "Try positioning your camera so your face remains visible."
        )

    gaze = facial.get("gaze_distribution_percent", {})
    center_gaze = gaze.get("center", 0)

    if center_gaze < 50:
        recommendations.append(
            "Practice looking toward the camera naturally while speaking."
        )

    # General recommendations
    recommendations.append(
        "Practice speaking clearly and using intentional pauses instead of unnecessary filler words."
    )

    if not improvements:
        improvements.append(
            "Continue practicing and review your measurements across multiple sessions."
        )

    return {
        "strengths": strengths,
        "areas_for_improvement": improvements,
        "recommendations": recommendations,
        "limitations": [
            "Feedback is based on measurable session indicators, not a definitive assessment of communication ability.",
            "Audio activity does not confirm that speech was occurring.",
            "Facial and gaze measurements are approximate.",
            "Speaking rate may include pauses."
        ]
    }