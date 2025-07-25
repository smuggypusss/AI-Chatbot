import React from 'react';
import swissDesignedLogo from '../assets/Swiss_Designed_White.png';

export default function Footer() {
  return (
    <footer className="w-full bg-[#222c36] justify-end items-center py-4 px-8 mt-8 hidden md:flex">
      <img src={swissDesignedLogo} alt="Swiss Designed" style={{ height: 48 }} />
    </footer>
  );
} 