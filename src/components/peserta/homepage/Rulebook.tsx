import React from 'react';
import { Download } from 'lucide-react';

export default function Rulebook() {
  return (
    <section id="rulebook" className="bg-[#0c1015] py-12">
      <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-center gap-8">
        <h2 className="text-2xl md:text-3xl font-bold text-center sm:text-left text-gray-100 uppercase tracking-wider">
          Download Our Rulebook!
        </h2>
        <a
          href="/rulebook/PERATURAN PESERTA UKM CATUR.pdf"
          download="UKM_CHESS_RULEBOOK.pdf"
          className="inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-full text-gray-900 bg-yellow-400 hover:bg-yellow-500 transition-colors duration-300 focus:outline-none ring-2 ring-yellow-400 ring-offset-4 ring-offset-[#0c1015] focus:ring-2 focus:ring-offset-2 focus:ring-yellow-400"
        >
          <Download className="w-5 h-5 mr-3" />
          <span>Download</span>
        </a>
      </div>
    </section>
  );
}