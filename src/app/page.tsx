"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Terminal, Github, Cpu, Zap, ArrowRight, CheckCircle2 } from "lucide-react";

export default function Home() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus("loading");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setStatus("success");
        setEmail("");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center py-20 px-4 sm:px-6 relative z-10">

      {/* Background Video */}
      <div className="fixed inset-0 w-full h-full z-[-1] bg-black">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover opacity-40 blur-md mix-blend-screen"
          src="/gitset-video.webm"
        />
      </div>

      {/* Header Logo */}
      <div className="absolute top-8 left-8 z-50">
        <a
          href="https://gitset.dev"
          title="Gitset"
          className="cursor-pointer inline-block transition-transform duration-300 hover:scale-[1.05] active:scale-95"
        >
          <img src="/favicon-192.png" alt="Gitset Logo" className="w-16 h-16" />
        </a>
      </div>

      <div className="max-w-4xl w-full mx-auto space-y-16 mt-12">

        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center space-y-6"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-md mb-6">
            <span className="flex h-2 w-2 rounded-full bg-[#8EF0EE] animate-pulse"></span>
            <span className="text-sm font-medium tracking-wide text-gray-300">Launching June 1st, 2026</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight font-(family-name:--font-outfit)">
            The next generation of <br className="hidden md:block" />
            <span className="text-gradient-primary">Gitset</span> is here.
          </h1>

          <p className="text-xl text-gray-400 max-w-2xl mx-auto font-light leading-relaxed">
            Elevate your workflow with unparalleled speed and intelligence.
            No tokens, total freedom, completely open source.
          </p>
        </motion.div>

        {/* Waitlist Section */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
          className="relative w-full max-w-2xl mx-auto"
        >
          {/* Subtle glow behind the container */}
          <div className="absolute -inset-4 bg-[#8EF0EE]/10 blur-3xl rounded-full z-0 opacity-50" />

          <div className="relative z-10 rounded-3xl p-px bg-linear-to-br from-[#8EF0EE]/30 via-white/5 to-[#8EF0EE]/10 shadow-[0_0_40px_rgba(142,240,238,0.1)]">
            <div className="relative rounded-[23px] bg-black/40 p-10 sm:p-12 flex flex-col items-center justify-center backdrop-blur-xl overflow-hidden w-full h-full">
              {/* Glowing neon borders on all sides */}
              <div className="absolute top-0 left-[10%] right-[10%] h-px bg-linear-to-r from-transparent via-[#8EF0EE]/80 to-transparent shadow-[0_0_15px_rgba(142,240,238,0.8)]" />
              <div className="absolute bottom-0 left-[20%] right-[20%] h-px bg-linear-to-r from-transparent via-[#8EF0EE]/50 to-transparent shadow-[0_0_15px_rgba(142,240,238,0.5)]" />
              <div className="absolute left-0 top-[20%] bottom-[20%] w-px bg-linear-to-b from-transparent via-[#8EF0EE]/50 to-transparent shadow-[0_0_15px_rgba(142,240,238,0.5)]" />
              <div className="absolute right-0 top-[20%] bottom-[20%] w-px bg-linear-to-b from-transparent via-[#8EF0EE]/50 to-transparent shadow-[0_0_15px_rgba(142,240,238,0.5)]" />

              <h2 className="text-3xl sm:text-4xl font-bold font-(family-name:--font-outfit) mb-4 text-center text-white relative z-10">
                Secure your early access
              </h2>
              <p className="text-gray-400 mb-10 text-center max-w-md text-lg">
                Join the waitlist to be the first to experience Gitset v2.
              </p>

              <form onSubmit={handleSubmit} className="relative w-full max-w-md flex items-center bg-white/5 rounded-full p-2 border border-white/10 shadow-inner group focus-within:border-[#8EF0EE]/30 focus-within:bg-white/10 transition-all duration-500">
                <input
                  type="email"
                  required
                  disabled={status === "loading" || status === "success"}
                  placeholder="Enter your email address"
                  className="w-full bg-transparent border-none py-3 pl-6 pr-32 text-white placeholder-gray-500 focus:outline-none focus:ring-0 transition-all duration-300"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={status === "loading" || status === "success"}
                  className="absolute right-1.5 top-1.5 bottom-1.5 bg-white/10 backdrop-blur-md border border-[#8EF0EE] text-white px-8 rounded-full font-semibold tracking-wide transition-all duration-300 flex items-center justify-center shadow-lg hover:shadow-[0_0_20px_rgba(142,240,238,0.3)] hover:bg-white/20 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {status === "loading" ? (
                    <span className="w-5 h-5 border-2 border-[#8EF0EE]/30 border-t-[#8EF0EE] rounded-full animate-spin" />
                  ) : status === "success" ? (
                    <CheckCircle2 className="w-5 h-5 text-[#8EF0EE]" />
                  ) : (
                    <span>Join</span>
                  )}
                </button>
              </form>

              <div className="h-6 mt-4 flex items-center justify-center">
                {status === "success" && (
                  <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-[#8EF0EE] text-sm font-medium">
                    You're on the list! Keep an eye on your inbox.
                  </motion.p>
                )}
                {status === "error" && (
                  <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-red-400 text-sm font-medium">
                    Something went wrong. Please try again.
                  </motion.p>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="mt-6 text-xs sm:text-sm text-gray-500 hover:text-white transition-colors underline underline-offset-4 decoration-white/10 hover:decoration-[#8EF0EE]/40"
              >
                Already have a subscription?
              </button>
            </div>
          </div>
        </motion.div>

        {/* Feature Grid */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-10"
        >
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              whileHover={{ y: -5, scale: 1.02 }}
              className="relative p-px rounded-3xl bg-linear-to-br from-[#8EF0EE]/30 via-white/5 to-transparent shadow-lg group"
            >
              <div className="relative h-full w-full bg-[rgba(20,20,25,0.7)] backdrop-blur-xl rounded-[23px] p-6 flex flex-col space-y-4 overflow-hidden">
                {/* Glowing neon borders */}
                <div className="absolute top-0 left-[15%] right-[15%] h-px bg-linear-to-r from-transparent via-[#8EF0EE]/60 to-transparent shadow-[0_0_15px_rgba(142,240,238,0.6)] opacity-30 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="absolute bottom-0 left-[25%] right-[25%] h-px bg-linear-to-r from-transparent via-[#8EF0EE]/40 to-transparent shadow-[0_0_15px_rgba(142,240,238,0.4)] opacity-30 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="absolute left-0 top-[20%] bottom-[20%] w-px bg-linear-to-b from-transparent via-[#8EF0EE]/40 to-transparent shadow-[0_0_15px_rgba(142,240,238,0.4)] opacity-30 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="absolute right-0 top-[20%] bottom-[20%] w-px bg-linear-to-b from-transparent via-[#8EF0EE]/40 to-transparent shadow-[0_0_15px_rgba(142,240,238,0.4)] opacity-30 group-hover:opacity-100 transition-opacity duration-500" />

                <div className={`p-3 rounded-2xl bg-white/5 w-fit ${feature.color} relative z-10`}>
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold font-(family-name:--font-outfit) relative z-10 text-white">{feature.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed relative z-10">{feature.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

      </div>

      {/* Footer */}
      <footer className="w-full mt-24 pb-8 flex flex-col items-center justify-center gap-6 text-center z-50">
        <a
          href="https://www.lemonsqueezy.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center transition-all duration-300 border border-transparent hover:border-[#8EF0EE]/30 rounded-lg group p-3 bg-black/20 hover:bg-black/40"
        >
          <img
            src="/lemon/Lemon-Squeezy-Powered-Badge-Black.png"
            alt="Powered by Lemon Squeezy"
            className="h-8 w-auto invert transition-all duration-300 opacity-60 group-hover:opacity-100 group-hover:drop-shadow-[0_0_8px_rgba(142,240,238,0.5)]"
          />
        </a>
        <p className="text-sm text-gray-500 font-light tracking-wide">
          Gitset.dev © {new Date().getFullYear()} All rights reserved.
        </p>
      </footer>

      {/* Subscription Info Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-100 flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.3, type: "spring", bounce: 0.25 }}
              className="relative w-full max-w-lg rounded-3xl p-px bg-linear-to-br from-[#8EF0EE]/30 via-white/5 to-[#8EF0EE]/10 shadow-[0_0_40px_rgba(142,240,238,0.1)]"
            >
              <div className="relative bg-[#08080a] rounded-[23px] p-8 sm:p-10 overflow-hidden w-full h-full">
                {/* Glowing neon borders on all sides */}
                <div className="absolute top-0 left-[10%] right-[10%] h-px bg-linear-to-r from-transparent via-[#8EF0EE]/80 to-transparent shadow-[0_0_15px_rgba(142,240,238,0.8)]" />
                <div className="absolute bottom-0 left-[20%] right-[20%] h-px bg-linear-to-r from-transparent via-[#8EF0EE]/50 to-transparent shadow-[0_0_15px_rgba(142,240,238,0.5)]" />
                <div className="absolute left-0 top-[20%] bottom-[20%] w-px bg-linear-to-b from-transparent via-[#8EF0EE]/50 to-transparent shadow-[0_0_15px_rgba(142,240,238,0.5)]" />
                <div className="absolute right-0 top-[20%] bottom-[20%] w-px bg-linear-to-b from-transparent via-[#8EF0EE]/50 to-transparent shadow-[0_0_15px_rgba(142,240,238,0.5)]" />

                <h3 className="text-xl sm:text-2xl font-bold text-white mb-6 font-(family-name:--font-outfit)">Subscription Transition</h3>

                <div className="space-y-5 text-sm sm:text-base text-gray-400 leading-relaxed font-light">
                  <p>
                    Due to the disruptive infrastructure upgrades rolling out this month, we are moving away from standard subscription tiers to a new <strong className="text-[#8EF0EE] font-medium">Bring Your Own AI (BYOAI)</strong> model.
                  </p>
                  <ul className="space-y-3 pl-2">
                    <li className="flex gap-3">
                      <span className="text-[#8EF0EE] mt-0.5">•</span>
                      <span><strong className="text-white font-medium">Refunds:</strong> All active subscriptions starting or renewing in March have been automatically refunded.</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="text-[#8EF0EE] mt-0.5">•</span>
                      <span><strong className="text-white font-medium">Rollover Credits:</strong> Any leftover tokens from prior cycles will be credited to your account as free usage in Gitset v2.</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="text-[#8EF0EE] mt-0.5">•</span>
                      <span><strong className="text-white font-medium">BYOAI:</strong> If you run out of credits, you can seamlessly bring your own API keys to continue using Gitset limitlessly.</span>
                    </li>
                  </ul>
                  <p className="pt-6 border-t border-white/5 mt-8 text-xs sm:text-sm text-gray-500">
                    Any further doubts or queries? Reach out to us directly at <a href="mailto:support@gitset.dev" className="text-white hover:text-[#8EF0EE] transition-colors font-medium">support@gitset.dev</a>.
                  </p>
                </div>

                <button
                  onClick={() => setIsModalOpen(false)}
                  className="absolute top-6 right-6 p-2 text-gray-500 hover:text-white hover:bg-white/10 rounded-full transition-all z-50"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}

const features = [
  {
    icon: <img src="/cli/favicon-192.png" alt="Gitset CLI" className="w-8 h-8 object-contain" />,
    title: "Gitset CLI",
    desc: "A powerful command-line interface directly integrated with your favorite workflows seamlessly.",
    color: "text-[#8EF0EE]",
  },
  {
    icon: <Cpu className="w-6 h-6" />,
    title: "Bring Your Own AI",
    desc: "No tokens required. Use your keys for Claude, ChatGPT, Gemini, or OpenRouter.",
    color: "text-[#8EF0EE]",
  },
  {
    icon: <Github className="w-6 h-6" />,
    title: "Open Source",
    desc: "Fully transparent and community-driven. Inspect our code and host it yourself if you want.",
    color: "text-[#8EF0EE]",
  },
  {
    icon: <Zap className="w-6 h-6" />,
    title: "Free Initially",
    desc: "Enjoy complete access to all Gitset v2 features for free during our initial roll-out period.",
    color: "text-[#8EF0EE]",
  }
];
