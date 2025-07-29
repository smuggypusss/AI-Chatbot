import React, { useState, useEffect } from "react";
import { Button, Divider, Tooltip, List } from "antd";
import { MenuFoldOutlined, MenuUnfoldOutlined, PlusOutlined, DeleteOutlined, MessageOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import allesHealthLogo from '../assets/Alles Health.png';
import swissDesignedLogo from '../assets/Swiss_Designed_White.png';
import hospitalLogo from '../assets/hospital_logo.png';

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < breakpoint);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [breakpoint]);
  return isMobile;
}

// The Sidebar now takes 'isOpen' and 'onClose' props to be controlled by the parent component on mobile.
export default function Sidebar({
  conversations = [],
  selectedConvoId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  onClearAllChats,
  forceExpanded = false,
  collapsed = false,
  onToggleCollapsed,
}) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [internalCollapsed, setInternalCollapsed] = useState(isMobile);

  // Use external collapsed state if provided, otherwise use internal state
  const isCollapsed = onToggleCollapsed ? collapsed : internalCollapsed;
  const toggleCollapsed = onToggleCollapsed ? onToggleCollapsed : () => setInternalCollapsed(c => !c);

  useEffect(() => {
    if (!isMobile && !forceExpanded) setInternalCollapsed(false); // Always expanded on desktop
  }, [isMobile, forceExpanded]);

  useEffect(() => {
    if (forceExpanded) setInternalCollapsed(false);
  }, [forceExpanded]);

  return (
    <div
      style={{
        width: isCollapsed ? 60 : 260,
        background: "#fff",
        padding: isCollapsed ? "16px 8px" : 24,
        borderRadius: 12,
        minHeight: 340,
        boxShadow: "0 2px 12px #f0f1f2",
        transition: "width 0.2s cubic-bezier(.4,0,.2,1)",
        display: "flex",
        flexDirection: "column",
        alignItems: isCollapsed ? "center" : "flex-start",
        position: "relative",
        height: '100%',
        justifyContent: 'space-between',
      }}
    >
      <div style={{ width: '100%' }}>
        {/* Collapse/Expand button - always visible */}
        <Button
          type="text"
          icon={isCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          onClick={toggleCollapsed}
          style={{ 
            position: "absolute", 
            top: 12, 
            right: 12, 
            fontSize: 16,
            zIndex: 10,
            background: 'rgba(255,255,255,0.9)',
            border: '1px solid #f0f0f0'
          }}
        />
        {!isCollapsed && (
          <div style={{ marginTop: 0, width: "100%", textAlign: "left" }}>
            {/* New Chat Button */}
            <Button
              type="primary"
              icon={<PlusOutlined />}
              block
              style={{ marginBottom: 16 }}
              onClick={onNewChat}
            >
              New Chat
            </Button>
            {/* Conversation List */}
            <div style={{ flex: 1, overflowY: "auto", width: "100%" }}>
              <List
                size="small"
                dataSource={conversations}
                renderItem={item => (
                  <List.Item
                    style={{
                      background: item.id === selectedConvoId ? "#e6f4ff" : "transparent",
                      borderRadius: 6,
                      marginBottom: 4,
                      padding: "6px 8px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      border: item.id === selectedConvoId ? "1px solid #1677ff" : "1px solid transparent",
                    }}
                    onClick={() => onSelectChat(item.id)}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <MessageOutlined style={{ color: "#1677ff" }} />
                      <span style={{ fontWeight: 500, maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {item.title || "New Chat"}
                      </span>
                    </div>
                    <Tooltip title="Delete chat">
                      <Button
                        type="text"
                        icon={<DeleteOutlined style={{ color: "#ff4d4f" }} />}
                        size="small"
                        onClick={e => {
                          e.stopPropagation();
                          onDeleteChat(item.id);
                        }}
                      />
                    </Tooltip>
                  </List.Item>
                )}
              />
            </div>
            {/* Clear All Chats Button */}
            {conversations.length > 0 && (
              <Button danger block onClick={onClearAllChats} style={{ marginTop: 16, fontWeight: 500 }}>
                🧹 Clear All Chats
              </Button>
            )}
          </div>
        )}
      </div>
      {/* Logos at the bottom on mobile only, and only render if isMobile */}
      {isMobile && (
        <div className="w-full flex-col items-center gap-2 pt-4" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <img src={allesHealthLogo} alt="Alles Health" style={{ height: 50, marginBottom: 8 }} />
          <img src={swissDesignedLogo} alt="Swiss Designed" style={{ height: 60 }} />
        </div>
      )}
      {/* Logo at the bottom for desktop, responsive to collapsed state */}
      {!isMobile && (
        <div className="w-full flex-col items-center gap-2 pt-4" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          {isCollapsed ? (
            <Tooltip title="Hospital Logo">
              <img src={hospitalLogo} alt="Hospital Logo" style={{ height: 32, width: 32, objectFit: 'contain', marginBottom: 8 }} />
            </Tooltip>
          ) : (
            <img src={hospitalLogo} alt="Hospital Logo" style={{ height: 50, marginBottom: 8 }} />
          )}
        </div>
      )}
    </div>
  );
}
