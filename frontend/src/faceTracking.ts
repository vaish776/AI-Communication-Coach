
import {
  FaceLandmarker,
  FilesetResolver,
} from "@mediapipe/tasks-vision";

let faceLandmarker: FaceLandmarker | null = null;

// ======================================
// INITIALIZE MEDIAPIPE FACE TRACKING
// ======================================

export async function initializeFaceTracking() {
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
  );

  faceLandmarker = await FaceLandmarker.createFromOptions(
    vision,
    {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
        delegate: "CPU",
      },
      runningMode: "VIDEO",
      numFaces: 1,
    }
  );

  console.log("MediaPipe face tracking initialized!");

  return faceLandmarker;
}

// ======================================
// DETECT FACE
// ======================================

export function detectFace(video: HTMLVideoElement) {
  if (
    !faceLandmarker ||
    video.readyState < 2 ||
    video.videoWidth === 0
  ) {
    return null;
  }

  const result = faceLandmarker.detectForVideo(
    video,
    performance.now()
  );

  return result;
}

// ======================================
// ESTIMATE EYE GAZE
// ======================================

export function estimateGaze(
  result: ReturnType<typeof detectFace>
) {
  const landmarks = result?.faceLandmarks[0];

  // Check whether face and iris landmarks exist
  if (!landmarks || landmarks.length < 478) {
    return {
      horizontal: "Unknown",
      vertical: "Unknown",
      message: "Face or iris not detected",
    };
  }

  // Safely use the detected landmarks
  const points = landmarks;

  // --------------------------------------
  // HORIZONTAL EYE POSITION
  // --------------------------------------

  function horizontalPosition(
    irisIndex: number,
    corner1: number,
    corner2: number
  ): number {
    const iris = points[irisIndex];
    const eyeCorner1 = points[corner1];
    const eyeCorner2 = points[corner2];

    const minX = Math.min(
      eyeCorner1.x,
      eyeCorner2.x
    );

    const maxX = Math.max(
      eyeCorner1.x,
      eyeCorner2.x
    );

    if (maxX === minX) {
      return 0.5;
    }

    return (iris.x - minX) / (maxX - minX);
  }

  // --------------------------------------
  // VERTICAL EYE POSITION
  // --------------------------------------

  function verticalPosition(
    irisIndex: number,
    upperIndex: number,
    lowerIndex: number
  ): number {
    const iris = points[irisIndex];
    const upper = points[upperIndex];
    const lower = points[lowerIndex];

    const minY = Math.min(
      upper.y,
      lower.y
    );

    const maxY = Math.max(
      upper.y,
      lower.y
    );

    if (maxY === minY) {
      return 0.5;
    }

    return (iris.y - minY) / (maxY - minY);
  }

  // --------------------------------------
  // CALCULATE BOTH EYES
  // --------------------------------------

  const leftHorizontal = horizontalPosition(
    468, 33, 133
  );

  const rightHorizontal = horizontalPosition(
    473, 362, 263
  );

  const horizontalAverage =
    (leftHorizontal + rightHorizontal) / 2;

  const leftVertical = verticalPosition(
    468, 159, 145
  );

  const rightVertical = verticalPosition(
    473, 386, 374
  );

  const verticalAverage =
    (leftVertical + rightVertical) / 2;

  // --------------------------------------
  // DETERMINE APPROXIMATE GAZE DIRECTION
  // --------------------------------------

  let horizontal = "Center";
  let vertical = "Center";

  if (horizontalAverage < 0.40) {
    horizontal = "Left";
  } else if (horizontalAverage > 0.60) {
    horizontal = "Right";
  }

  if (verticalAverage < 0.35) {
    vertical = "Up";
  } else if (verticalAverage > 0.65) {
    vertical = "Down";
  }

  // --------------------------------------
  // GENERATE GAZE MESSAGE
  // --------------------------------------

  let message = "Looking approximately toward the center";

  if (horizontal !== "Center") {
    message = `Looking toward the ${horizontal.toLowerCase()} side`;
  } else if (vertical !== "Center") {
    message = `Looking ${vertical.toLowerCase()}`;
  }

  return {
    horizontal,
    vertical,
    message,
    horizontalValue: Number(horizontalAverage.toFixed(3)),
  verticalValue: Number(verticalAverage.toFixed(3)),
  };
}



// ======================================
// HEAD MOVEMENT ANALYSIS
// ======================================

export function estimateHeadPose(
  result: ReturnType<typeof detectFace>
) {
  const landmarks = result?.faceLandmarks[0];

  if (!landmarks || landmarks.length < 264) {
    return {
      yaw: 0,
      pitch: 0,
      roll: 0,
      message: "Face not detected",
    };
  }

  // Important facial landmarks
  const nose = landmarks[1];
  const leftEye = landmarks[33];
  const rightEye = landmarks[263];
  const forehead = landmarks[10];
  const chin = landmarks[152];

  // Calculate horizontal head direction
  const eyeCenterX = (leftEye.x + rightEye.x) / 2;
  const eyeWidth = Math.abs(rightEye.x - leftEye.x);

  const yaw =
    eyeWidth > 0
      ? ((nose.x - eyeCenterX) / eyeWidth) * 100
      : 0;

  // Calculate vertical head direction
  const faceHeight = Math.abs(chin.y - forehead.y);

  const faceCenterY = (forehead.y + chin.y) / 2;

  const pitch =
    faceHeight > 0
      ? ((nose.y - faceCenterY) / faceHeight) * 100
      : 0;

  // Calculate sideways head tilt
  const roll =
    Math.atan2(
      rightEye.y - leftEye.y,
      rightEye.x - leftEye.x
    ) * (180 / Math.PI);

  // Approximate direction labels
  let horizontal = "Forward";
  let vertical = "Neutral";
  let tilt = "Straight";

  if (yaw < -8) {
    horizontal = "Turned Left";
  } else if (yaw > 8) {
    horizontal = "Turned Right";
  }

  if (pitch < 30) {
    vertical = "Upward";
  } else if (pitch > 42) {
    vertical = "Downward";
  }

  if (roll < -10) {
    tilt = "Tilted Left";
  } else if (roll > 10) {
    tilt = "Tilted Right";
  }

  return {
    yaw: Number(yaw.toFixed(2)),
    pitch: Number(pitch.toFixed(2)),
    roll: Number(roll.toFixed(2)),
    message: `${horizontal}, ${vertical}, ${tilt}`,
  };
}
