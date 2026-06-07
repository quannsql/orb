"use client";

import { useState } from "react";

const MOCK_ACCOUNTS = [
  {
    email: "commander.orb@gmail.com",
    name: "Commander ORB",
    avatarUrl: "https://api.dicebear.com/7.x/pixel-art/svg?seed=commander",
  },
  {
    email: "operator.zero@gmail.com",
    name: "Operator Zero",
    avatarUrl: "https://api.dicebear.com/7.x/pixel-art/svg?seed=opzero",
  },
  {
    email: "satellite.analyst@gmail.com",
    name: "Geospatial Analyst",
    avatarUrl: "https://api.dicebear.com/7.x/pixel-art/svg?seed=analyst",
  },
];

export default function GoogleSignInPopup() {
  const [customEmail, setCustomEmail] = useState("");
  const [customName, setCustomName] = useState("");
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [error, setError] = useState("");

  const handleSelectAccount = (account: typeof MOCK_ACCOUNTS[number]) => {
    // Send message to parent window
    if (window.opener) {
      window.opener.postMessage(
        {
          type: "GOOGLE_SIGN_IN_SUCCESS",
          payload: account,
        },
        window.location.origin
      );
      window.close();
    } else {
      setError("Parent window not found. Please trigger this from the main application.");
    }
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail || !customEmail.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    const name = customName || customEmail.split("@")[0];
    const formattedName = name.charAt(0).toUpperCase() + name.slice(1);

    handleSelectAccount({
      email: customEmail.toLowerCase().trim(),
      name: formattedName,
      avatarUrl: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${customEmail}`,
    });
  };

  return (
    <main className="min-h-screen bg-[#f0f4f9] text-[#1f1f1f] font-sans flex items-center justify-center p-4">
      <div className="w-full max-w-[450px] bg-white border border-[#dadce0] rounded-lg p-8 sm:p-10 shadow-[0_4px_16px_rgba(0,0,0,0.08)] flex flex-col">
        {/* Google Logo (Simulated) */}
        <div className="flex justify-center mb-6">
          <svg className="w-18 h-8" viewBox="0 0 74 24" fill="none">
            <path
              d="M10.8 13v-3.7h8.8c.1.5.1 1 .1 1.6 0 2.5-.7 4.5-2 5.9-1.3 1.3-3.2 2-5.7 2-4.8 0-8.8-3.9-8.8-8.8S7.1 1.2 12 1.2c2.6 0 4.8 1 6.5 2.6l-2.6 2.6c-1.1-1-2.5-1.6-3.9-1.6-3.2 0-5.8 2.6-5.8 5.8s2.6 5.8 5.8 5.8c3.7 0 5.1-2.6 5.3-4.1H10.8z"
              fill="#4285F4"
            />
            <path
              d="M26.4 12c0 3-2.2 5.1-4.9 5.1s-4.9-2.1-4.9-5.1 2.2-5.1 4.9-5.1 4.9 2.1 4.9 5.1zm-3.2 0c0-1.8-1.2-3.1-1.7-3.1s-1.7 1.3-1.7 3.1 1.2 3.1 1.7 3.1 1.7-1.3 1.7-3.1z"
              fill="#EA4335"
            />
            <path
              d="M37.3 12c0 3-2.2 5.1-4.9 5.1s-4.9-2.1-4.9-5.1 2.2-5.1 4.9-5.1 4.9 2.1 4.9 5.1zm-3.2 0c0-1.8-1.2-3.1-1.7-3.1s-1.7 1.3-1.7 3.1 1.2 3.1 1.7 3.1 1.7-1.3 1.7-3.1z"
              fill="#FBBC05"
            />
            <path
              d="M48 7.2v9.3c0 3.8-2.2 5.4-4.8 5.4-2.5 0-3.9-1.6-4.5-3l2.8-1.2c.5.9 1.2 1.7 2.1 1.7 1.7 0 1.7-.8 1.7-2.1v-.8c-.6.7-1.4 1.2-2.4 1.2-2.5 0-4.7-2.1-4.7-5s2.2-5.1 4.7-5.1c1 0 1.8.5 2.4 1.2V7.2H48zm-2.8 4.8c0-1.8-1.1-3.1-1.7-3.1s-1.7 1.3-1.7 3.1 1.2 3.1 1.7 3.1 1.7-1.3 1.7-3.1z"
              fill="#4285F4"
            />
            <path d="M52 1v17.4h-3.1V1H52z" fill="#34A853" />
            <path
              d="M62.6 13.9l2.5 1.7c-.8 1.2-2.8 3.2-5.9 3.2-3.8 0-5.8-2.9-5.8-5.1 0-3.3 2.1-5.1 5.5-5.1 3.5 0 5.1 2.5 5.7 3.9l.3.8-8.1 3.3c.6 1.2 1.6 1.9 2.9 1.9 1.3 0 2.2-.6 3-1.6zm-5.8-2c.3-.5 1-1.2 1.6-1.2 1 0 1.4.6 1.6 1l-5 2.1c0-1.2.9-1.9 1.8-1.9z"
              fill="#EA4335"
            />
          </svg>
        </div>

        <h1 className="text-xl font-medium text-center text-[#202124] mb-1">
          Sign in
        </h1>
        <p className="text-sm text-center text-[#5f6368] mb-6">
          to continue to <span className="font-semibold text-neutral-800">ORB Command Center</span>
        </p>

        {error && (
          <div className="bg-red-50 text-red-700 text-xs p-3 border border-red-200 rounded mb-4 font-mono">
            {error}
          </div>
        )}

        {!showCustomForm ? (
          <div className="flex flex-col flex-1">
            {/* Account List */}
            <div className="flex flex-col gap-1.5 mb-6">
              {MOCK_ACCOUNTS.map((acc, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectAccount(acc)}
                  className="flex items-center gap-3 w-full p-3 hover:bg-[#f8fafd] active:bg-[#f1f3f4] border border-[#dadce0] rounded-lg text-left transition-colors cursor-pointer"
                >
                  <img
                    src={acc.avatarUrl}
                    alt={acc.name}
                    className="w-8 h-8 rounded-full bg-slate-100 border border-[#dadce0]"
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-[#3c4043]">{acc.name}</span>
                    <span className="text-xs text-[#5f6368] font-mono">{acc.email}</span>
                  </div>
                  <span className="ml-auto text-[#1a73e8] text-xs font-semibold">Select</span>
                </button>
              ))}
            </div>

            {/* Use another account button */}
            <button
              onClick={() => setShowCustomForm(true)}
              className="text-sm text-[#1a73e8] hover:text-[#174ea6] font-semibold text-left mb-6 hover:underline cursor-pointer"
            >
              Use another account
            </button>
          </div>
        ) : (
          <form onSubmit={handleCustomSubmit} className="flex flex-col flex-1">
            <div className="flex flex-col gap-4 mb-6">
              <div>
                <label className="block text-xs font-semibold text-[#5f6368] uppercase tracking-wider mb-1">
                  Email address
                </label>
                <input
                  type="email"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  placeholder="name@gmail.com"
                  required
                  className="w-full border border-[#dadce0] rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5f6368] uppercase tracking-wider mb-1">
                  Operator Name (Optional)
                </label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g. Commander Jack"
                  className="w-full border border-[#dadce0] rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8]"
                />
              </div>
            </div>

            <div className="flex items-center justify-between mt-auto">
              <button
                type="button"
                onClick={() => {
                  setShowCustomForm(false);
                  setError("");
                }}
                className="text-sm text-[#1a73e8] hover:text-[#174ea6] font-semibold py-2 cursor-pointer"
              >
                Back to list
              </button>
              <button
                type="submit"
                className="bg-[#1a73e8] hover:bg-[#1557b0] text-white font-semibold text-sm px-6 py-2.5 rounded-lg transition-colors cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
              >
                Sign In
              </button>
            </div>
          </form>
        )}

        <div className="mt-8 pt-4 border-t border-[#dadce0] flex justify-between text-xs text-[#5f6368]">
          <span>English (United States)</span>
          <div className="flex gap-4">
            <span className="hover:underline cursor-pointer">Help</span>
            <span className="hover:underline cursor-pointer">Privacy</span>
            <span className="hover:underline cursor-pointer">Terms</span>
          </div>
        </div>
      </div>
    </main>
  );
}
