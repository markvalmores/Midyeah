/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Sparkles, ArrowRight, ShieldCheck, PlayCircle, ToggleRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface OnboardingProps {
  onComplete: () => void;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0);

  const slides = [
    {
      title: "Welcome to MidYeah! 💜☕",
      subtitle: "Created by Mark David Valmores",
      icon: "🐰",
      text: "MidYeah is your joyful online video streaming and live broadcasting shelter. Enjoy secure, strict safe guidelines to ensure every watcher is happy and comfortable!",
      actionText: "Let's Get Started"
    },
    {
      title: "Double the Power, Dual Modes! 🎭",
      subtitle: "Creator Vs Watcher Mode",
      icon: "💎",
      text: "Toggle Dual Modes instantly. Use Watcher Mode to browse uploaded videos, play five arcade games while watching, create watch rooms with friend video chats, and play online radio. Toggle Creator Mode to upload unlimited MP4s, stream with OBS RTMP, and track partnership payouts!",
      actionText: "Next Module"
    },
    {
      title: "God Bless Your Journey! ✨📖",
      subtitle: "The Creator Partnership Goal",
      icon: "🌟",
      text: "Ready to monetise? Reach 777 subscribers, 340 watch hours, and 3400 total likes to achieve Partnership! You'll secure GCash & PayPal withdrew credentials. And please subscribe to the owners YouTube channel: https://www.youtube.com/@UsagyuunVtuber!",
      actionText: "Enjoy MidYeah Now"
    }
  ];

  const handleNext = () => {
    if (step < slides.length - 1) {
      setStep(step + 1);
    } else {
      onComplete();
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0c0a0f]/95 z-50 flex items-center justify-center p-4 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#120e1a] border-2 border-purple-500 rounded-3xl max-w-md w-full p-6 text-center shadow-2xl relative overflow-hidden"
      >
        {/* Background glow flares */}
        <div className="absolute top-0 left-1/4 w-32 h-32 bg-purple-600/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-32 h-32 bg-indigo-600/10 rounded-full blur-2xl pointer-events-none" />

        <div className="text-5xl mb-4 animate-bounce select-none">
          {slides[step].icon}
        </div>

        <h2 className="text-xl font-extrabold text-white tracking-wide">
          {slides[step].title}
        </h2>
        
        <p className="text-[10px] uppercase tracking-widest text-purple-400 font-bold mt-1">
          {slides[step].subtitle}
        </p>

        <p className="text-xs text-gray-300 mt-4 leading-relaxed px-2">
          {slides[step].text}
        </p>

        {/* Progress dots */}
        <div className="flex gap-2 justify-center mt-6">
          {slides.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${i === step ? "w-6 bg-purple-500" : "w-1.5 bg-gray-700"}`}
            />
          ))}
        </div>

        <button
          onClick={handleNext}
          className="mt-6 w-full bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-1 cursor-pointer shadow transition"
          id={`onboarding-next-btn-${step}`}
        >
          <span>{slides[step].actionText}</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        <div className="mt-4 flex items-center justify-center gap-1 text-[10px] text-gray-400 select-none">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Strict Guard Guidelines Active • God Bless you</span>
        </div>
      </motion.div>
    </div>
  );
}
