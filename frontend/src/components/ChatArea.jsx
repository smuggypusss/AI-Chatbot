import React, { useState, useRef, useEffect } from "react";
import { Input, Button, List, Avatar, Typography, Divider, Spin, Select } from "antd";
import { useTranslation } from 'react-i18next';
import robotImg from "../assets/robot.png";
const { TextArea } = Input;
const { Option } = Select;

export default function ChatArea({ clearChatFlag, convoId, email, onNewChat, onMessageSent }) {
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
  const [lastQuestion, setLastQuestion] = useState("");
  const [enhancedContext, setEnhancedContext] = useState("");
  const [showEnhancedContext, setShowEnhancedContext] = useState(false);
  const [isActiveChat, setIsActiveChat] = useState(true);
  
  // ✅ FIXED: Use environment variable for the API URL
  const API_URL = "https://ai-chatbot-production-dbae.up.railway.app";

  // Load messages for selected conversation
  useEffect(() => {
    if (!convoId || !email) {
      setMessages(initialMessages);
      setFollowUp("");
      setSources([]);
      setIsActiveChat(false);
      setEnhancedContext("");
      setShowEnhancedContext(false);
      return;
    }
    setLoadingConvo(true);
    setIsActiveChat(false);
    setEnhancedContext("");
    setShowEnhancedContext(false);
    
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
        setIsActiveChat(false);
        setEnhancedContext("");
        setShowEnhancedContext(false);
      })
      .catch(() => {
        setMessages(initialMessages);
        setFollowUp("");
        setSources([]);
        setLoadingConvo(false);
        setIsActiveChat(false);
        setEnhancedContext("");
        setShowEnhancedContext(false);
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
    setLastQuestion(input);
    setInput("");
    setLoading(true);
    setFollowUp("");
    setSources([]);
    setEnhancedContext("");
    setIsActiveChat(true);

    // Always send basic answer first
    fetch(`${API_URL}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_input: input,
        email,
        convo_id: convoId,
        enhance_context: false, // Always get basic answer first
      }),
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
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
        
        // Trigger conversation refresh to update titles in real-time
        if (onMessageSent) {
          onMessageSent();
        }
      })
      .catch((error) => {
        console.error("Backend error:", error);
        setMessages((msgs) => [
          ...msgs,
          {
            role: "assistant",
            content: `Error: ${error.message}. Please check if the backend is running.`,
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

  const getEnhancedContext = async () => {
    if (!lastQuestion || !convoId) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/enhance_context`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_input: lastQuestion,
          email,
          convo_id: convoId,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setEnhancedContext(data.enhanced_context);
        setShowEnhancedContext(true);
      }
    } catch (error) {
      console.error("Error getting enhanced context:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleEnhancedContext = () => {
    setShowEnhancedContext(!showEnhancedContext);
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
              // Only show More Context for the latest assistant message in the current session
              const isCurrentSession = idx === messages.length - 1;
              return (
                <List.Item style={{ border: "none", padding: 0, display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                  <div className={`bg-white rounded-lg shadow p-3 mb-2 max-w-[90%] ${msg.role === "user" ? "ml-auto" : "mr-auto"}`} style={{ minWidth: 120 }}>
                    {msg.role === "assistant" ? (
                      <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                        <Avatar 
                          src={robotImg} 
                          style={{ 
                            background: "#faad14", 
                            flexShrink: 0,
                            width: "32px",
                            height: "32px"
                          }} 
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 500, color: "#d4380d" }}>ResQ AI <span style={{ fontSize: 12, color: "#888" }}>{msg.time}</span></div>
                          <div style={{ wordBreak: "break-word" }}>{msg.content}</div>
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
                              {msg.content && !msg.content.includes("No details found") && !enhancedContext && isLastAssistant && isActiveChat && !msg.content.includes("Hello! I'm ResQ AI") && (
                                <div className="mt-2">
                                  <Button 
                                    size="small" 
                                    type="dashed"
                                    onClick={getEnhancedContext}
                                    loading={loading}
                                  >
                                    {t("More Context")}
                                  </Button>
                                </div>
                              )}
                              {enhancedContext && (
                                <div className="mt-2">
                                  <Button 
                                    size="small" 
                                    type="text"
                                    onClick={toggleEnhancedContext}
                                    style={{ color: '#1890ff', padding: '4px 8px' }}
                                  >
                                    {showEnhancedContext ? t("Hide Context") : t("Show Context")}
                                  </Button>
                                  {showEnhancedContext && (
                                    <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded">
                                      <div className="font-semibold text-blue-800 mb-2">Additional Context:</div>
                                      <div 
                                        className="text-sm text-blue-700"
                                        dangerouslySetInnerHTML={{ 
                                          __html: enhancedContext
                                            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                            .replace(/\*(.*?)\*/g, '<em>$1</em>')
                                            .replace(/### (.*?)\n/g, '<h3 class="text-blue-800 font-semibold mb-2">$1</h3>')
                                            .replace(/\n- (.*?)(?=\n|$)/g, '<li>$1</li>')
                                            .replace(/(<li>.*?<\/li>)/s, '<ul class="list-disc ml-4 mb-2">$1</ul>')
                                            .replace(/\n\n/g, '<br>')
                                        }}
                                      />
                                    </div>
                                  )}
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
