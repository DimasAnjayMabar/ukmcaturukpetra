import React from 'react';
import { Instagram, MessageSquare } from 'lucide-react';

export default function Footer() {
  return (
    <footer>
      <div className="bg-gradient-to-l from-[#47618a] via-[#E3E1DA] to-[#47618a]">
        <div className="container mx-auto px-4 py-10">
          <div className="grid grid-cols-1 items-center gap-8 text-center md:grid-cols-[1fr_auto_1fr] md:gap-12 md:text-left">
            
            <div className="flex justify-center md:justify-end">
              <a href="/" className="flex items-center gap-4 group">
                <img
                  src="/svg/chess logo.svg"
                  alt="UKM Chess Logo"
                  className="h-12 w-auto transition-transform duration-300 group-hover:scale-110"
                />
                <span className="text-3xl lg:text-4xl font-bold text-[#0f1028] uppercase tracking-wider">
                  UKM Catur
                </span>
              </a>
            </div>

            <div className="hidden md:block">
              <div className="h-24 w-px bg-gradient-to-b from-transparent via-gray-500/30 to-transparent"></div>
            </div>
            <div className="md:hidden">
              <div className="mx-auto h-px w-1/2 bg-gradient-to-r from-transparent via-gray-500/30 to-transparent"></div>
            </div>

            <div className="flex justify-center md:justify-start">
              <div className="flex flex-col items-center gap-4 font-semibold md:items-start">
                <a
                  href="https://www.instagram.com/ukmcaturukpetra?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw=="
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-3 text-gray-700 hover:text-black transition-colors"
                >
                  <Instagram className="w-5 h-5 transition-transform group-hover:scale-110" />
                  <span>@ukmcaturukpetra</span>
                </a>
                <a
                  href="https://line.me/R/ti/p/@590yfbcf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-3 text-gray-700 hover:text-black transition-colors"
                >
                  <MessageSquare className="w-5 h-5 transition-transform group-hover:scale-110" />
                  <span>@590yfbcf</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#0c1015]">
         <div className="container mx-auto px-4">
            <div className="text-center text-gray-500 text-sm py-6">
              © {new Date().getFullYear()} UKM Catur. All Rights Reserved.
            </div>
         </div>
      </div>
    </footer>
  );
}