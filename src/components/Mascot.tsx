/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Coffee, Sparkles, X, ChevronRight, HelpCircle, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface MascotProps {
  showTutorialInitially?: boolean;
  onCloseTutorial?: () => void;
}

export default function Mascot({ showTutorialInitially = false, onCloseTutorial }: MascotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [bubbleText, setBubbleText] = useState("Hi there, I'm Midy! Welcome to MidYeah, your happy stream spot! ☕🐰");
  const [tutorialStep, setTutorialStep] = useState<number | null>(null);

  const tips = [
    "I love coffee! Remember to take healthy screen breaks and sip some warm water or coffee too! ☕",
    "Did you know? You can play games like Tetris, 2048, or Catch the Fruit while watching any video!",
    "MidYeah is a safe space. We follow strict guidelines to make sure everyone is happy and comfortable! 🛡️",
    "Are you a creator? Switch to 'Creator Mode' at the top to upload videos, start live streams, and earn tips!",
    "Wanna watch with friends? Try creating or joining a 'Public / Private Watch Room' to stream and video chat together!",
    "Accidentally closed your tab? No worries! MidYeah saves your video play offset so you can continue right where you left off!"
  ];

  useEffect(() => {
    if (showTutorialInitially) {
      setTutorialStep(0);
      setIsOpen(true);
    }
  }, [showTutorialInitially]);

  useEffect(() => {
    if (tutorialStep === null) {
      // Periodic tips
      const interval = setInterval(() => {
        const randTip = tips[Math.floor(Math.random() * tips.length)];
        setBubbleText(randTip);
      }, 15000);
      return () => clearInterval(interval);
    }
  }, [tutorialStep]);

  const tutorialSteps = [
    {
      title: "Welcome to MidYeah! 🐰✨",
      text: "I am Midy, your Purple Bunny companion! I'm here to ensure you stay joyful, safe, and comfortable. Let me show you around this amazing platform!",
      actionText: "Let's Go!"
    },
    {
      title: "Watcher & Creator Modes 🎭",
      text: "Switch modes at the top right header! Watcher Mode is for viewing movies, rental streaming, playing games, and listening to radio. Creator Mode lets you upload videos, stream live with keys, set rental prices ($3 to $100), and track your 777-subscriber Partnership goal!",
      actionText: "Next"
    },
    {
      title: "Play Games While Watching! 🎮",
      text: "Click 'Play While Watch' under any video page to play Tetris, 2048, Cups, or Catch the Fruit simultaneously! High scores are updated in real-time.",
      actionText: "Next"
    },
    {
      title: "Global Watch Rooms & Live Chat 💬",
      text: "Create watch rooms, generate invite codes, listen to online radio with live visualizers, join Discord-like community chats, or toggle 360° VR content playback smoothly!",
      actionText: "Finish!"
    }
  ];

  const handleNextTutorial = () => {
    if (tutorialStep !== null && tutorialStep < tutorialSteps.length - 1) {
      setTutorialStep(tutorialStep + 1);
    } else {
      setTutorialStep(null);
      setBubbleText("Awesome! You're ready to enjoy MidYeah. May the Lord bless your streaming journey! 💜");
      if (onCloseTutorial) onCloseTutorial();
    }
  };

  const skipTutorial = () => {
    setTutorialStep(null);
    setBubbleText("Have a wonderful experience watching and creating! ☕🐰");
    if (onCloseTutorial) onCloseTutorial();
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none">
      {/* Dialogue Bubble */}
      <AnimatePresence>
        {(isOpen || tutorialStep !== null) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="mb-3 max-w-sm bg-purple-950/95 border-2 border-purple-500 rounded-2xl p-4 shadow-xl text-white pointer-events-auto relative text-sm select-none"
          >
            {/* Close bubble */}
            {tutorialStep === null && (
              <button
                onClick={() => setIsOpen(false)}
                className="absolute top-2 right-2 text-purple-300 hover:text-white cursor-pointer"
                id="close-mascot-bubble"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {tutorialStep !== null ? (
              <div>
                <div className="flex items-center gap-2 text-purple-300 font-bold mb-1">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span>{tutorialSteps[tutorialStep].title}</span>
                </div>
                <p className="text-gray-200 mt-1 leading-relaxed text-xs">
                  {tutorialSteps[tutorialStep].text}
                </p>
                <div className="flex justify-between items-center mt-3 pt-2 border-t border-purple-800">
                  <button
                    onClick={skipTutorial}
                    className="text-xs text-purple-400 hover:text-purple-300 cursor-pointer"
                    id="skip-tutorial-btn"
                  >
                    Skip
                  </button>
                  <button
                    onClick={handleNextTutorial}
                    className="flex items-center gap-1 bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs px-2.5 py-1 rounded-lg cursor-pointer transition-colors"
                    id="next-tutorial-btn"
                  >
                    <span>{tutorialSteps[tutorialStep].actionText}</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p className="pr-4 leading-relaxed text-xs">{bubbleText}</p>
                <div className="mt-2 flex items-center justify-between text-[10px] text-purple-300">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" /> Safe Guidelines Active
                  </span>
                  <button
                    onClick={() => {
                      const randTip = tips[Math.floor(Math.random() * tips.length)];
                      setBubbleText(randTip);
                    }}
                    className="hover:underline cursor-pointer"
                    id="mascot-tip-btn"
                  >
                    Next Tip ☕
                  </button>
                </div>
              </div>
            )}
            
            {/* Bubble arrow */}
            <div className="absolute right-8 bottom-0 transform translate-y-full w-0 h-0 border-t-[8px] border-t-purple-950 border-r-[8px] border-r-transparent border-l-[8px] border-l-transparent"></div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actual Bunny Button */}
      <motion.button
        onClick={() => {
          if (tutorialStep !== null) return;
          setIsOpen(!isOpen);
          if (!isOpen) {
            const randTip = tips[Math.floor(Math.random() * tips.length)];
            setBubbleText(randTip);
          }
        }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className="pointer-events-auto flex items-center justify-center w-16 h-16 bg-purple-600 border-4 border-purple-400 rounded-full shadow-lg relative overflow-hidden cursor-pointer"
        id="bunny-mascot-trigger"
      >
        {/* Bunny ears */}
        <div className="absolute -top-1 left-3 w-3 h-7 bg-purple-500 border-2 border-purple-400 rounded-t-full transform -rotate-12 origin-bottom">
          <div className="w-1.5 h-4 bg-purple-300 rounded-t-full mx-auto mt-0.5" />
        </div>
        <div className="absolute -top-1 right-3 w-3 h-7 bg-purple-500 border-2 border-purple-400 rounded-t-full transform rotate-12 origin-bottom">
          <div className="w-1.5 h-4 bg-purple-300 rounded-t-full mx-auto mt-0.5" />
        </div>

        {/* Bunny Face & Cheek highlights */}
        <div className="w-12 h-12 bg-purple-500 rounded-full flex flex-col items-center justify-center mt-3 relative">
          <div className="absolute left-1 top-4 w-2 h-2 bg-purple-400 rounded-full opacity-60" />
          <div className="absolute right-1 top-4 w-2 h-2 bg-purple-400 rounded-full opacity-60" />
          
          {/* Eyes (Happy) */}
          <div className="flex gap-2.5 mt-1">
            <div className="w-2 h-1 bg-purple-900 rounded-full transform rotate-12" />
            <div className="w-2 h-1 bg-purple-900 rounded-full transform -rotate-12" />
          </div>

          {/* Nose & Mouth */}
          <div className="w-1 h-1 bg-purple-950 rounded-full mt-1" />
          <div className="w-2.5 h-1.5 border-b-2 border-purple-950 rounded-b-full" />
        </div>

        {/* Floating Coffee Cup Badge */}
        <div className="absolute bottom-1 right-1 bg-amber-900 border border-amber-500 p-1 rounded-full shadow">
          <Coffee className="w-3 h-3 text-amber-200" />
        </div>

        {/* Onboarding pulse indicator */}
        {showTutorialInitially && (
          <div className="absolute inset-0 rounded-full border-4 border-purple-300 animate-ping opacity-60 pointer-events-none" />
        )}
      </motion.button>
    </div>
  );
}
