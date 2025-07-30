import React, { useState, useEffect } from "react";
import { TopBar, EmergencyProtocolBanner } from "../components/TopBar";
import NavTabs from "../components/NavTabs";
import ChatArea from "../components/ChatArea";
import Sidebar from "../components/Sidebar";
import { Drawer } from "antd";
import Footer from "../components/Footer";

const API_URL = "https://ai-chatbot-production-dbae.up.railway.app";

const TABS = [
  "ai-assistant",
  "protocols",
  "drug-calc",
  "triage",
  "med-search",
  "files"
];

export default function MainDashboard() {
  const [conversations, setConversations] = useState([]);
  const [selectedConvoId, setSelectedConvoId] = useState(null);
  const [clearChatFlag, setClearChatFlag] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState(TABS[0]);
  const user = JSON.parse(localStorage.getItem("user"));
  const email = user?.email;

  // Fetch conversations
  const fetchConversations = async () => {
    if (!email) return;
    let data = await (await fetch(`${API_URL}/conversations?email=${encodeURIComponent(email)}`)).json();
    if (!Array.isArray(data)) data = [];
    setConversations(data);
    // Auto-select first if none selected
    if (data.length && !selectedConvoId) setSelectedConvoId(data[data.length - 1].id);
    if (!data.length) setSelectedConvoId(null);
  };

  useEffect(() => {
    fetchConversations();
    // eslint-disable-next-line
  }, []);

  // New Chat
  const handleNewChat = async () => {
    if (!email) return;
    const res = await fetch(`${API_URL}/new_conversation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    setSelectedConvoId(data.id);
    fetchConversations();
    setClearChatFlag((f) => !f); // Reset chat area
    setSidebarOpen(false); // Close drawer on new chat
  };

  // Select Chat
  const handleSelectChat = (id) => {
    setSelectedConvoId(id);
    setClearChatFlag((f) => !f); // Reset chat area to selected convo
    setSidebarOpen(false); // Close drawer on select
  };

  // Delete Chat
  const handleDeleteChat = async (id) => {
    if (!email) return;
    await fetch(`${API_URL}/conversation/${id}?email=${encodeURIComponent(email)}`, {
      method: "DELETE",
    });
    fetchConversations();
    // If deleted convo was selected, select another
    if (selectedConvoId === id) {
      setSelectedConvoId(null);
      setClearChatFlag((f) => !f);
    }
  };

  // Clear all chats
  const handleClearAllChats = async () => {
    if (!email) return;
    await fetch(`${API_URL}/clear_history`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    fetchConversations();
    setSelectedConvoId(null);
    setClearChatFlag((f) => !f);
  };

  // Handle tab change
  const handleTabChange = (key) => {
    setActiveTab(key);
    setSidebarOpen(false);
  };

  // Handle message sent to refresh conversations
  const handleMessageSent = () => {
    fetchConversations();
  };

  return (
    <div className="bg-[#f5f7fa] min-h-screen w-full flex flex-col">
      <TopBar onMenuClick={activeTab === "ai-assistant" ? () => setSidebarOpen(true) : undefined} onMobileNav={handleTabChange} />
      {/* Optionally add <EmergencyProtocolBanner /> here */}
      {/* Sidebar Drawer only for AI Assistant tab on mobile */}
      <Drawer
        title={null}
        placement="left"
        closable={false}
        onClose={() => setSidebarOpen(false)}
        open={sidebarOpen && activeTab === "ai-assistant"}
        width={260}
        bodyStyle={{ padding: 0 }}
        className="md:hidden"
      >
        <Sidebar
          conversations={conversations}
          selectedConvoId={selectedConvoId}
          onSelectChat={handleSelectChat}
          onNewChat={handleNewChat}
          onDeleteChat={handleDeleteChat}
          onClearAllChats={handleClearAllChats}
          forceExpanded={true}
        />
      </Drawer>
      <div
        className="w-full mt-4 px-2 md:px-6 flex-1"
        style={{ minHeight: "calc(100vh - 80px)" }}
      >
        <NavTabs activeKey={activeTab} onChange={handleTabChange} className="hidden md:block" />
        {activeTab === "ai-assistant" ? (
          <div className="bg-white rounded-lg mt-4 p-2 md:p-6 min-h-[400px] flex flex-col md:flex-row gap-4 md:gap-6">
            {/* Sidebar (desktop only) */}
            <div className="hidden md:block flex-shrink-0" style={{ width: sidebarCollapsed ? 60 : 260 }}>
              <Sidebar
                conversations={conversations}
                selectedConvoId={selectedConvoId}
                onSelectChat={handleSelectChat}
                onNewChat={handleNewChat}
                onDeleteChat={handleDeleteChat}
                onClearAllChats={handleClearAllChats}
                collapsed={sidebarCollapsed}
                onToggleCollapsed={() => setSidebarCollapsed(!sidebarCollapsed)}
              />
            </div>
            {/* Chat area always visible */}
            <div className="flex-1 w-full">
              <ChatArea
                clearChatFlag={clearChatFlag}
                convoId={selectedConvoId}
                email={email}
                onNewChat={handleNewChat}
                onMessageSent={handleMessageSent}
              />
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg mt-4 p-2 md:p-6 min-h-[400px]">
            <div className="text-center text-gray-400 py-20">This page is under construction.</div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
