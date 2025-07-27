import React, { useState, useRef, useEffect } from "react";
import { Input, Button, List, Avatar, Typography, Divider, Spin } from "antd";
import { useTranslation } from 'react-i18next';
import robotImg from "../assets/robot.png";
const { TextArea } = Input;

export default function ChatArea({ clearChatFlag, convoId, email, onNewChat }) {
  const { t } = useTranslation();
  const initialMessages = [
    {
      role: "assistant",
      content:
        t("Hello! I'm ResQ AI, your emergency care assistant. I can analyze your uploaded hospital files and provide guidance on protocols, drug calculations, medical references, and emergency procedures. Upload files in the Files tab and ask me questions based on your hospital's specific protocols."),
      time: new Date().toLocaleTimeString(),
    },
  ];
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingConvo, setLoadingConvo] = useState(false);
  const messagesEndRef = useRef(null);
  const [followUp, setFollowUp] = useState("");
  const [sources, setSources] = useState([]);
  
  // ✅ FIXED: Use environment variable for the API URL
  const API_URL = "https://ai-chatbot-production-2636.up.railway.app";

  // Load messages for selected conversation
  useEffect(() => {
    if (!convoId || !email) {
      setMessages(initialMessages);
      setFollowUp("");
      setSources([]);
      return;
    }
    setLoadingConvo(true);
    
    // ✅ FIXED: Use API_URL variable to fetch conversation
    fetch(`${API_URL}/conversation/${convoId}?email=${encodeURIComponent(email)}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.messages && Array.isArray(data.messages) && data.messages.length > 0) {
          const flatMessages = [];
          data.messages.forEach(m => {
            if (m.user) {
              flatMessages.push({ role: "user", content: m.user, time: new Date().toLocaleTimeString() });
            }
            if (m.ai) {
              flatMessages.push({ role: "assistant", content: m.ai, time: new Date().toLocaleTimeString() });
            }
          });
          setMessages(flatMessages);
        } else {
          setMessages(initialMessages);
        }
        setFollowUp("");
        setSources([]);
        setLoadingConvo(false);
      })
      .catch(() => {
        setMessages(initialMessages);
        setFollowUp("");
        setSources([]);
        setLoadingConvo(false);
      });
    // eslint-disable-next-line
  }, [convoId, clearChatFlag, email]);

  // Scroll to bottom when new message is added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim() || !convoId) return;
    const userMsg = {
      role: "user",
      content: input,
      time: new Date().toLocaleTimeString(),
    };
    setMessages((msgs) => [...msgs, userMsg]);
    setInput("");
    setLoading(true);
    setFollowUp("");
    setSources([]);

    // ✅ FIXED: Use API_URL variable and add the correct "/chat" endpoint
    fetch(`${API_URL}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_input: input,
        email,
        convo_id: convoId,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        setMessages((msgs) => [
          ...msgs,
          {
            role: "assistant",
            content: data.answer || "No response from AI.",
            time: new Date().toLocaleTimeString(),
          },
        ]);
        setFollowUp(data.follow_up || "");
        setSources(Array.isArray(data.sources) ? data.sources : []);
        setLoading(false);
      })
      .catch(() => {
        setMessages((msgs) => [
          ...msgs,
          {
            role: "assistant",
            content: "Error: Could not connect to backend.",
            time: new Date().toLocaleTimeString(),
          },
        ]);
        setFollowUp("");
        setSources([]);
        setLoading(false);
      });
  };

  const handleInputFocus = async () => {
    if (!convoId && onNewChat) {
      await onNewChat();
    }
  };

  // ... (rest of your JSX code is fine, no changes needed there)
  return (
    <div className="flex flex-col h-[70vh] md:h-[calc(100vh-200px)]">
      <Typography.Title
        level={4}
        style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}
      >
        <Avatar src={robotImg} size={48} />
        {t("ResQ AI Assistant")}
      </Typography.Title>
      <div className="flex-1 overflow-y-auto mb-2">
        {loadingConvo ? (
          <div style={{ textAlign: "center", marginTop: 40 }}>
            <Spin />
          </div>
        ) : (
          <List
            dataSource={messages}
            renderItem={(msg, idx) => {
              const isLastAssistant =
                msg.role === "assistant" &&
                idx === messages.length - 1 &&
                !loading;
              return (
                <List.Item style={{ border: "none", padding: 0, display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                  <div className={`bg-white rounded-lg shadow p-3 mb-2 max-w-[90%] ${msg.role === "user" ? "ml-auto" : "mr-auto"}`} style={{ minWidth: 120 }}>
                    {msg.role === "assistant" ? (
                      <div style={{ display: "flex", alignItems: "flex-start" }}>
                        <Avatar src={robotImg} style={{ background: "#faad14", marginRight: 8 }} />
                        <div>
                          <div style={{ fontWeight: 500, color: "#d4380d" }}>ResQ AI <span style={{ fontSize: 12, color: "#888" }}>{msg.time}</span></div>
                          <div>{msg.content}</div>
                          {isLastAssistant && (
                            <>
                              {sources.length > 0 && (
                                <div className="mt-2">
                                  {sources.map((src, i) => (
                                    <div key={i} className="mb-1 text-xs">
                                      <a
                                        href={src.link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 underline mr-2"
                                      >
                                      </a>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {followUp && (
                                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                                  <b>{t('Follow-up suggestion')}:</b> {followUp}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "flex-end" }}>
                        <div style={{ textAlign: "right", marginRight: 8 }}>
                          <div style={{ fontWeight: 500 }}>You <span style={{ fontSize: 12, color: "#888" }}>{msg.time}</span></div>
                          <div>{msg.content}</div>
                        </div>
                        <Avatar style={{ background: "#1890ff", marginLeft: 8 }}>U</Avatar>
                      </div>
                    )}
                  </div>
                </List.Item>
              );
            }}
          />
        )}
        <div ref={messagesEndRef} />
      </div>
      <Divider style={{ margin: "12px 0" }} />
      <div className="bg-white rounded-lg shadow p-2 flex gap-2 items-end">
        <TextArea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onFocus={handleInputFocus}
          onPressEnter={e => {
            if (!e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          placeholder={t("Ask about your uploaded protocols, drug dosages, procedures...")}
          autoSize={{ minRows: 1, maxRows: 4 }}
          disabled={loading}
          className="!h-10 flex-1"
          style={{ resize: "none" }}
        />
        <Button
          type="primary"
          onClick={sendMessage}
          loading={loading}
          style={{ height: 40, minWidth: 80, padding: "0 16px" }}
          disabled={!convoId}
        >
          {t("Send")}
        </Button>
      </div>
    </div>
  );
}
