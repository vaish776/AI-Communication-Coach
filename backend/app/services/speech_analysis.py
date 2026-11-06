
import re


FILLER_PHRASES = [
    "you know",
    "i mean",
    "sort of",
    "kind of",
    "basically",
    "umm",
    "uhh",
    "um",
    "uh",
]


def analyze_speech(
    transcript: str,
    duration_seconds: float,
    speaking_duration_seconds: float | None = None,
) -> dict:
    """
    Analyze a speech transcript.

    If actual speaking duration is available, use it to calculate
    speaking rate. Otherwise, use total session duration and
    clearly identify the result as an approximate session rate.
    """

    # Validate duration
    duration_seconds = max(0, duration_seconds or 0)

    if speaking_duration_seconds is not None:
        speaking_duration_seconds = max(
            0, min(speaking_duration_seconds, duration_seconds)
        )

    # Handle missing transcript
    if not transcript or not transcript.strip():
        return {
            "word_count": 0,
            "speaking_rate_wpm": 0,
            "speaking_rate_basis": "unavailable",
            "filler_counts": {},
            "total_fillers": 0,
            "repeated_words": {},
            "sentence_count": 0,
            "average_sentence_length": 0,
            "observations": [
                "No transcript was available for analysis."
            ],
            "recommendations": [
                "Complete a practice session with speech recognition enabled."
            ],
            "limitations": [
                "Speech measurements cannot be calculated without a transcript."
            ],
        }

    # Normalize transcript
    text = transcript.lower().strip()

    # Extract words
    words = re.findall(r"\b[\w']+\b", text)
    word_count = len(words)

    # Calculate speaking rate
    if speaking_duration_seconds is not None:
        rate_duration = speaking_duration_seconds
        rate_basis = "estimated_active_speaking_time"
    else:
        rate_duration = duration_seconds
        rate_basis = "total_session_duration"

    speaking_rate = (
        round(word_count / (rate_duration / 60), 1)
        if rate_duration > 0
        else 0
    )

    # Count filler phrases
    filler_counts = {}

    for phrase in FILLER_PHRASES:
        pattern = (
            r"(?<!\w)"
            + re.escape(phrase)
            + r"(?!\w)"
        )

        count = len(re.findall(pattern, text))

        if count > 0:
            filler_counts[phrase] = count

    total_fillers = sum(filler_counts.values())

    # Detect immediately repeated words
    repeated_words = {}

    for previous, current in zip(words, words[1:]):
        if previous == current:
            repeated_words[previous] = (
                repeated_words.get(previous, 0) + 1
            )

    # Count sentences
    sentences = [
        sentence.strip()
        for sentence in re.split(r"[.!?]+", transcript)
        if sentence.strip()
    ]

    sentence_count = len(sentences)

    average_sentence_length = (
        round(word_count / sentence_count, 1)
        if sentence_count > 0
        else 0
    )

    # Generate observations and recommendations
    observations = []
    recommendations = []

    if speaking_rate > 160:
        observations.append(
            "The calculated speaking rate is relatively fast."
        )
        recommendations.append(
            "Try slowing down slightly and allowing important points to settle."
        )

    elif 0 < speaking_rate < 100:
        observations.append(
            "The calculated speaking rate is relatively slow."
        )
        recommendations.append(
            "Review your pauses to see whether they help or interrupt your flow."
        )

    elif speaking_rate > 0:
        observations.append(
            "The calculated speaking rate is within the selected moderate range."
        )

    if rate_basis == "total_session_duration":
        observations.append(
            "Speaking rate was calculated using the entire session duration, including pauses."
        )
        recommendations.append(
            "For a more accurate speaking rate, measure actual speaking time separately."
        )

    if total_fillers > 0:
        observations.append(
            f"{total_fillers} possible filler phrase occurrences were detected."
        )
        recommendations.append(
            "Practice replacing unnecessary filler phrases with natural pauses."
        )
    else:
        observations.append(
            "No selected filler phrases were detected in the transcript."
        )

    if repeated_words:
        observations.append(
            "Some immediately repeated words were detected."
        )
        recommendations.append(
            "Review repeated words to identify any patterns in your delivery."
        )

    if average_sentence_length > 25:
        observations.append(
            "Some sentences may be relatively long."
        )
        recommendations.append(
            "Consider breaking complex ideas into shorter sentences."
        )

    return {
        "word_count": word_count,
        "speaking_rate_wpm": speaking_rate,
        "speaking_rate_basis": rate_basis,
        "filler_counts": filler_counts,
        "total_fillers": total_fillers,
        "repeated_words": repeated_words,
        "sentence_count": sentence_count,
        "average_sentence_length": average_sentence_length,
        "observations": observations,
        "recommendations": recommendations,
        "limitations": [
            "When actual speaking duration is unavailable, speaking rate includes pauses in the total session duration.",
            "Speech recognition errors can affect word counts and filler detection.",
            "Some detected filler phrases may be intentional and meaningful.",
            "Repeated-word detection only checks adjacent repeated words.",
            "Speaking rate thresholds are approximate and may vary by context."
        ]
    }
