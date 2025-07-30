import React from "react";
import { Tabs } from "antd";
import { useTranslation } from "react-i18next"; // 1. Import the hook
import {
  RobotOutlined,
  FileTextOutlined,
  CalculatorOutlined,
  UserSwitchOutlined,
  SearchOutlined,
  FolderOpenOutlined,
} from "@ant-design/icons";
import "../index.css";

export default function NavTabs({ activeKey, onChange, className }) {
  const { t } = useTranslation(); // 2. Initialize the t function

  // 3. Move the tabItems array inside the component to access 't'
  const tabItems = [
    {
      key: "ai-assistant",
      label: (
        <span>
          <RobotOutlined /> {t("AI Assistant")} {/* 4. Use t() for translation */}
        </span>
      ),
    },
    {
      key: "protocols",
      label: (
        <span>
          <FileTextOutlined /> {t("Protocols")}
        </span>
      ),
    },
    {
      key: "files",
      label: (
        <span>
          <FolderOpenOutlined /> {t("Files")}
        </span>
      ),
    },
  ];

  return (
    <div className={className}>
      <Tabs
        className="custom-tabs"
        activeKey={activeKey}
        onChange={onChange}
        items={tabItems}
        tabBarGutter={32}
      />
    </div>
  );
}