import streamlit as st
from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import OllamaEmbeddings
from langchain_community.llms import Ollama
from langchain.schema import Document
from langchain.text_splitter import RecursiveCharacterTextSplitter
import pandas as pd
import os

# Initialize session state for history
if "chat_history" not in st.session_state:
    st.session_state.chat_history = []

# Title
st.title("🧠 Excel Chatbot")

# Upload XLSX file
uploaded_file = st.file_uploader("Upload an XLSX file", type="xlsx")


# Function to parse Excel file
def parse_xlsx(file):
    xls = pd.ExcelFile(file)
    combined_text = ""
    for sheet_name in xls.sheet_names:
        df = pd.read_excel(xls, sheet_name=sheet_name)
        text = df.astype(str).fillna("").agg(" | ".join, axis=1).str.cat(sep="\n")
        combined_text += f"Sheet: {sheet_name}\n{text}\n\n"
    return combined_text


# Function to split text into documents
def text_to_docs(text):
    splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    texts = splitter.split_text(text)
    return [Document(page_content=t, metadata={"source": f"chunk_{i}"}) for i, t in enumerate(texts)]


# Function to ask LLM via Ollama
def query_ollama(context, question):
    try:
        llm = Ollama(model="llama3:instruct")
        prompt = f"""Use the context below to answer the question:

        Context:
        {context}

        Question:
        {question}
        """
        return llm.invoke(prompt)
    except Exception as e:
        return f"🤖 Error querying Ollama: {e}"


# Main logic after file upload
if uploaded_file:
    with st.spinner("Reading and processing file..."):
        text = parse_xlsx(uploaded_file)
        docs = text_to_docs(text)
        embeddings = OllamaEmbeddings(model="nomic-embed-text")
        index = FAISS.from_documents(docs, embeddings)

    st.success("✅ File indexed! You can now ask questions.")

    user_question = st.text_input("Ask a question about the Excel file:")

    if user_question:
        with st.spinner("Thinking..."):
            results = index.similarity_search(user_question, k=4)
            context = "\n\n".join([doc.page_content for doc in results])
            response = query_ollama(context, user_question)

            # Save Q&A to history
            st.session_state.chat_history.append((user_question, response))

        st.markdown("### 🤖 Answer:")
        st.write(response)

        st.markdown("### 📄 Context Used:")
        for doc in results:
            st.markdown(f"**Chunk {doc.metadata['source']}**")
            st.write(doc.page_content)
            st.markdown("---")

    # Display past Q&A
    if st.session_state.chat_history:
        st.markdown("### 💬 Chat History")
        for i, (q, a) in enumerate(st.session_state.chat_history, 1):
            st.markdown(f"**Q{i}:** {q}")
            st.markdown(f"**A{i}:** {a}")
