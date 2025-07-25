from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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

def generate_answer(context, question, conversation_context):
    previous = "\n".join([f"User: {turn['user']}\nAI: {turn['ai']}" for turn in conversation_context[-3:]])
    prompt = f"""
You are a helpful, human-like medical assistant. 
** IMPORTANT:Must Reply in the same language as the user's question (English or German) If a user asks in English, answer in English. If the user asks in German, then answer in german.**
- Always answer in a natural, empathetic, and clear way.
- Use only the provided context below to answer. 
- If the answer is not in the context, reply with only: No details found.
- Do not make up or guess any information.
- If the question is vague, ask for clarification or suggest a follow-up.

Context:
{context}

Previous Conversation:
{previous}

Current Question:
{question}
"""
    response = openai.chat.completions.create(
        model=GPT_MODEL,
        messages=[
            {"role": "system",
             "content": "You are a helpful medical assistant. Answer concisely and directly from context in the user's language. Extract all relevant facts and details."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.1
    )
    return response.choices[0].message.content.strip()

def generate_follow_up(previous_question, previous_answer, current_question, current_answer):
    if "no details found." not in current_answer.lower():
        return ""
    prompt = f'''The user is asking a follow-up question: "{current_question}",but the assistant found no relevant details
            The Previous conversation was:
            User asked:"{previous_question}"
            Assistant answered:{previous_answer}"
            Using this context, suggest a clarifying follow-up question
            If you cannot determine a useful follow-up, just write "Sorry,could not find any useful information for you this time."'''
    response = openai.chat.completions.create(
        model=GPT_MODEL,
        messages=[
            {"role": "system", "content": "You are a helpful assistant that rewrites vague user questions into clearer ones using prior conversation context."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.2
    )
    return response.choices[0].message.content.strip()

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