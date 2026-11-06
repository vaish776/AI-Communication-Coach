from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.services.session_analysis import analyze_complete_session

app = FastAPI(
    title="AI Communication Coach API",
    description="Backend API for communication practice analysis",
    version="1.0.0"
)

# Allow the React frontend to communicate with this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", 
                   "https://ai-communication-coach-one.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    return {
        "message": "AI Communication Coach backend is running!"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy"
    }


@app.post("/analyze-session")
def analyze_session(session_data: dict):
    try:
        report = analyze_complete_session(session_data)

        return {
            "success": True,
            "message": "Session analysis completed successfully",
            "report": report
        }

    except Exception as error:
        raise HTTPException(
            status_code=400,
            detail=str(error)
        )


# BASIC CHAT ASSISTANT
@app.post("/chat")
def chat(chat_data: dict):
    try:
        message = chat_data.get("message", "").strip()

        if not message:
            raise HTTPException(
                status_code=400,
                detail="Please enter a message."
            )

        question = message.lower()

        if any(word in question for word in ["hello", "hi", "hey"]):
            answer = (
                "Hello! I'm your communication coaching assistant. "
                "I can help you practise interviews, improve presentations, "
                "prepare for meetings, and develop speaking skills."
            )

        elif "interview" in question:
            answer = (
                "For a job interview, try the STAR method: describe the "
                "Situation, Task, Action, and Result. Keep your answers "
                "structured, use specific examples, and practise speaking "
                "clearly. Would you like to practise a common interview question?"
            )

        elif "presentation" in question or "public speaking" in question:
            answer = (
                "For a stronger presentation, start with a clear opening, "
                "organise your ideas into three or four main points, and "
                "finish with a memorable conclusion. Practise your timing "
                "and pause between important points."
            )

        elif "meeting" in question:
            answer = (
                "To communicate effectively in a business meeting, prepare "
                "your key points, listen without interrupting, explain your "
                "ideas clearly, and summarise decisions and action items."
            )

        elif "filler" in question or "um" in question or "uh" in question:
            answer = (
                "To reduce filler words such as 'um' and 'uh', slow down "
                "slightly. Replace filler words with short, intentional "
                "pauses. Practise recording yourself and reviewing your speech."
            )

        elif "confidence" in question or "nervous" in question:
            answer = (
                "To improve your speaking confidence, prepare your key "
                "points, practise aloud, breathe slowly before speaking, "
                "and focus on communicating one idea at a time. Confidence "
                "develops through preparation and practice."
            )

        elif "eye contact" in question or "gaze" in question:
            answer = (
                "During a presentation or conversation, look towards your "
                "audience naturally. Avoid staring continuously at one point. "
                "If you are speaking to a camera, look at the camera lens "
                "periodically."
            )

        elif "speak" in question or "speaking" in question or "pace" in question:
            answer = (
                "For clearer speaking, use a comfortable pace, pronounce "
                "words clearly, and pause between important ideas. Record "
                "yourself to identify sections that sound too fast or unclear."
            )

        elif any(word in question for word in [
            "communication", "communicate", "improve", "better",
            "skills", "talk", "conversation", "speak clearly"
        ]):
            answer = (
                "Good communication involves expressing your ideas clearly, "
                "listening actively, using an appropriate speaking pace, "
                "and adapting your message to your audience. "
                "Practise explaining one idea at a time, use examples, "
                "and ask questions to confirm understanding. "
                "Which communication skill would you like to improve?"
            )

        elif "thank" in question:
            answer = (
                "You're welcome! Keep practising your communication skills. "
                "I'm here to help with interviews, presentations and meetings."
            )

        else:
            answer = (
                "I'm currently a basic communication coaching prototype. "
                "I can help with interview preparation, presentations, "
                "meetings, speaking pace, filler words, eye contact, "
                "and communication skills. Please try asking about one "
                "of these topics."
            )

        return {
            "success": True,
            "response": answer
        }

    except HTTPException:
        raise

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=str(error)
        )