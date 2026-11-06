
import { useEffect, useRef, useState } from "react";

import {
  initializeFaceTracking,
  detectFace,
  estimateGaze,
  estimateHeadPose,
} from "./faceTracking";

import { analyzeVoice } from "./VoiceAnalysis";
import { createSpeechRecognition } from "./SpeechRecognition";
import ChatAssistant from "./ChatAssistant";
import "./App.css";

type PracticeReport = {
  duration: number;
  averageVolume: string;
  voiceActivity: number;
  averagePitch: number | null;
  lowestPitch: number | null;
  highestPitch: number | null;
  suggestions: string[];
};

function App() {
  // VIDEO AND AUDIO REFERENCES
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationRef = useRef<number | null>(null);

  // APPLICATION STATES
  const [isRunning, setIsRunning] = useState(false);
  const [cameraStatus, setCameraStatus] = useState("Not connected");
  const [micStatus, setMicStatus] = useState("Not connected");
  const [volume, setVolume] = useState(0);
  const [error, setError] = useState("");
  const [report, setReport] = useState<PracticeReport | null>(null);

  // BACKEND ANALYSIS
const [backendReport, setBackendReport] = useState<any>(null);
const [isAnalyzing, setIsAnalyzing] = useState(false);

  // FACE, EYE AND HEAD STATES
  const [faceDetected, setFaceDetected] = useState(false);
  const [faceStatus, setFaceStatus] = useState("Not started");
  const [gazeStatus, setGazeStatus] = useState("Not started");
  const [headStatus, setHeadStatus] = useState("Not started");

  // VOICE STATES
  const [pitch, setPitch] = useState<number | null>(null);
  const [speakingPace, setSpeakingPace] = useState(
    "Waiting for voice..."
  );

  // SESSION MEASUREMENTS
  const sessionStart = useRef<number>(0);


  // FACE AND BODY-LANGUAGE MEASUREMENTS
const totalFrames = useRef(0);
const faceDetectedFrames = useRef(0);

const gazeCounts = useRef({
  center: 0,
  left: 0,
  right: 0,
});

const headMovementCounts = useRef({
  stable: 0,
  moving: 0,
});

const previousHeadPose = useRef<{
  yaw: number;
  pitch: number;
  roll: number;
} | null>(null);

  const totalVolume = useRef<number>(0);
  const sampleCount = useRef<number>(0);
  const activeSamples = useRef<number>(0);

  const totalPitch = useRef<number>(0);
  const pitchSamples = useRef<number>(0);
  const pitchValues = useRef<number[]>([]);


  const [transcript, setTranscript] = useState("");
const [interimTranscript, setInterimTranscript] = useState("");
const [speechStatus, setSpeechStatus] = useState("Not started");

const recognitionRef = useRef<ReturnType<
  typeof createSpeechRecognition
> | null>(null);

const [activeTab, setActiveTab] = useState<"practice" | "chat">("practice");

  // ======================================
  // START SESSION
  // ======================================

  async function startSession() {
    setError("");
    setReport(null);
    setBackendReport(null);
setIsAnalyzing(false);
    setTranscript("");
setInterimTranscript("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        await initializeFaceTracking();

        setFaceStatus("Face tracking is ready");
      }

      // INITIALIZE AUDIO
      const audioContext = new AudioContext();

      audioContextRef.current = audioContext;

      await audioContext.resume();

      const source =
        audioContext.createMediaStreamSource(stream);

      const analyser = audioContext.createAnalyser();

      analyser.fftSize = 2048;

      source.connect(analyser);

      const data = new Uint8Array(analyser.fftSize);

      // RESET SESSION MEASUREMENTS
      sessionStart.current = Date.now();

      totalFrames.current = 0;
faceDetectedFrames.current = 0;

gazeCounts.current = {
  center: 0,
  left: 0,
  right: 0,
};

headMovementCounts.current = {
  stable: 0,
  moving: 0,
};

previousHeadPose.current = null;

      totalVolume.current = 0;
      sampleCount.current = 0;
      activeSamples.current = 0;

      totalPitch.current = 0;
      pitchSamples.current = 0;
      pitchValues.current = [];

      // UPDATE STATUSES
      setCameraStatus("Connected");
      setMicStatus("Connected");
      setGazeStatus("Waiting for face");
      setHeadStatus("Waiting for face");

      setPitch(null);
      setSpeakingPace("Waiting for voice...");

      setIsRunning(true);



      // START SPEECH RECOGNITION
const recognition = createSpeechRecognition();

if (recognition) {
  recognitionRef.current = recognition;

  recognition.onstart = () => {
    setSpeechStatus("Listening...");
  };

  recognition.onresult = (event) => {
    let finalText = "";
    let temporaryText = "";

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const text = event.results[i][0].transcript;

      if (event.results[i].isFinal) {
        finalText += text + " ";
      } else {
        temporaryText += text;
      }
    }

    if (finalText) {
      setTranscript((previous) => previous + finalText);
    }

    setInterimTranscript(temporaryText);
  };

  recognition.onerror = (event) => {
    setSpeechStatus("Speech recognition error: " + event.error);
  };

  recognition.onend = () => {
    setSpeechStatus("Recognition stopped");
  };

  try {
    recognition.start();
  } catch (error) {
    console.error("Speech recognition error:", error);
  }
} else {
  setSpeechStatus("Speech recognition is not supported in this browser");
}

      // ======================================
      // REAL-TIME ANALYSIS
      // ======================================

      const analyzeAudio = () => {
        // AUDIO SIGNAL ANALYSIS
        analyser.getByteTimeDomainData(data);

        let sum = 0;

        for (let i = 0; i < data.length; i++) {
          const normalized = (data[i] - 128) / 128;
          sum += normalized * normalized;
        }

        const rms = Math.sqrt(sum / data.length);

        // VOICE PITCH ANALYSIS
        const voiceMetrics = analyzeVoice(analyser);

        setPitch(voiceMetrics.pitch);
        setSpeakingPace(voiceMetrics.speakingPace);

        if (voiceMetrics.pitch !== null) {
          totalPitch.current += voiceMetrics.pitch;
          pitchSamples.current += 1;
          pitchValues.current.push(voiceMetrics.pitch);
        }

        // MICROPHONE LEVEL
        const percentage = Math.min(
          Math.round(rms * 1000),
          100
        );

        setVolume(percentage);

        // COLLECT AUDIO MEASUREMENTS
        totalVolume.current += rms;
        sampleCount.current += 1;

        if (rms > 0.015) {
          activeSamples.current += 1;
        }

        
// FACE, EYE AND HEAD ANALYSIS
if (
  videoRef.current &&
  videoRef.current.readyState >= 2
) {
  const faceResult = detectFace(videoRef.current);

  totalFrames.current += 1;

  const detected =
    (faceResult?.faceLandmarks.length ?? 0) > 0;

  setFaceDetected((previous) =>
    previous === detected ? previous : detected
  );

  if (detected) {
    faceDetectedFrames.current += 1;

    // GAZE MEASUREMENTS
    const gaze = estimateGaze(faceResult);

    setGazeStatus(gaze.message);

    const direction = gaze.horizontal.toLowerCase();

    if (
      direction === "center" ||
      direction === "left" ||
      direction === "right"
    ) {
      gazeCounts.current[
        direction as "center" | "left" | "right"
      ] += 1;
    }

    // HEAD MOVEMENT MEASUREMENTS
    const headPose = estimateHeadPose(faceResult);

    setHeadStatus((previous) =>
      previous === headPose.message
        ? previous
        : headPose.message
    );

    const previous = previousHeadPose.current;

    if (previous) {
      const movement =
        Math.abs(headPose.yaw - previous.yaw) +
        Math.abs(headPose.pitch - previous.pitch) +
        Math.abs(headPose.roll - previous.roll);

      if (movement > 3) {
        headMovementCounts.current.moving += 1;
      } else {
        headMovementCounts.current.stable += 1;
      }
    }

    previousHeadPose.current = {
      yaw: headPose.yaw,
      pitch: headPose.pitch,
      roll: headPose.roll,
    };
  } else {
    setGazeStatus("Face not detected");
    setHeadStatus("Face not detected");
    previousHeadPose.current = null;
  }
}


        // CONTINUE ANALYSIS
        animationRef.current =
          requestAnimationFrame(analyzeAudio);
      };

      // START THE ANALYSIS LOOP
      analyzeAudio();

    } catch (err) {
      console.error("Session error:", err);

      setError(
        "Unable to start camera, microphone or face tracking. Check permissions and try again."
      );

      stopSession();
    }
  }

  // ======================================
  // STOP SESSION AND GENERATE REPORT
  // ======================================

  async function stopSession() {
    const duration = sessionStart.current
      ? Math.round(
          (Date.now() - sessionStart.current) / 1000
        )
      : 0;

    const averageVolume =
      sampleCount.current > 0
        ? totalVolume.current / sampleCount.current
        : 0;

    const voiceActivity =
      sampleCount.current > 0
        ? Math.round(
            (activeSamples.current / sampleCount.current) * 100
          )
        : 0;

    // PITCH STATISTICS
    const averagePitch =
      pitchSamples.current > 0
        ? Math.round(
            totalPitch.current / pitchSamples.current
          )
        : null;

    const lowestPitch =
      pitchValues.current.length > 0
        ? Math.min(...pitchValues.current)
        : null;

    const highestPitch =
      pitchValues.current.length > 0
        ? Math.max(...pitchValues.current)
        : null;

    // GENERATE RECOMMENDATIONS
    const suggestions: string[] = [];

    if (voiceActivity < 20) {
      suggestions.push("Try speaking more consistently.");
    } else {
      suggestions.push(
        "Voice activity was detected during your session."
      );
    }

    if (averageVolume < 0.015) {
      suggestions.push("Try speaking a little louder.");
    } else {
      suggestions.push(
        "Your microphone captured a measurable audio signal."
      );
    }

    if (duration < 15) {
      suggestions.push("Try a longer practice session.");
    } else {
      suggestions.push(
        "Good job completing your practice session."
      );
    }

    if (averagePitch !== null) {
      suggestions.push(
        "Your voice pitch was measured during the session."
      );
    } else {
      suggestions.push(
        "No reliable voice pitch measurement was collected."
      );
    }

    // SAVE FINAL REPORT
    if (sessionStart.current > 0) {
      setReport({
        duration,
        averageVolume: averageVolume.toFixed(4),
        voiceActivity,
        averagePitch,
        lowestPitch,
        highestPitch,
        suggestions,
      });
    }


    
// SEND SESSION DATA TO BACKEND
if (sessionStart.current > 0) {
  setIsAnalyzing(true);

  const sessionData = {
    duration_seconds: duration,
    average_volume: averageVolume,
    voice_activity_percent: voiceActivity,
    average_pitch_hz: averagePitch,
    lowest_pitch_hz: lowestPitch,
    highest_pitch_hz: highestPitch,
    transcript: transcript,
    total_frames: totalFrames.current,
    face_detected_frames: faceDetectedFrames.current,
    gaze_directions: gazeCounts.current,
    head_movement_counts: headMovementCounts.current,
  };

  try {
    const response = await fetch(
      "http://127.0.0.1:8000/analyze-session",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(sessionData),
      }
    );

    if (!response.ok) {
      throw new Error("Backend analysis request failed");
    }

    const result = await response.json();

    setBackendReport(result.report);
    console.log("Backend coaching report:", result.report);
  } catch (error) {
    console.error("Backend error:", error);
    setError("Unable to generate the backend report. Please check that the backend is running.");
  } finally {
    setIsAnalyzing(false);
  }
}


    sessionStart.current = 0;

    // STOP ANIMATION
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    // STOP CAMERA AND MICROPHONE
    streamRef.current?.getTracks().forEach((track) => {
      track.stop();
    });

    streamRef.current = null;

    // CLOSE AUDIO CONTEXT
    if (
      audioContextRef.current &&
      audioContextRef.current.state !== "closed"
    ) {
      void audioContextRef.current.close();
    }

    audioContextRef.current = null;

    // CLEAR VIDEO
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    // RESET APPLICATION STATES
    setIsRunning(false);
    setCameraStatus("Not connected");
    setMicStatus("Not connected");
    setFaceStatus("Stopped");
    setFaceDetected(false);
    setGazeStatus("Not started");
    setHeadStatus("Not started");

    setPitch(null);
    setSpeakingPace("Waiting for voice...");

    setVolume(0);


    recognitionRef.current?.stop();
recognitionRef.current = null;

setSpeechStatus("Stopped");
setInterimTranscript("");
  }

  // ======================================
  // CLEANUP
  // ======================================

  useEffect(() => {
    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }

      streamRef.current?.getTracks().forEach((track) => {
        track.stop();
      });

      if (
        audioContextRef.current &&
        audioContextRef.current.state !== "closed"
      ) {
        void audioContextRef.current.close();
      }
    };
  }, []);

  // ======================================
  // USER INTERFACE
  // ======================================

  return (

    <div className="app">

      <div className="app-tabs">
  <button
    className={activeTab === "practice" ? "active" : ""}
    onClick={() => setActiveTab("practice")}
  >
    Practice Session
  </button>

  <button
    className={activeTab === "chat" ? "active" : ""}
    onClick={() => setActiveTab("chat")}
  >
    Chat Assistant
  </button>
</div>
{activeTab === "practice" && (
  <>
      <header className="header">
        <h1>AI Interview Coach</h1>
        <p>Your personal real-time communication coach</p>
      </header>


     

      <main className="dashboard">

        {/* CAMERA SECTION */}

        <section className="camera-section">
          <h2>Live Camera Preview</h2>

          <div className="video-container">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
            />

            {!isRunning && (
              <div className="placeholder">
                Camera preview will appear here
              </div>
            )}
          </div>

          <div className="buttons">
            {!isRunning ? (
              <button onClick={startSession}>
                Start Camera & Microphone
              </button>
            ) : (
              <button
                className="stop"
                onClick={stopSession}
              >
                Stop Session
              </button>
            )}
          </div>

          {error && <p className="error">{error}</p>}
        </section>

        {/* LIVE ANALYSIS SECTION */}

        <section className="analysis-section">

          <h2>Live Status</h2>

          <div className="status-card">
            <h3>Camera</h3>
            <p>{cameraStatus}</p>
          </div>

          <div className="status-card">
            <h3>Microphone</h3>
            <p>{micStatus}</p>
          </div>

          <div className="status-card">
            <h3>Face Tracking</h3>
            <p>{faceStatus}</p>
            <p>
              Face detected: {faceDetected ? "Yes" : "No"}
            </p>
          </div>

          <div className="status-card">
            <h3>Eye Gaze Tracking</h3>
            <p>{gazeStatus}</p>
          </div>

          <div className="status-card">
            <h3>Head Movement Analysis</h3>
            <p>{headStatus}</p>
          </div>

          <div className="status-card">
            <h3>Voice Pitch</h3>
            <p>
              {pitch !== null
                ? `${pitch} Hz`
                : "Waiting for voice..."}
            </p>
          </div>

          <div className="status-card">
            <h3>Speaking Activity</h3>
            <p>{speakingPace}</p>
          </div>


          <div className="status-card">
  <h3>Live Speech Recognition</h3>

  <p>{speechStatus}</p>

  <div className="transcript-box">
    <p>
      {transcript || "Your spoken words will appear here..."}
    </p>

    <p style={{ color: "#888" }}>
      {interimTranscript}
    </p>
  </div>
</div>

          <div className="status-card">
            <h3>Microphone Activity</h3>

            <div className="progress">
              <div
                className="progress-fill"
                style={{ width: `${volume}%` }}
              />
            </div>

            <p>{volume}%</p>
          </div>

          <div className="feedback-card">
            <h3>AI Coach</h3>

            <p>
              {isRunning
                ? "Your camera and microphone are active. Start speaking naturally."
                : "Start your session to begin analysis."}
            </p>
          </div>

        </section>

      </main>

      {/* FINAL PRACTICE REPORT */}

      {report && (
        <section className="report-section">

          <h2>Interview Practice Report</h2>

          <div className="report-card">

            <h3>Session Duration</h3>
            <p>{report.duration} seconds</p>

            <h3>Average Microphone Level</h3>
            <p>{report.averageVolume}</p>

            <h3>Voice Activity</h3>
            <p>{report.voiceActivity}%</p>

            <h3>Average Voice Pitch</h3>
            <p>
              {report.averagePitch !== null
                ? `${report.averagePitch} Hz`
                : "Not detected"}
            </p>

            <h3>Lowest Voice Pitch</h3>
            <p>
              {report.lowestPitch !== null
                ? `${report.lowestPitch} Hz`
                : "Not detected"}
            </p>

            <h3>Highest Voice Pitch</h3>
            <p>
              {report.highestPitch !== null
                ? `${report.highestPitch} Hz`
                : "Not detected"}
            </p>

            <h3>AI Coach Recommendations</h3>

            {report.suggestions.map((suggestion, index) => (
              <p key={index}>
                {index + 1}. {suggestion}
              </p>
            ))}

          </div>

          <button onClick={() => setReport(null)}>
            Start New Practice
          </button>

        </section>
      )}


      
{/* COMPLETE BACKEND COACHING REPORT */}


{backendReport && (
  <section className="report-section">
    <h2>Complete Communication Coaching Report</h2>

    {/* COMMUNICATION COACHING SUMMARY */}
    {backendReport.coaching_summary && (
      <div className="report-card">
        <h3>Communication Coaching Summary</h3>

        <h4>Strengths</h4>
        {backendReport.coaching_summary.strengths.map(
          (item: string, index: number) => (
            <p key={index}>{item}</p>
          )
        )}

        <h4>Areas for Improvement</h4>
        {backendReport.coaching_summary.areas_for_improvement.map(
          (item: string, index: number) => (
            <p key={index}>{item}</p>
          )
        )}

        <h4>Recommendations</h4>
        {backendReport.coaching_summary.recommendations.map(
          (item: string, index: number) => (
            <p key={index}>{item}</p>
          )
        )}

        <h4>Limitations</h4>
        {backendReport.coaching_summary.limitations.map(
          (item: string, index: number) => (
            <p key={index}>{item}</p>
          )
        )}
      </div>
    )}

    {/* VOICE ANALYSIS */}
    <div className="report-card">
      <h3>Voice Analysis</h3>

      <p>
        Average pitch: {backendReport.voice_analysis.average_pitch_hz ?? "Not detected"} Hz
      </p>

      <p>
        Average microphone level: {backendReport.voice_analysis.average_volume_rms}
      </p>

      <h4>Observations</h4>
      {backendReport.voice_analysis.observations.map(
        (item: string, index: number) => (
          <p key={index}>{item}</p>
        )
      )}

      <h4>Recommendations</h4>
      {backendReport.voice_analysis.recommendations.map(
        (item: string, index: number) => (
          <p key={index}>{item}</p>
        )
      )}
    </div>

    {/* SPEECH ANALYSIS */}
    <div className="report-card">
      <h3>Speech Analysis</h3>

      <p>Word count: {backendReport.speech_analysis.word_count}</p>
      <p>
        Speaking rate: {backendReport.speech_analysis.speaking_rate_wpm} WPM
      </p>
      <p>
        Speaking rate basis: {backendReport.speech_analysis.speaking_rate_basis === "total_session_duration"
          ? "Entire session duration (including pauses)"
          : "Estimated active speaking time"}
      </p>
      <p>Total filler words: {backendReport.speech_analysis.total_fillers}</p>

      <h4>Filler word counts</h4>
      {Object.entries(
        backendReport.speech_analysis.filler_counts
      ).map(([word, count]) => (
        <p key={word}>{word}: {String(count)}</p>
      ))}

      <h4>Recommendations</h4>
      {backendReport.speech_analysis.recommendations.map(
        (item: string, index: number) => (
          <p key={index}>{item}</p>
        )
      )}
    </div>

    {/* FACIAL ANALYSIS */}
    <div className="report-card">
      <h3>Facial and Body Language Analysis</h3>

      <p>
        Face visibility: {backendReport.facial_analysis.face_visibility_percent}%
      </p>

      <h4>Gaze Distribution</h4>
      {Object.entries(
        backendReport.facial_analysis.gaze_distribution_percent
      ).map(([direction, percentage]) => (
        <p key={direction}>
          {direction}: {String(percentage)}%
        </p>
      ))}

      <h4>Head Movement Distribution</h4>
      {Object.entries(
        backendReport.facial_analysis.head_movement_distribution_percent
      ).map(([movement, percentage]) => (
        <p key={movement}>
          {movement}: {String(percentage)}%
        </p>
      ))}

      <h4>Recommendations</h4>
      {backendReport.facial_analysis.recommendations.map(
        (item: string, index: number) => (
          <p key={index}>{item}</p>
        )
      )}
    </div>
  </section>
)}


{isAnalyzing && (
  <p>Generating your complete coaching report...</p>
)}

  </>
)}
{activeTab === "chat" && <ChatAssistant />}

    </div>
  );
}

export default App;
