import React, { useState } from "react";
import { Upload, X, CheckCircle2, AlertCircle, Loader2, Landmark } from "lucide-react";
import { UserProfile } from "../types";
import { saveProfile } from "../db";
import { motion, AnimatePresence } from "motion/react";

interface RentalPaymentProps {
  user: UserProfile;
  onVerified: (user: UserProfile) => void;
}

export const RentalPayment: React.FC<RentalPaymentProps> = ({ user, onVerified }) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(selected);
      setError(null);
    }
  };

  const handleVerify = async () => {
    if (!preview) return;
    setIsVerifying(true);
    setError(null);

    try {
      const response = await fetch("/api/verify-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: preview, email: user.email }),
      });

      const result = await response.json();

      if (result.verified) {
        setSuccess(true);
        const expiryDate = new Date();
        if (result.isMonthly) {
          expiryDate.setMonth(expiryDate.getMonth() + 1);
        } else {
          // One time 150 - let's set it to a very long time if they paid enough, 
          // or just 1 year if it's "one time payment unless they want monthly"
          expiryDate.setFullYear(expiryDate.getFullYear() + 10); 
        }

        const updatedUser: UserProfile = {
          ...user,
          rentalPaid: true,
          rentalExpiry: expiryDate.toISOString(),
        };

        await saveProfile(updatedUser);
        setTimeout(() => onVerified(updatedUser), 2000);
      } else {
        setError(result.reason || "Payment verification failed. Please ensure the screenshot matches the required details.");
      }
    } catch (err: any) {
      setError("An error occurred during verification. Please try again.");
      console.error(err);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="bg-[#121214] border border-white/10 rounded-3xl p-6 max-w-lg mx-auto overflow-hidden relative">
      <div className="absolute top-0 right-0 p-8 opacity-5">
        <Landmark className="w-32 h-32 text-purple-500" />
      </div>

      <div className="relative z-10">
        <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
          Rental Access Required
        </h2>
        <p className="text-gray-400 text-sm mb-6">
          To watch this content, please process a one-time payment of at least <span className="text-purple-400 font-semibold">150 PHP</span>.
        </p>

        <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-4 mb-6">
          <p className="text-xs text-purple-200 uppercase tracking-widest font-bold mb-3">GCash Payment Details</p>
          <div className="flex justify-between items-center bg-black/40 p-3 rounded-xl mb-2">
            <span className="text-gray-400 text-xs">Number</span>
            <span className="text-white font-mono font-bold text-lg leading-none">09763329358</span>
          </div>
          <div className="flex justify-between items-center bg-black/40 p-3 rounded-xl">
            <span className="text-gray-400 text-xs">Name</span>
            <span className="text-white font-semibold">Mark David Valmores</span>
          </div>
        </div>

        <div className="space-y-4">
          <div className="text-sm font-medium text-gray-300">Upload Success Screenshot</div>
          
          {!preview ? (
            <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-white/10 rounded-2xl cursor-pointer hover:bg-white/5 transition-colors group">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-10 h-10 mb-3 text-gray-500 group-hover:text-purple-400 transition-colors" />
                <p className="mb-2 text-sm text-gray-400">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-500">PNG, JPG or JPEG (Max 10MB)</p>
              </div>
              <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
            </label>
          ) : (
            <div className="relative rounded-2xl overflow-hidden border border-white/20">
              <img src={preview} alt="GCash Receipt" className="w-full h-64 object-cover" />
              <button 
                onClick={() => { setFile(null); setPreview(null); setSuccess(false); }}
                className="absolute top-2 right-2 p-2 bg-black/60 rounded-full hover:bg-black/80 text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              {success && (
                <div className="absolute inset-0 bg-green-500/80 flex flex-col items-center justify-center text-white p-4 text-center">
                  <CheckCircle2 className="w-16 h-16 mb-2" />
                  <p className="text-xl font-bold">Payment Verified!</p>
                  <p className="text-sm">Unlocking content...</p>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          <button
            onClick={handleVerify}
            disabled={!preview || isVerifying || success}
            className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${
              !preview || isVerifying || success
                ? "bg-white/5 text-gray-500 cursor-not-allowed"
                : "bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-purple-500/20"
            }`}
          >
            {isVerifying ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Verifying Receipt...
              </>
            ) : success ? (
              <>
                <CheckCircle2 className="w-5 h-5" />
                Access Granted
              </>
            ) : (
              "Verify Payment & Unlock"
            )}
          </button>
        </div>

        <p className="text-[10px] text-gray-500 text-center mt-6">
          Payments are verified in real-time by AI to match GCash Reference, Name, and Amount. Any fraudulent attempts will result in account suspension.
        </p>
      </div>
    </div>
  );
};
