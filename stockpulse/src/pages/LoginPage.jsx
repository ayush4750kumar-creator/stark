// src/pages/LoginPage.jsx
import { useState, useEffect, useRef } from "react";

const API = (process.env.REACT_APP_API_URL || "https://stark-production-4b5e.up.railway.app/api") + "/auth";

export default function LoginPage({ onLogin, initialMode = "login" }) {
  const [mode, setMode]               = useState(initialMode);
  const [name, setName]               = useState("");
  const [email, setEmail]             = useState("");
  const [password, setPassword]       = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [error, setError]             = useState("");
  const [loading, setLoading]         = useState(false);

  // ── Verification flow ─────────────────────────────────────
  const [step, setStep]               = useState("form"); // "form" | "verify"
  const [code, setCode]               = useState(["", "", "", "", "", ""]);
  const [resendTimer, setResendTimer] = useState(0);
  const codeRefs                      = useRef([]);
  const timerRef                      = useRef(null);

  // ── On mount: check saved token ───────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem("sp_token");
    if (!saved) return;
    fetch(`${API}/verify`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ token: saved }),
    })
      .then(r => r.json())
      .then(data => { if (data.success) onLogin({ ...data.user, token: saved }); })
      .catch(() => localStorage.removeItem("sp_token"));
  }, []);

  // ── Resend countdown ──────────────────────────────────────
  useEffect(() => {
    if (resendTimer <= 0) return;
    timerRef.current = setTimeout(() => setResendTimer(t => t - 1), 1000);
    return () => clearTimeout(timerRef.current);
  }, [resendTimer]);

  // ── Send OTP → POST /auth/signup ──────────────────────────
  const sendOTP = async () => {
    setLoading(true);
    setError("");
    try {
      const res  = await fetch(`${API}/signup`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ name: name.trim(), email: email.toLowerCase(), password }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Failed to send verification code.");
      } else {
        setStep("verify");
        setResendTimer(60);
        setCode(["", "", "", "", "", ""]);
        setTimeout(() => codeRefs.current[0]?.focus(), 100);
      }
    } catch {
      setError("Cannot reach the server. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  // ── Verify OTP → POST /auth/verify-otp ───────────────────
  const handleVerifyOTP = async () => {
    const otp = code.join("");
    if (otp.length < 6) { setError("Please enter the full 6-digit code."); return; }
    setLoading(true);
    setError("");
    try {
      const res  = await fetch(`${API}/verify-otp`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: email.toLowerCase(), otp }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Invalid or expired code.");
      } else {
        localStorage.setItem("sp_token", data.token);
        onLogin({ ...data.user, token: data.token });
      }
    } catch {
      setError("Cannot reach the server. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  // ── Code input handlers ───────────────────────────────────
  const handleCodeChange = (i, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...code];
    next[i] = val;
    setCode(next);
    if (val && i < 5) codeRefs.current[i + 1]?.focus();
  };

  const handleCodeKey = (i, e) => {
    if (e.key === "Backspace" && !code[i] && i > 0) codeRefs.current[i - 1]?.focus();
    if (e.key === "Enter") handleVerifyOTP();
  };

  const handleCodePaste = (e) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setCode(pasted.split(""));
      codeRefs.current[5]?.focus();
    }
  };

  // ── Main submit ───────────────────────────────────────────
  const handleSubmit = async () => {
    setError("");
    if (mode === "signup") {
      if (!name.trim())            { setError("Please enter your name."); return; }
      if (!email.includes("@"))    { setError("Enter a valid email address."); return; }
      if (password.length < 6)     { setError("Password must be at least 6 characters."); return; }
      if (password !== confirmPass) { setError("Passwords do not match."); return; }
      await sendOTP();
      return;
    }
    // Login
    if (!email.includes("@")) { setError("Enter a valid email address."); return; }
    if (password.length < 6)  { setError("Password must be at least 6 characters."); return; }
    setLoading(true);
    try {
      const res  = await fetch(`${API}/login`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: email.toLowerCase(), password }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Something went wrong.");
      } else {
        localStorage.setItem("sp_token", data.token);
        onLogin({ ...data.user, token: data.token });
      }
    } catch {
      setError("Cannot reach the server. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const handleKey  = (e) => { if (e.key === "Enter") handleSubmit(); };
  const switchMode = (m) => { setMode(m); setError(""); setStep("form"); setCode(["","","","","",""]); };

  // ── Styles ────────────────────────────────────────────────
  const inputStyle = {
    width: "100%", padding: "11px 14px",
    background: "#f7f7f7", border: "1px solid #e0e0e0",
    borderRadius: 9, color: "var(--text)",
    fontFamily: "var(--font-body)", fontSize: 14,
    outline: "none", transition: "border-color 0.2s",
    boxSizing: "border-box",
  };

  const labelStyle = {
    color: "var(--text3)", fontSize: 12, fontWeight: 600,
    fontFamily: "var(--font-display)", display: "block", marginBottom: 6,
  };

  const Logo = () => (
    <div style={{ textAlign: "center", marginBottom: 36 }}>
      <div style={{ fontFamily: "var(--font-headline)", fontWeight: 900, fontSize: 42, letterSpacing: "-0.02em", color: "#0a0a0a", fontStyle: "italic" }}>
        GRAMBLE
      </div>
      <div style={{ color: "#888888", fontSize: 13, marginTop: 4 }}>
        Your intelligent market news feed
      </div>
    </div>
  );

  const ErrorBox = () => error ? (
    <div style={{
      background: "rgba(255,77,109,0.1)", border: "1px solid rgba(255,77,109,0.3)",
      borderRadius: 8, padding: "10px 14px", color: "var(--bear)", fontSize: 13,
      display: "flex", alignItems: "flex-start", gap: 8,
    }}>
      <span style={{ flexShrink: 0, marginTop: 1 }}>⚠️</span>
      <span>{error}</span>
    </div>
  ) : null;

  // ── Verify screen ─────────────────────────────────────────
  if (step === "verify") {
    return (
      <div style={{ minHeight: "100vh", background: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
        <div style={{ width: "100%", maxWidth: 420 }}>
          <Logo />
          <div style={{ padding: "28px 28px 24px", background: "#ffffff", border: "1px solid #e8e8e8", borderRadius: 16, boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>

            <button onClick={() => { setStep("form"); setError(""); }}
              style={{ background: "none", border: "none", color: "var(--text3)", fontSize: 13, cursor: "pointer", padding: 0, marginBottom: 20, display: "flex", alignItems: "center", gap: 4 }}>
              ← Back
            </button>

            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>📧</div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 20, color: "#0a0a0a", marginBottom: 8 }}>
                Check your email
              </div>
              <div style={{ color: "#888", fontSize: 13, lineHeight: 1.5 }}>
                We sent a 6-digit code to<br />
                <strong style={{ color: "#0a0a0a" }}>{email}</strong>
              </div>
            </div>

            {/* 6-digit boxes */}
            <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 20 }}>
              {code.map((digit, i) => (
                <input key={i}
                  ref={el => codeRefs.current[i] = el}
                  type="text" inputMode="numeric" maxLength={1} value={digit}
                  onChange={e => handleCodeChange(i, e.target.value)}
                  onKeyDown={e => handleCodeKey(i, e)}
                  onPaste={handleCodePaste}
                  style={{
                    width: 46, height: 54, textAlign: "center",
                    fontSize: 22, fontWeight: 700,
                    background: "#f7f7f7", border: `2px solid ${digit ? "var(--accent)" : "#e0e0e0"}`,
                    borderRadius: 10, outline: "none", color: "#0a0a0a",
                    fontFamily: "var(--font-display)", transition: "border-color 0.2s",
                  }}
                  onFocus={e => e.target.style.borderColor = "var(--accent)"}
                  onBlur={e  => e.target.style.borderColor = digit ? "var(--accent)" : "#e0e0e0"}
                />
              ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <ErrorBox />

              <button onClick={handleVerifyOTP} disabled={loading || code.join("").length < 6}
                style={{
                  width: "100%", padding: "13px",
                  background: loading || code.join("").length < 6 ? "#ccc" : "var(--accent)",
                  border: "none", borderRadius: 9, color: "#000",
                  fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 15,
                  cursor: loading || code.join("").length < 6 ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  transition: "all 0.2s",
                }}>
                {loading ? (
                  <>
                    <div style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid rgba(0,0,0,0.3)", borderTopColor: "#000", animation: "spin 0.7s linear infinite" }} />
                    Verifying...
                  </>
                ) : "Verify & Create Account →"}
              </button>

              <div style={{ textAlign: "center", fontSize: 13, color: "var(--text3)" }}>
                Didn't get it?{" "}
                {resendTimer > 0
                  ? <span style={{ color: "#aaa" }}>Resend in {resendTimer}s</span>
                  : <span onClick={sendOTP} style={{ color: "var(--accent)", cursor: "pointer", fontWeight: 600 }}>Resend code</span>
                }
              </div>
            </div>
          </div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Main form ─────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", position: "relative", overflow: "hidden" }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <Logo />

        <div style={{ padding: "28px 28px 24px", background: "#ffffff", border: "1px solid #e8e8e8", borderRadius: 16, boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>

          {/* Tab switcher */}
          <div style={{ display: "flex", marginBottom: 24, background: "#f0f0f0", borderRadius: 10, padding: 4 }}>
            {["login", "signup"].map(m => (
              <button key={m} onClick={() => switchMode(m)}
                style={{
                  flex: 1, padding: "9px", borderRadius: 8, border: "none",
                  background: mode === m ? "#111111" : "transparent",
                  color: mode === m ? "#ffffff" : "var(--text3)",
                  fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13,
                  cursor: "pointer", transition: "all 0.2s",
                }}>
                {m === "login" ? "Log In" : "Sign Up"}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Name (signup only) */}
            {mode === "signup" && (
              <div>
                <label style={labelStyle}>FULL NAME</label>
                <input type="text" placeholder="e.g. Arjun Mehta" value={name}
                  onChange={e => setName(e.target.value)} onKeyDown={handleKey}
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = "var(--accent)"}
                  onBlur={e  => e.target.style.borderColor = "var(--border2)"}
                />
              </div>
            )}

            {/* Email */}
            <div>
              <label style={labelStyle}>EMAIL</label>
              <input type="email" placeholder="you@example.com" value={email}
                onChange={e => setEmail(e.target.value)} onKeyDown={handleKey}
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = "var(--accent)"}
                onBlur={e  => e.target.style.borderColor = "var(--border2)"}
              />
            </div>

            {/* Password */}
            <div>
              <label style={labelStyle}>PASSWORD</label>
              <input type="password" placeholder="Minimum 6 characters" value={password}
                onChange={e => setPassword(e.target.value)} onKeyDown={handleKey}
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = "var(--accent)"}
                onBlur={e  => e.target.style.borderColor = "var(--border2)"}
              />
            </div>

            {/* Confirm Password (signup only) */}
            {mode === "signup" && (
              <div>
                <label style={labelStyle}>CONFIRM PASSWORD</label>
                <input type="password" placeholder="Re-enter your password" value={confirmPass}
                  onChange={e => setConfirmPass(e.target.value)} onKeyDown={handleKey}
                  style={{
                    ...inputStyle,
                    borderColor: confirmPass && confirmPass !== password ? "#ff4d6d" : "#e0e0e0",
                  }}
                  onFocus={e => e.target.style.borderColor = confirmPass !== password ? "#ff4d6d" : "var(--accent)"}
                  onBlur={e  => e.target.style.borderColor = confirmPass && confirmPass !== password ? "#ff4d6d" : "var(--border2)"}
                />
                {confirmPass && confirmPass !== password && (
                  <div style={{ color: "#ff4d6d", fontSize: 12, marginTop: 5 }}>⚠ Passwords do not match</div>
                )}
              </div>
            )}

            <ErrorBox />

            {/* Submit */}
            <button onClick={handleSubmit} disabled={loading}
              style={{
                width: "100%", padding: "13px", marginTop: 4,
                background: loading ? "var(--accent2)" : "var(--accent)",
                border: "none", borderRadius: 9, color: "#000",
                fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 15,
                cursor: loading ? "not-allowed" : "pointer", transition: "all 0.2s",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; }}
            >
              {loading ? (
                <>
                  <div style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid rgba(0,0,0,0.3)", borderTopColor: "#000", animation: "spin 0.7s linear infinite" }} />
                  {mode === "login" ? "Logging in..." : "Sending code..."}
                </>
              ) : (
                mode === "login" ? "Log In →" : "Send Verification Code →"
              )}
            </button>

            <div style={{ textAlign: "center", color: "var(--text3)", fontSize: 12, marginTop: 2 }}>
              {mode === "login"
                ? <>No account? <span onClick={() => switchMode("signup")} style={{ color: "var(--accent)", cursor: "pointer", fontWeight: 600 }}>Sign up for free</span></>
                : <>Already have an account? <span onClick={() => switchMode("login")} style={{ color: "var(--accent)", cursor: "pointer", fontWeight: 600 }}>Log in</span></>
              }
            </div>

          </div>
        </div>

        <div style={{ textAlign: "center", color: "var(--text3)", fontSize: 11, marginTop: 16 }}>
          Market data is for informational purposes only.
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}