import os
import re
import json
import tempfile
import faiss
import numpy as np
from tqdm import tqdm
from pypdf import PdfReader
import boto3
from openai import OpenAI
from langchain.text_splitter import RecursiveCharacterTextSplitter

# ------------------ CONFIG ------------------

AWS_REGION = "eu-central-2"
BUCKET_NAME = "vector-input-files-bucket"
FOLDER_PREFIX = "Input Data/"  # S3 folder
LOCAL_FAISS_FILE = "../vector_index.faiss"
LOCAL_METADATA_FILE = "../metadata.json"
EMBEDDING_MODEL = "text-embedding-3-large"
CHUNK_SIZE = 500
CHUNK_OVERLAP = 150

openai_client = os.getenv("openai_key")  # Replace securely

s3 = boto3.client("s3", region_name=AWS_REGION)

# ------------------ HELPERS ------------------

def list_pdf_keys(bucket, prefix):
    response = s3.list_objects_v2(Bucket=bucket, Prefix=prefix)
    return [obj["Key"] for obj in response.get("Contents", []) if obj["Key"].endswith(".pdf")]

def download_pdf(key):
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        s3.download_fileobj(BUCKET_NAME, key, tmp)
        return tmp.name

def extract_clean_text(path):
    pdf = PdfReader(path)
    results = []
    for page_num, page in enumerate(pdf.pages):
        text = page.extract_text()
        if text:
            text = re.sub(r"(\w+)-\n(\w+)", r"\1\2", text)
            text = re.sub(r"(?<!\n\s)\n(?!\s\n)", " ", text.strip())
            text = re.sub(r"\n\s*\n", "\n\n", text)
            results.append((page_num + 1, text))
    return results

def chunk_texts(page_texts, source_file):
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
        separators=["\n\n", "\n", ".", "!", "?", ",", " ", ""]
    )
    chunks = []
    for page_num, page_text in page_texts:
        texts = splitter.split_text(page_text)
        for i, chunk in enumerate(texts):
            chunks.append({
                "text": chunk,
                "metadata": {
                    "source_file": source_file,
                    "page": page_num,
                    "chunk_index": i,
                    "length": len(chunk),
                    "full_text": chunk
                }
            })
    return chunks

def embed_texts(texts):
    vectors = []
    for i in range(0, len(texts), 100):
        batch = texts[i:i + 100]
        res = openai_client.embeddings.create(input=batch, model=EMBEDDING_MODEL)
        vectors.extend([np.array(e.embedding) for e in res.data])
    return np.array(vectors).astype("float32")

# ------------------ MAIN ------------------

def main():
    all_chunks = []
    temp_files = []

    print("📦 Listing PDFs in S3...")
    pdf_keys = list_pdf_keys(BUCKET_NAME, FOLDER_PREFIX)

    for key in tqdm(pdf_keys, desc="⬇️ Downloading + Chunking PDFs"):
        try:
            file_name = key.split("/")[-1]
            local_path = download_pdf(key)
            temp_files.append(local_path)

            pages = extract_clean_text(local_path)
            chunks = chunk_texts(pages, file_name)
            all_chunks.extend(chunks)

        except Exception as e:
            print(f"⚠️ Skipped {key}: {e}")

    if not all_chunks:
        print("❌ No chunks found. Exiting.")
        return

    texts = [c["text"] for c in all_chunks]
    metadata = [c["metadata"] for c in all_chunks]

    print(f"🔢 Total chunks: {len(texts)}")
    print("🔗 Generating embeddings...")

    vectors = embed_texts(texts)

    print("💾 Saving FAISS + metadata...")
    index = faiss.IndexFlatL2(vectors.shape[1])
    index.add(vectors)
    faiss.write_index(index, LOCAL_FAISS_FILE)

    with open(LOCAL_METADATA_FILE, "w", encoding="utf-8") as f:
        json.dump(metadata, f, ensure_ascii=False, indent=2)

    print(f"✅ Saved:\n  {LOCAL_FAISS_FILE}\n  {LOCAL_METADATA_FILE}")

    for path in temp_files:
        os.remove(path)
    print("🧹 Deleted temporary PDF files.")

if __name__ == "__main__":
    main()
