import streamlit as st
import requests
import json
from chat_history_files import get_history_key, save_history_to_s3

st.set_page_config(page_title="ResQ AI - Login", page_icon="❤️", layout="centered")

st.title("🔐 ResQ AI Login")
st.markdown("Emergency Care Intelligence System")

# Optional role override (will be inferred from API response)
role = st.selectbox("Select User Type", ["Basic", "Admin"])
username = st.text_input("Email")
password = st.text_input("Password", type="password")

if "auth_success" not in st.session_state:
    st.session_state.auth_success = False

# -- Real login API function (as shown above) --
def authenticate_user(email, password):
    url = "https://devswissapi.alleshealth.com/auth/login"

    payload = json.dumps({
        "Email": email,
        "Password": password,
        "LoginType": "0"
    })

    headers = {
        "Content-Type": "application/json"
    }

    try:
        response = requests.post(url, headers=headers, data=payload)
        if response.status_code == 200:
            data = response.json()
            if "AccessToken" in data:
                return {
                    "access_token": data["AccessToken"],
                    "email": data["user"]["Email"],
                    "role": "Admin" if str(data["user"].get("UserType")) == "1" else "Basic",
                    "name": data["user"]["Name"]
                }
        return None
    except Exception as e:
        print(f"Login failed: {e}")
        return None

# -- Login logic --
if st.button("Login"):
    if username and password:
        auth_result = authenticate_user(username, password)
        if auth_result:
            st.session_state["logged_in"] = True
            st.session_state["username"] = auth_result["email"]
            st.session_state["role"] = auth_result["role"]
            st.session_state["name"] = auth_result["name"]
            st.session_state.auth_success = True
            # Ensure chat history file exists in S3
            if not get_history_key(auth_result["email"]):
                save_history_to_s3(auth_result["email"], [])  # Create empty chat history

            st.rerun()
        else:
            st.error("Invalid credentials. Please try again.")
    else:
        st.error("Please enter both email and password.")


# Redirect
if st.session_state.auth_success:
    st.switch_page("pages/App.py")
