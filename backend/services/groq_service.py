import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

# Initialize the Groq client
client = Groq(
    api_key=os.environ.get("GROQ_API_KEY"),
)

SYSTEM_PROMPT = """You are an expert AI rehabilitation assistant for the NeuroRehab platform.
Your purpose is to provide accurate, empathetic, and evidence-based guidance for users undergoing physical and cognitive rehabilitation.
CRITICAL INSTRUCTIONS FOR FORMATTING AND TONE:
1. Be extremely concise. Avoid repetitive conversational fillers, long preambles, or drawn-out introductions. 
2. Get straight to the point. Provide actionable answers immediately.
3. Organize information nicely using clear bullet points or numbered lists.
4. Keep paragraphs very short (maximum 2 sentences).
5. If a user asks a deep medical question outside of general exercises, succinctly advise them to consult their primary care doctor in 1 single sentence at the end.
6. Always maintain a supportive, uplifting tone.
"""

def generate_chat_response(messages: list) -> str:
    """
    Takes a list of message dicts [{"role": "...", "content": "..."}, ...] 
    and returns a response from the Groq model.
    """
    try:
        # Prepend the system prompt if it's the first interaction, 
        # but in this setup we'll just insert it at the beginning of the messages list.
        formatted_messages = [{"role": "system", "content": SYSTEM_PROMPT}] + messages
        
        chat_completion = client.chat.completions.create(
            messages=formatted_messages,
            model="llama-3.3-70b-versatile", # Using a highly capable and commonly available Groq model
            temperature=0.7,
            max_tokens=1024,
        )
        return chat_completion.choices[0].message.content
    except Exception as e:
        print(f"Error calling Groq API: {e}")
        return "I'm having trouble connecting to my knowledge base right now. Please try again later."
