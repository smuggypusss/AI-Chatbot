import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      'AI Assistant': 'AI Assistant',
      'Protocols': 'Protocols',
      'Drug Calc': 'Drug Calc',
      'Triage': 'Triage',
      'Med Search': 'Med Search',
      'Files': 'Files',
      'New Chat': 'New Chat',
      'Clear All Chats': 'Clear All Chats',
      'Ask about your uploaded protocols, drug dosages, procedures...': 'Ask about your uploaded protocols, drug dosages, procedures...',
      'Send': 'Send',
      'Login': 'Login',
      'Email': 'Email',
      'Password': 'Password',
      'ResQ AI Assistant': 'ResQ AI Assistant',
      'System Online': 'System Online',
      '3 Active Cases': '3 Active Cases',
      'Emergency Department': 'Emergency Department',
      'Emergency Protocol Active': 'Emergency Protocol Active',
      'Mass casualty protocols are currently enabled': 'Mass casualty protocols are currently enabled',
      'Log out': 'Log out',
      'This page is under construction.': 'This page is under construction.',
      'AI Assistant': 'AI Assistant',
      'Protocols': 'Protocols',
      'Drug Calc': 'Drug Calc',
      'Triage': 'Triage',
      'Med Search': 'Med Search',
      'Files': 'Files',
      'New Chat': 'New Chat',
      'Clear All Chats': 'Clear All Chats',
    }
  },
  de: {
    translation: {
      'ResQ AI': 'ResQ KI',
'Emergency Services AI Agent for Bülach Hospital': 'KI-Agent für den Rettungsdienst des Spitals Bülach',
      'AI Assistant': 'KI-Assistent',
      'Protocols': 'Protokolle',
      'Drug Calc': 'Arzneimittelrechner',
      'Triage': 'Triage',
      'Med Search': 'Medizinische Suche',
      'Files': 'Dateien',
      'New Chat': 'Neuer Chat',
      'Clear All Chats': 'Alle Chats löschen',
      'Ask about your uploaded protocols, drug dosages, procedures...': 'Fragen Sie nach Ihren hochgeladenen Protokollen, Dosierungen, Verfahren...',
      'Send': 'Senden',
      'Login': 'Anmelden',
      'Email': 'E-Mail',
      'Password': 'Passwort',
      'ResQ AI Assistant': 'ResQ KI-Assistent',
      'System Online': 'System Online',
      '3 Active Cases': '3 aktive Fälle',
      'Emergency Department': 'Notaufnahme',
      'Emergency Protocol Active': 'Notfallprotokoll aktiv',
      'Mass casualty protocols are currently enabled': 'Massenunfallprotokolle sind derzeit aktiviert',
      'Log out': 'Abmelden',
      'This page is under construction.': 'Diese Seite befindet sich im Aufbau.'
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n; 