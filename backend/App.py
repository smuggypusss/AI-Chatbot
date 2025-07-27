from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://ai-chatbot-v7w7-l0e3qcatq-smuggypusss-projects.vercel.app",
        "http://localhost:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from pydantic import BaseModel
from chat_history_files import (
    load_history_from_s3, save_history_to_s3,
    list_conversations, get_conversation, add_conversation, add_message_to_conversation, delete_conversation
)
import openai
import faiss
import numpy as np
import json
import os
from dotenv import load_dotenv
load_dotenv()
# Load models and metadata at startup
EMBEDDING_MODEL = "text-embedding-3-large"
GPT_MODEL = "gpt-4o"
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
index = faiss.read_index("vector_index.faiss")
with open("metadata.json", "r", encoding="utf-8") as f:
    metadata = json.load(f)



class ChatRequest(BaseModel):
    user_input: str
    email: str
    convo_id: str = None

class NewConvoRequest(BaseModel):
    email: str
    title: str = None

class ConvoRequest(BaseModel):
    email: str
    convo_id: str

@app.get("/conversations")
def get_convos(email: str):
    return list_conversations(email)

@app.post("/new_conversation")
def new_convo(req: NewConvoRequest):
    convo = add_conversation(req.email, req.title)
    return {"id": convo["id"], "title": convo["title"], "created": convo["created"]}

@app.get("/conversation/{convo_id}")
def get_convo(email: str, convo_id: str):
    convo = get_conversation(email, convo_id)
    if convo:
        return convo
    return {"error": "Conversation not found"}

def get_embedding(text):
    response = openai.embeddings.create(model=EMBEDDING_MODEL, input=[text])
    return np.array(response.data[0].embedding).astype("float32")

def retrieve_chunks(question, top_k=10):
    query_vector = get_embedding(question)
    D, I = index.search(np.array([query_vector]), top_k)
    return [metadata[i] for i in I[0] if i < len(metadata)]

def rerank_with_gpt(question, chunks, top_n=4):
    return chunks[:top_n]

def build_context(chunks):
    return "\n\n---\n\n".join([chunk["full_text"] for chunk in chunks])

def detect_language(text):
    """Simple language detection - check for common German words/patterns"""
    german_indicators = ['der', 'die', 'das', 'und', 'ist', 'sind', 'haben', 'können', 'müssen', 'wollen', 'werden', 'sein', 'haben', 'machen', 'gehen', 'kommen', 'sehen', 'hören', 'sprechen', 'denken', 'wissen', 'glauben', 'hoffen', 'lieben', 'leben', 'arbeiten', 'lernen', 'lehren', 'helfen', 'suchen', 'finden', 'geben', 'nehmen', 'bringen', 'holen', 'schicken', 'kaufen', 'verkaufen', 'bezahlen', 'kosten', 'teuer', 'billig', 'gut', 'schlecht', 'groß', 'klein', 'alt', 'jung', 'neu', 'alt', 'schön', 'hässlich', 'stark', 'schwach', 'schnell', 'langsam', 'heiß', 'kalt', 'warm', 'kühl', 'hell', 'dunkel', 'leicht', 'schwer', 'frei', 'gefangen', 'reich', 'arm', 'glücklich', 'traurig', 'froh', 'böse', 'freundlich', 'unfreundlich', 'klug', 'dumm', 'fleißig', 'faul', 'mutig', 'ängstlich', 'ruhig', 'laut', 'still', 'leise', 'sauber', 'schmutzig', 'trocken', 'nass', 'voll', 'leer', 'offen', 'geschlossen', 'richtig', 'falsch', 'wahr', 'unwahr', 'möglich', 'unmöglich', 'nötig', 'unnötig', 'wichtig', 'unwichtig', 'interessant', 'langweilig', 'spannend', 'ruhig', 'hektisch', 'entspannt', 'gestresst', 'zufrieden', 'unzufrieden', 'zufrieden', 'unzufrieden', 'zufrieden', 'unzufrieden']
    
    text_lower = text.lower()
    german_word_count = sum(1 for word in german_indicators if word in text_lower)
    
    # If more than 2 German words found, likely German
    if german_word_count > 2:
        return "German"
    return "English"

def generate_answer(context, question, conversation_context):
    previous = "\n".join([f"User: {turn['user']}\nAI: {turn['ai']}" for turn in conversation_context[-3:]])
    
    # Detect the language of the user's question
    detected_language = detect_language(question)
    
    system_message = f"""You are a helpful medical assistant. 

CRITICAL LANGUAGE RULE: The user's question is in {detected_language}. You MUST respond in {detected_language} only.

- If the user writes in English → respond in English
- If the user writes in German → respond in German  
- If the user writes in any other language → respond in that language

DO NOT mix languages. DO NOT respond in German when the user asks in English.

Use only the provided context to answer. If the answer is not in the context, reply with: "No details found." Do not make up information. Be natural and clear."""
    
    user_message = f"""Context:
{context}

Previous Conversation:
{previous}

Current Question (respond in the SAME language as this question):
{question}"""
    
    try:
        response = openai.chat.completions.create(
            model=GPT_MODEL,
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": user_message}
            ],
            temperature=0.7,
            max_tokens=1000
        )
        answer = response.choices[0].message.content.strip()
        
        # Double-check language consistency
        answer_language = detect_language(answer)
        if detected_language == "English" and answer_language == "German":
            print(f"Language mismatch detected. Question: {detected_language}, Answer: {answer_language}")
            # Force English response
            return "I apologize, but I should respond in English. Let me provide the information in English: " + answer
        
        return answer
    except Exception as e:
        print(f"OpenAI API Error: {e}")
        return "I'm having trouble processing your request right now. Please try again."

def generate_follow_up(previous_question, previous_answer, current_question, current_answer):
    if "no details found." not in current_answer.lower():
        return ""
    
    system_message = """You are a helpful assistant that suggests clarifying follow-up questions when users ask vague questions that can't be answered from the available context."""
    
    user_message = f"""The user asked: "{current_question}" but no relevant details were found.

Previous conversation:
User: "{previous_question}"
Assistant: "{previous_answer}"

Suggest a clarifying follow-up question to help the user get better information. If you cannot determine a useful follow-up, respond with: "Sorry, could not find any useful information for you this time.
"""
    try:
        response = openai.chat.completions.create(
            model=GPT_MODEL,
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": user_message}
            ],
            temperature=0.5,
            max_tokens=200
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"Follow-up generation error: {e}")
        return ""

import boto3
from urllib.parse import quote_plus
AWS_REGION = "eu-central-2"
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
BUCKET_NAME = "vector-input-files-bucket"
s3 = boto3.client("s3", region_name=AWS_REGION,aws_access_key_id=AWS_ACCESS_KEY_ID,aws_secret_access_key=AWS_SECRET_ACCESS_KEY)

#def generate_presigned_pdf_link(source_file):
#    try:
#        params = {
#            'Bucket': BUCKET_NAME,
#            'Key': source_file,
#        }
#        url = s3.generate_presigned_url('get_object', Params=params)
#        return url
#    except Exception as e:
#        print(f"[ERROR] S3 Signed URL: {e}")
#        return None

@app.post("/chat")
def chat_endpoint(req: ChatRequest):
    username = req.email
    user_input = req.user_input
    convo_id = req.convo_id

    # Load chat history
    history = load_history_from_s3(username)
    if not history or not convo_id:
        # Start new conversation if none exists or no convo_id provided
        convo = add_conversation(username, user_input[:30])
        convo_id = convo["id"]
        conversation_context = []
    else:
        convo = get_conversation(username, convo_id)
        if not convo:
            convo = add_conversation(username, user_input[:30])
            convo_id = convo["id"]
            conversation_context = []
        else:
            conversation_context = convo["messages"][-3:] if convo["messages"] else []

    # Retrieve and rerank
    top_chunks = retrieve_chunks(user_input, top_k=10)
    reranked_chunks = rerank_with_gpt(user_input, top_chunks, top_n=4)
    seen = set()
    unique_citations = []
    #for chunk in reranked_chunks:
    #    source = chunk.get("source_file")
    #    page = chunk.get("page")
    #    matched_text = chunk.get("full_text")
    #    if source and page:
    #        key = (source, page)
    #        if key not in seen:
    #            seen.add(key)
    #            link = generate_presigned_pdf_link(source)
    #            unique_citations.append({
    #                "source": source,
    #                "page": page,
    #                "link": link,
    #                "matched_text": matched_text
    #            })
    context = build_context(reranked_chunks)

    # Generate answer
    answer = generate_answer(context, user_input, conversation_context)

    # Follow-up suggestion if answer is vague
    follow_up = ""
    if answer.strip().lower() == "no details found.":
        prev_q = conversation_context[-1]["user"] if conversation_context else ""
        prev_a = conversation_context[-1]["ai"] if conversation_context else ""
        follow_up = generate_follow_up(prev_q, prev_a, user_input, answer)

    # Update and save history (do NOT save follow-up)
    add_message_to_conversation(username, convo_id, user_input, answer)

    return {
        "answer": answer,
        "sources": unique_citations,
        "follow_up": follow_up,
        "convo_id": convo_id
    }

@app.post("/clear_history")
def clear_history_endpoint(req: ChatRequest):
    username = req.email
    save_history_to_s3(username, [])
    return {"status": "success", "message": "Chat history cleared."}

@app.delete("/conversation/{convo_id}")
def delete_convo(email: str, convo_id: str):
    delete_conversation(email, convo_id)
    return {"status": "success"}
