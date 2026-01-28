
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const ClockWidget: React.FC = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const hours = time.getHours();
  const minutes = time.getMinutes().toString().padStart(2, '0');
  
  // Format: "Dienstag, 14. Februar"
  const dateStr = time.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });

  // Get greeting
  let greeting = "Guten Morgen";
  if (hours >= 12) greeting = "Guten Tag";
  if (hours >= 18) greeting = "Guten Abend";
  if (hours >= 22 || hours < 5) greeting = "Gute Nacht";

  return (
    <div className="flex flex-col items-center justify-center py-6">
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center"
      >
        <div className="text-sm font-medium text-indigo-200 uppercase tracking-widest mb-1 opacity-80">
            {dateStr}
        </div>
        <div className="text-7xl font-thin tracking-tighter text-white drop-shadow-lg flex items-baseline relative">
            <span className="font-bold">{hours}</span>
            <span className="animate-[pulse_2s_infinite] mx-1 opacity-50">:</span>
            <span className="font-thin">{minutes}</span>
        </div>
        <div className="text-sm text-white/50 font-medium mt-2 flex items-center gap-2">
            <span>{greeting}</span>
        </div>
      </motion.div>
    </div>
  );
};

export default ClockWidget;
