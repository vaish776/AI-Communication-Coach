
from langchain_core.tools import tool

from app.services.session_analysis import analyze_complete_session


@tool
def analyze_practice_session(session_data: dict) -> dict:
    """
    Analyze a complete communication practice session.

    Use this tool when a user provides session measurements
    and wants feedback on voice, speech, and facial gestures.

    The input must contain:
    - duration_seconds
    - average_volume
    - voice_activity_percent
    - average_pitch_hz
    - lowest_pitch_hz
    - highest_pitch_hz
    - transcript
    - total_frames
    - face_detected_frames
    - gaze_directions
    - head_movement_counts
    """

    return analyze_complete_session(session_data)


# Register available tools here
agent_tools = [
    analyze_practice_session
]
