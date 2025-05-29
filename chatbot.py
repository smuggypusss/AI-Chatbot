import streamlit as st
import os
import pickle
import pandas as pd
import faiss
import numpy as np
from typing import List
from io import BytesIO
from sentence_transformers import SentenceTransformer
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.docstore.document import Document
from langchain.vectorstores.faiss import FAISS
import subprocess
import json

# ------------ XLSX Parsing ----------------

def parse_xlsx(file: BytesIO) -> List[str]:
    xls = pd.ExcelFile(file)
    output = []
    for sheet_name in xls.sheet_names:
        df = xls.parse(sheet_name)
        df = df.fillna("").astype(str)
        text_lines = df.apply(lambda row: " | ".join(row), axis=1).tolist()
        sheet_text = "\n".join(text_lines)
        output.append(f"Sheet: {sheet_name}\n{sheet_text}")
    return output

def text_to_docs(text: List[str]) -> List[Document]:
    page_docs = [Document(page_content=page) for page in text]
    for i, doc in enumerate(page_docs):
        doc.metadata["sheet"] = i + 1

    doc_chunks = []
    for doc in page_docs:
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=3000,
            chunk_overlap=0
        )
        chunks = splitter.split_text(doc.page_content)
        for i, chunk in enumerate(chunks):
            chunk_doc = Document(
                page_content=chunk,
                metadata={"sheet": doc.metadata["sheet"], "chunk": i}
            )
            chunk_doc.metadata["source"] = f"{chunk_doc.metadata['sheet']}-{chunk_doc.metadata['chunk']}"
            doc_chunks.append(chunk_doc)
    return doc_chunks

# ------------ Embedding & Vector Store ----------------

embedding_model = SentenceTransformer('all-MiniLM-L6-v2')

def embed_texts(texts: List[str]) -> List[List[float]]:
    return embedding_model.encode(texts, show_progress_bar=False).tolist()

def docs_to_index(docs: List[Document]):
    texts = [doc.page_content for doc in docs]
    embeddings = embed_texts(texts)
    dimension = len(embeddings[0])
    index = faiss.IndexFlatL2(dimension)
    index.add(np.array(embeddings).astype('float32'))

    docstore = {i: doc for i, doc in enumerate(docs)}
    index_to_docstore_id = {i: i for i in range(len(docs))}
    vectorstore = FAISS()
    vectorstore.index = index
    vectorstore.docstore = docstore
    vectorstore.index_to_docstore_id = index_to_docstore_id
    return vectorstore

def store_index_locally(index: FAISS, name: str, folder: str = "vector_store"):
    os.makedirs(folder, exist_ok=True)
    faiss.write_index(index.index, os.path.join(folder, f"{name}.index"))
    index.index = None  # remove before pickle
    with open(os.path.join(folder, f"{name}.pkl"), "wb") as f:
        pickle.dump(index, f)

def load_index_locally(name: str, folder: str = "vector_store") -> FAISS:
    index_path = os.path.join(folder, f"{name}.index")
    pkl_path = os.path.join(folder, f"{name}.pkl")

    if not os.path.exists(index_path) or not os.path.exists(pkl_path):
        raise FileNotFoundError("Vector store not found.")

    index = faiss.read_index(index_path)
    with open(pkl_path, "rb") as f:
        vectorstore = pickle.load(f)
    vectorstore.index = index
    return vectorstore

# ------------ Ollama LLM ----------------

def query_ollama(context: str, question: str, model: str = "llama3.2") -> str:
    prompt = f"Answer the following question based on the context below.\n\nContext:\n{context}\n\nQuestion: {question}"
    try:
        result = subprocess.run(
            ["ollama", "run", model],
            input=prompt.encode(),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=60
        )
        return result.stdout.decode().strip()
    except Exception as e:
        return f"Error querying Ollama: {e}"

# ------------ Streamlit UI ----------------

st.set_page_config(page_title="Excel Chatbot with Ollama", layout="wide")
st.title("🤖 Chat with your Excel Files using Ollama LLM")

VECTOR_DB_NAME = "my_xlsx_index"
index = None
indexed_files = []

# Load existing index
try:
    index = load_index_locally(VECTOR_DB_NAME)
    st.info("✅ Loaded existing vector DB from local storage.")
except FileNotFoundError:
    st.warning("No existing index found. Please upload Excel files to build one.")

# Upload new files
uploaded_files = st.file_uploader("Upload Excel files", type="xlsx", accept_multiple_files=True)

if uploaded_files:
    xlsx_bytes = [file.read() for file in uploaded_files]
    filenames = [file.name for file in uploaded_files]

    if st.button("Build New Index from Uploaded Files"):
        with st.spinner("Processing uploaded files..."):
            documents = []
            for xlsx in xlsx_bytes:
                text = parse_xlsx(BytesIO(xlsx))
                documents.extend(text_to_docs(text))
            index = docs_to_index(documents)
            store_index_locally(index, VECTOR_DB_NAME)
            indexed_files = filenames
        st.success(f"Index created for: {', '.join(filenames)}")

if index:
    user_question = st.text_input("💬 Ask something about your Excel data:")

    if user_question:
        with st.spinner("Thinking..."):
            results = index.similarity_search(user_question, k=4)
            context = "\n\n".join([doc.page_content for doc in results])
            response = query_ollama(context, user_question)

            st.markdown("### 📄 Context Used:")
            for doc in results:
                st.markdown(f"**Chunk {doc.metadata['source']}**")
                st.write(doc.page_content)
                st.markdown("---")

            st.markdown("### 🤖 Answer:")
            st.write(response)

else:
    st.info("Upload Excel files and build index to get started.")
