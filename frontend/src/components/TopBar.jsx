import React from 'react';
import { HeartFilled, WarningFilled, MenuOutlined, UserOutlined, LogoutOutlined, MoreOutlined, GlobalOutlined } from '@ant-design/icons';
import { Dropdown, Menu, Avatar, Select } from 'antd';
import { useTranslation } from 'react-i18next';
import allesHealthLogo from '../assets/hospital_logo.png';
import allesLogo from '../assets/AH Favicon Logo Transparent.png';
import usFlag from '../assets/us.png';
import deFlag from '../assets/de.png';

const MOBILE_TABS = [
  { key: 'ai-assistant', label: 'AI Assistant' },
  { key: 'protocols', label: 'Protocols' },
];

export const TopBar = ({ onMenuClick, onMobileNav }) => {
  const user = JSON.parse(localStorage.getItem("user"));
  const name = user?.name || "User";
  const email = user?.email || "Unknown User";
  const { t, i18n } = useTranslation();

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  const menu = (
    <Menu>
      <Menu.Item key="user" disabled style={{ cursor: 'default', background: '#f5f5f5' }}>
        <div style={{ fontWeight: 600 }}>{name}</div>
        <div style={{ fontSize: 12, color: '#888' }}>{email}</div>
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item key="logout" icon={<LogoutOutlined />} onClick={handleLogout}>
        {t('Log out')}
      </Menu.Item>
    </Menu>
  );

  const mobileNavMenu = (
    <Menu onClick={({ key }) => onMobileNav && onMobileNav(key)}>
      {MOBILE_TABS.map(tab => (
        <Menu.Item key={tab.key}>{t(tab.label)}</Menu.Item>
      ))}
    </Menu>
  );

  return (
    <header className="bg-white shadow-sm p-3 px-4 md:px-6 w-full font-sans relative">
      {/* Minimal Mobile TopBar */}
      <div className="flex items-center justify-between md:hidden">
        {/* Hamburger menu for mobile */}
        {onMenuClick && (
          <button
            className="text-2xl text-slate-700 focus:outline-none"
            onClick={onMenuClick}
            aria-label="Open sidebar menu"
          >
            <MenuOutlined />
          </button>
        )}
        {/* Centered Alles Health logo */}
        <img src={allesLogo} alt="Alles Health" className="h-7 mx-auto" style={{ flex: 1, objectFit: 'contain', maxWidth: 110 }} />
        {/* User icon and dropdown */}
        <Dropdown overlay={menu} placement="bottomRight" trigger={["click"]}>
          <div className="flex items-center cursor-pointer select-none ml-2">
            <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1677ff' }} />
            <span className="ml-2 font-medium text-gray-700">{name}</span>
          </div>
        </Dropdown>
      </div>
      {/* Full TopBar for desktop */}
      <div className="hidden md:flex justify-between items-center w-full">
        <div className="flex items-center">
          <img src={allesHealthLogo} alt="Hospital Logo" style={{ height: 36, marginRight: 12 }} />
          <img src={allesLogo} alt="Alles Health" style={{ height: 40, marginRight: 18 }} />
          <div>
            <h1 className="text-xl font-bold text-gray-800">ResQ AI</h1>
            <p className="text-sm text-gray-500">{t('Emergency Services AI Agent for Bülach Hospital')}</p>
          </div>
        </div>
        <div className="flex items-center space-x-6">
          <Dropdown overlay={mobileNavMenu} trigger={["click"]} placement="bottomRight">
            <button className="text-2xl text-slate-700 focus:outline-none md:hidden" aria-label="Open navigation menu">
              <MoreOutlined />
            </button>
          </Dropdown>
          <Select
            value={i18n.language}
            onChange={lng => i18n.changeLanguage(lng)}
            style={{ width: 110 }}
            size="small"
            suffixIcon={<GlobalOutlined />}
            options={[
              { value: 'en', label: <span><img src={usFlag} alt="English" style={{ width: 20, height: 14, marginRight: 6, display: 'inline-block', verticalAlign: 'middle' }} />EN</span> },
              { value: 'de', label: <span><img src={deFlag} alt="German" style={{ width: 20, height: 14, marginRight: 6, display: 'inline-block', verticalAlign: 'middle' }} />DE</span> },
            ]}
          />

   
          <Dropdown overlay={menu} placement="bottomRight" trigger={["click"]}>
            <div className="flex items-center cursor-pointer select-none">
              <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1677ff', marginRight: 8 }} />
              <span className="font-medium text-gray-700">{name}</span>
            </div>
          </Dropdown>
        </div>
      </div>
    </header>
  );
};

export const EmergencyProtocolBanner = ({ message, subtext }) => {
  const { t } = useTranslation();
  return (
    <div className="bg-red-50 border-l-4 border-red-500 p-4 mx-6 rounded-r-lg shadow-sm">
      <div className="flex items-center">
        <WarningFilled className="text-red-500 text-2xl mr-4" />
        <div>
          <p className="font-bold text-red-800">{message || t('Emergency Protocol Active')}</p>
          <p className="text-sm text-red-700">{subtext || t('Mass casualty protocols are currently enabled')}</p>
        </div>
      </div>
    </div>
  );
};