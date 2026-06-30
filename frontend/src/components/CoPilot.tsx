"use client";

import { MessageSquare, X } from "lucide-react";
import { useState } from "react";

export default function CoPilot() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen ? (
        <div className="bg-panel border border-border-subtle w-80 shadow-lg flex flex-col h-96">
          <div className="bg-forensic-blue text-white p-3 flex justify-between items-center">
            <h3 className="font-display font-semibold text-sm">Officer Co-Pilot (AI)</h3>
            <button onClick={() => setIsOpen(false)} className="hover:text-critical transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 p-4 overflow-y-auto text-sm text-forensic-blue/80 bg-canvas">
            <p className="bg-panel border border-border-subtle p-2 mb-2 rounded-sm inline-block">
              Hello Officer. How can I assist you with the current investigation?
            </p>
          </div>
          <div className="p-3 border-t border-border-subtle bg-panel">
            <input 
              type="text" 
              placeholder="Ask about the evidence..." 
              className="w-full bg-canvas border border-border-subtle px-3 py-2 text-sm focus:outline-none focus:border-forensic-blue/50"
            />
          </div>
        </div>
      ) : (
        <button 
          onClick={() => setIsOpen(true)}
          className="bg-forensic-blue hover:bg-forensic-blue/90 text-white p-4 rounded-full shadow-lg border border-border-subtle transition-transform hover:scale-105"
        >
          <MessageSquare className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}
