
def analyze_facial_metrics(
    total_frames: int,
    face_detected_frames: int,
    gaze_directions: dict,
    head_movement_counts: dict,
) -> dict:
    """
    Analyze facial and head movement measurements
    collected by the frontend.
    """

    observations = []
    recommendations = []

    # Face visibility
    face_visibility = (
        round((face_detected_frames / total_frames) * 100, 1)
        if total_frames > 0
        else 0
    )

    if face_visibility < 50:
        observations.append(
            "Your face was detected in less than half of the analyzed frames."
        )
        recommendations.append(
            "Position your camera so your face remains visible."
        )
    else:
        observations.append(
            f"Your face was detected in {face_visibility}% of analyzed frames."
        )

    # Gaze distribution
    total_gaze = sum(gaze_directions.values())

    gaze_distribution = {}

    if total_gaze > 0:
        for direction, count in gaze_directions.items():
            gaze_distribution[direction] = round(
                (count / total_gaze) * 100, 1
            )

    if gaze_distribution:
        most_common_gaze = max(
            gaze_distribution,
            key=gaze_distribution.get
        )

        observations.append(
            f"The most frequently recorded gaze direction was "
            f"{most_common_gaze}."
        )

        recommendations.append(
            "Review your gaze pattern to see whether it supports "
            "natural audience engagement."
        )
    else:
        observations.append(
            "No gaze direction measurements were available."
        )

    # Head movement
    total_head_samples = sum(head_movement_counts.values())

    head_distribution = {}

    if total_head_samples > 0:
        for movement, count in head_movement_counts.items():
            head_distribution[movement] = round(
                (count / total_head_samples) * 100, 1
            )

        observations.append(
            "Head movement measurements were collected during the session."
        )

        recommendations.append(
            "Review whether your head movements appear natural "
            "and appropriate for your presentation."
        )
    else:
        observations.append(
            "No head movement measurements were available."
        )

    return {
        "total_frames": total_frames,
        "face_detected_frames": face_detected_frames,
        "face_visibility_percent": face_visibility,
        "gaze_distribution_percent": gaze_distribution,
        "head_movement_distribution_percent": head_distribution,
        "observations": observations,
        "recommendations": recommendations,
        "limitations": [
            "Face visibility does not measure attention or confidence.",
            "Gaze estimates are approximate and depend on camera position.",
            "Head movement measurements depend on the frontend's classification.",
            "Facial measurements cannot reliably determine emotions or personality."
        ]
    }
