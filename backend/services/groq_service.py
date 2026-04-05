import os
from groq import Groq
from dotenv import load_dotenv
from typing import Any

load_dotenv()

GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None

SYSTEM_PROMPT = """You are a supportive rehabilitation assistant integrated into a web application.

Your role is to guide users through their recovery journey by:
- Understanding and remembering the history of exercises completed in the app.
- Providing personalized recommendations for upcoming exercises based on past activity, progress, and recovery goals.
- Offering encouragement, motivation, and clear instructions for each exercise.
- Answering user questions about their rehabilitation plan, exercise techniques, and progress tracking.
- Connecting seamlessly with the app’s chatbot interface to deliver context-aware responses.
- Maintaining a professional, empathetic, and encouraging tone at all times.

Constraints:
- Always reference the user’s exercise history when giving advice.
- Keep responses concise, actionable, and easy to follow.
- Avoid medical diagnoses or prescriptions; focus only on exercise guidance and motivation.
- Ensure modularity so the chatbot can integrate into different workflows (progress tracking, adaptive scoring, multilingual accessibility).
- Respond efficiently and accurately for general questions too.
- Keep answers concise but informative and accurate.
- Match the user's preferred language when a supported language code is provided: en, hi, or mr.
- If the language is Hindi or Marathi, reply naturally in that language while keeping the answer concise.

Output style:
- Use short bullet points or short numbered steps when helpful.
- For medical diagnosis/prescription requests, politely decline diagnosis and suggest consulting a licensed clinician in one short sentence.
"""

LANGUAGE_HINTS = {
    "en": {
        "title": "Here is a concise rehab suggestion:",
        "exercise1": "Keep reps controlled and use your recent session history to guide the next set.",
        "exercise2": "Focus on quality over speed and add a short rest if fatigue is increasing.",
        "general": "I can help with rehab guidance and general questions.",
        "general1": "Ask about exercise form, recovery progress, or your next workout.",
        "general2": "I will keep answers concise and practical.",
    },
    "hi": {
        "title": "यह एक संक्षिप्त पुनर्वसन सुझाव है:",
        "exercise1": "अपनी हाल की सत्र जानकारी का उपयोग करके अगला सेट नियंत्रित रखें।",
        "exercise2": "गति से अधिक गुणवत्ता पर ध्यान दें और थकान बढ़ने पर छोटा आराम लें।",
        "general": "मैं पुनर्वसन मार्गदर्शन और सामान्य प्रश्नों में मदद कर सकता हूँ।",
        "general1": "व्यायाम फॉर्म, रिकवरी प्रगति, या अगले वर्कआउट के बारे में पूछें।",
        "general2": "मैं जवाब छोटे और व्यावहारिक रखूँगा।",
    },
    "mr": {
        "title": "हा एक संक्षिप्त पुनर्वसन सल्ला आहे:",
        "exercise1": "तुमच्या अलीकडच्या सत्र इतिहासाचा वापर करून पुढचा सेट नियंत्रित ठेवा.",
        "exercise2": "गतीपेक्षा गुणवत्तेवर लक्ष द्या आणि थकवा वाढल्यास छोटा विश्रांती घ्या.",
        "general": "मी पुनर्वसन मार्गदर्शन आणि सामान्य प्रश्नांमध्ये मदत करू शकतो.",
        "general1": "व्यायाम फॉर्म, पुनर्प्राप्ती प्रगती किंवा पुढील वर्कआउटबद्दल विचारा.",
        "general2": "मी उत्तरे लहान आणि व्यावहारिक ठेवीन.",
    },
}


def _summarize_exercise_history(exercise_history: Any) -> str:
    if not isinstance(exercise_history, list) or len(exercise_history) == 0:
        return "No exercise history available yet."

    sessions = exercise_history[:5]
    lines: list[str] = []
    for idx, session in enumerate(sessions, start=1):
        if not isinstance(session, dict):
            continue

        date = session.get("date", "Unknown date")
        disease = session.get("disease", "Unknown condition")
        overall = session.get("overallScore", "N/A")
        exercises = session.get("exerciseResults", [])

        ex_parts: list[str] = []
        if isinstance(exercises, list):
            for ex in exercises[:4]:
                if not isinstance(ex, dict):
                    continue
                name = ex.get("name", "Exercise")
                reps = ex.get("reps", 0)
                quality = ex.get("repQuality", 0)
                status = "skipped" if ex.get("skipped") else "done"
                ex_parts.append(f"{name}: {reps} reps, quality {quality}%, {status}")

        ex_summary = "; ".join(ex_parts) if ex_parts else "No exercise details"
        lines.append(f"Session {idx} ({date}) | condition: {disease} | overall: {overall}% | {ex_summary}")

    return "\n".join(lines) if lines else "No exercise history available yet."


def _fallback_response(messages: list, exercise_history: Any, lang_code: str | None = None) -> str:
    history_summary = _summarize_exercise_history(exercise_history)
    lang = lang_code if lang_code in LANGUAGE_HINTS else "en"
    hint = LANGUAGE_HINTS[lang]
    latest_user = ""
    for m in reversed(messages):
        if m.get("role") == "user":
            latest_user = str(m.get("content", "")).strip().lower()
            break

    if any(k in latest_user for k in ["exercise", "rehab", "rep", "pain", "parkinson", "stroke"]):
        return "\n".join([
            hint["title"],
            f"- {hint['exercise1']}",
            f"- {hint['exercise2']}",
            f"History snapshot: {history_summary.splitlines()[0] if history_summary else 'No recent sessions logged.'}",
        ])

    return "\n".join([
        hint["general"],
        f"- {hint['general1']}",
        f"- {hint['general2']}",
        "- For urgent medical concerns, please consult your clinician.",
    ])


def generate_chat_response(
    messages: list,
    exercise_history: Any = None,
    user_context: dict | None = None,
    lang_code: str | None = None,
) -> str:
    """
    Takes a list of message dicts [{"role": "...", "content": "..."}, ...] 
    and returns a response from the Groq model.
    """
    try:
        history_summary = _summarize_exercise_history(exercise_history)
        context_bits: list[str] = []
        if isinstance(user_context, dict):
            name = user_context.get("name")
            condition = user_context.get("condition_id")
            fitness = user_context.get("fitness_level")
            if name:
                context_bits.append(f"User name: {name}")
            if condition:
                context_bits.append(f"Primary condition: {condition}")
            if fitness:
                context_bits.append(f"Fitness level: {fitness}")
        if lang_code:
            context_bits.append(f"Preferred language code: {lang_code}")

        dynamic_context = "\n".join([
            "Use this app context while responding:",
            *(context_bits if context_bits else ["No user profile context provided."]),
            "Exercise history summary:",
            history_summary,
        ])

        formatted_messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "system", "content": dynamic_context},
        ] + messages

        if client is None:
            return _fallback_response(messages, exercise_history, lang_code)
        
        chat_completion = client.chat.completions.create(
            messages=formatted_messages,
            model="llama-3.3-70b-versatile",
            temperature=0.35,
            max_tokens=700,
        )
        return chat_completion.choices[0].message.content
    except Exception as e:
        print(f"Error calling Groq API: {e}")
        return _fallback_response(messages, exercise_history, lang_code)
