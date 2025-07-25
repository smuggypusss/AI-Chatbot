# s3_chat_history.py

import boto3
import json
import os
from botocore.exceptions import NoCredentialsError, PartialCredentialsError,ClientError
import uuid
from datetime import datetime

# Replace with your actual bucket name

AWS_REGION = os.getenv("AWS_REGION")
AWS_ACCESS_KEY_ID=os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY=os.getenv("AWS_SECRET_ACCESS_KEY")
BUCKET_NAME = "vector-input-files-bucket"
CHAT_FOLDER = "Chat_History_Files"  # S3 folder

# Initialize S3 client (you can also use environment variables or Streamlit secrets)

s3 = boto3.client("s3", region_name=AWS_REGION)

def get_history_key(username):
    return f"{CHAT_FOLDER}/chat_history_{username}.json"

def load_history_from_s3(username):
    key = get_history_key(username)
    try:
        response = s3.get_object(Bucket=BUCKET_NAME, Key=get_history_key(username))
        data = json.loads(response['Body'].read().decode('utf-8'))
        # If old format (list of Q/A), wrap in new format
        if data and isinstance(data, list) and data and isinstance(data[0], dict) and 'user' in data[0] and 'ai' in data[0]:
            # Convert to one conversation
            conv_id = str(uuid.uuid4())
            return [{"id": conv_id, "title": data[0]["user"][:30] if data else "New Chat", "created": datetime.now().isoformat(), "messages": data}]
        return data
    except s3.exceptions.NoSuchKey:
        return []
    except NoCredentialsError:
        raise RuntimeError("AWS credentials not found. Make sure they are configured properly.")
    except Exception as e:
        raise RuntimeError(f"Error loading history: {e}")


def save_history_to_s3(username, history):
    try:
        s3.put_object(
            Bucket=BUCKET_NAME,
            Key=get_history_key(username),
            Body=json.dumps(history, ensure_ascii=False, indent=2).encode("utf-8"),
            ContentType='application/json'
        )
    except Exception as e:
        print(f"[ERROR] S3 Save Failed: {e}")

# New helpers for multi-convo

def list_conversations(username):
    history = load_history_from_s3(username)
    return [{"id": c["id"], "title": c.get("title", "New Chat"), "created": c.get("created") } for c in history]

def get_conversation(username, convo_id):
    history = load_history_from_s3(username)
    for c in history:
        if c["id"] == convo_id:
            return c
    return None

def add_conversation(username, title=None):
    history = load_history_from_s3(username)
    convo_id = str(uuid.uuid4())
    new_convo = {"id": convo_id, "title": title or "New Chat", "created": datetime.now().isoformat(), "messages": []}
    history.append(new_convo)
    save_history_to_s3(username, history)
    return new_convo

def add_message_to_conversation(username, convo_id, user, ai):
    history = load_history_from_s3(username)
    for c in history:
        if c["id"] == convo_id:
            c["messages"].append({"user": user, "ai": ai})
            save_history_to_s3(username, history)
            return c
    return None

def delete_conversation(username, convo_id):
    history = load_history_from_s3(username)
    history = [c for c in history if c["id"] != convo_id]
    save_history_to_s3(username, history)
    return True


def check_connection(bucket_name):
    try:
        s3=boto3.client("s3")
        print(f"Connection Successful '{bucket_name}'")
    except NoCredentialsError:
        print("No credentials found")
    except PartialCredentialsError:
        print("Incomplete Credentials")
    except ClientError as e:
        error_code = e.response['Error']['Code']
        print(f"❌ ClientError: {error_code} - {e.response['Error']['Message']}")
    except Exception as e:
        print("❌ Unknown error:", str(e))



