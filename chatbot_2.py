import streamlit as st
import pandas as pd
from langchain_core.documents import Document
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_groq import ChatGroq

st.set_page_config(page_title="Excel Q&A Bot (Groq)", page_icon="📊")
st.title("📊 Excel Q&A Chatbot (Powered by Groq LLaMA 3)")

if "chat_history" not in st.session_state:
    st.session_state.chat_history = []

uploaded_file = st.file_uploader("Upload an Excel file (.xlsx)", type=["xlsx"])

def parse_xlsx(file):
    xls = pd.ExcelFile(file)
    full_text = ""
    for sheet in xls.sheet_names:
        df = pd.read_excel(xls, sheet_name=sheet)
        df = df.astype(str).fillna("")
        sheet_text = df.apply(lambda row: " | ".join(row), axis=1).str.cat(sep="\n")
        full_text += f"Sheet: {sheet}\n{sheet_text}\n\n"
    return full_text

def split_text_to_docs(text):
    splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=100)
    chunks = splitter.split_text(text)
    return [Document(page_content=chunk, metadata={"chunk": i}) for i, chunk in enumerate(chunks)]

@st.cache_resource(show_spinner=False)
def create_faiss_index(_docs):
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    return FAISS.from_documents(_docs, embeddings)

if "llm" not in st.session_state:
    st.session_state.llm = ChatGroq(api_key=st.secrets["groq_api_key"], model="llama3-70b-8192")

def query_llm(question, docs, max_context_chars=1500):
    try:
        context = "\n\n".join(doc.page_content for doc in docs)[:max_context_chars]
        prompt = f"""
You are an expert assistant. Use the following Excel context to answer the question.

Context:
{context}

Question:
{question}

Answer:"""
        return st.session_state.llm.invoke(prompt).content.strip()
    except Exception as e:
        return f"❌ Error: {e}"

if uploaded_file:
    with st.spinner("Processing file..."):
        text = parse_xlsx(uploaded_file)
        docs = split_text_to_docs(text)
        index = create_faiss_index(docs)
    st.success("✅ File processed! Ask a question.")

    user_question = st.text_input("Ask a question about the file:")

    if user_question:
        with st.spinner("Thinking..."):
            top_k_docs = index.similarity_search(user_question, k=4)
            answer = query_llm(user_question, top_k_docs)
            st.session_state.chat_history.append((user_question, answer))

        st.markdown("### 🤖 Answer:")
        st.write(answer)

    if st.session_state.chat_history:
        st.markdown("### 💬 Chat History")
        for i, (q, a) in enumerate(st.session_state.chat_history, 1):
            st.markdown(f"**Q{i}:** {q}")
            st.markdown(f"**A{i}:** {a}")
