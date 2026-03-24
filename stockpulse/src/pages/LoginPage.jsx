// src/pages/LoginPage.jsx
import { useState, useEffect } from "react";

const API = "http://localhost:5000/api/auth";

export default function LoginPage({ onLogin }) {
  const [mode, setMode]         = useState("login");
  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  // ── On mount: check for saved token ──────────────────────
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

  // ── Submit ────────────────────────────────────────────────
  const handleSubmit = async () => {
    setError("");
    if (mode === "signup" && !name.trim()) { setError("Please enter your name."); return; }
    if (!email.includes("@"))              { setError("Enter a valid email address."); return; }
    if (password.length < 6)              { setError("Password must be at least 6 characters."); return; }

    setLoading(true);
    try {
      const endpoint = mode === "login" ? "/login" : "/signup";
      const body     = mode === "login"
        ? { email, password }
        : { name: name.trim(), email, password };

      const res  = await fetch(`${API}${endpoint}`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
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

  const handleKey = (e) => { if (e.key === "Enter") handleSubmit(); };

  // ── Input style ───────────────────────────────────────────
  const inputStyle = {
    width: "100%", padding: "11px 14px",
    background: "#f7f7f7", border: "1px solid #e0e0e0",
    borderRadius: 9, color: "var(--text)",
    fontFamily: "var(--font-body)", fontSize: 14,
    outline: "none", transition: "border-color 0.2s",
    boxSizing: "border-box",
  };

  return (
    <div style={{
      minHeight: "100vh", background: "#ffffff",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "20px", position: "relative", overflow: "hidden",
    }}>


      <div style={{ width:"100%", maxWidth:420 }}>

        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:36 }}>
          <div style={{ fontFamily:"var(--font-headline)", fontWeight:900, fontSize:42, letterSpacing:"-0.02em", color:"#0a0a0a", fontStyle:"italic" }}>
            GRAMBLE
          </div>
          <div style={{ color:"#888888", fontSize:13, marginTop:4 }}>
            Your intelligent market news feed
          </div>
        </div>

        {/* Card */}
        <div style={{ padding:"28px 28px 24px", background:"#ffffff", border:"1px solid #e8e8e8", borderRadius:16, boxShadow:"0 4px 24px rgba(0,0,0,0.08)" }}>

          {/* Tab switcher */}
          <div style={{ display:"flex", marginBottom:24, background:"#f0f0f0", borderRadius:10, padding:4 }}>
            {["login","signup"].map(m => (
              <button key={m} onClick={() => { setMode(m); setError(""); }}
                style={{
                  flex:1, padding:"9px", borderRadius:8, border:"none",
                  background: mode===m ? "#111111" : "transparent",
                  color: mode===m ? "#ffffff" : "var(--text3)",
                  fontFamily:"var(--font-display)", fontWeight:700, fontSize:13,
                  cursor:"pointer", transition:"all 0.2s",
                }}>
                {m === "login" ? "Log In" : "Sign Up"}
              </button>
            ))}
          </div>

          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

            {/* Name field (signup only) */}
            {mode === "signup" && (
              <div>
                <label style={{ color:"var(--text3)", fontSize:12, fontWeight:600, fontFamily:"var(--font-display)", display:"block", marginBottom:6 }}>FULL NAME</label>
                <input type="text" placeholder="e.g. Arjun Mehta" value={name}
                  onChange={e => setName(e.target.value)} onKeyDown={handleKey}
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor="var(--accent)"}
                  onBlur={e  => e.target.style.borderColor="var(--border2)"}
                />
              </div>
            )}

            {/* Email */}
            <div>
              <label style={{ color:"var(--text3)", fontSize:12, fontWeight:600, fontFamily:"var(--font-display)", display:"block", marginBottom:6 }}>EMAIL</label>
              <input type="email" placeholder="you@example.com" value={email}
                onChange={e => setEmail(e.target.value)} onKeyDown={handleKey}
                style={inputStyle}
                onFocus={e => e.target.style.borderColor="var(--accent)"}
                onBlur={e  => e.target.style.borderColor="var(--border2)"}
              />
            </div>

            {/* Password */}
            <div>
              <label style={{ color:"var(--text3)", fontSize:12, fontWeight:600, fontFamily:"var(--font-display)", display:"block", marginBottom:6 }}>PASSWORD</label>
              <input type="password" placeholder="Minimum 6 characters" value={password}
                onChange={e => setPassword(e.target.value)} onKeyDown={handleKey}
                style={inputStyle}
                onFocus={e => e.target.style.borderColor="var(--accent)"}
                onBlur={e  => e.target.style.borderColor="var(--border2)"}
              />
            </div>

            {/* Error message */}
            {error && (
              <div style={{
                background:"rgba(255,77,109,0.1)", border:"1px solid rgba(255,77,109,0.3)",
                borderRadius:8, padding:"10px 14px", color:"var(--bear)", fontSize:13,
                display:"flex", alignItems:"flex-start", gap:8,
              }}>
                <span style={{ flexShrink:0, marginTop:1 }}>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button onClick={handleSubmit} disabled={loading} style={{
              width:"100%", padding:"13px", marginTop:4,
              background: loading ? "var(--accent2)" : "var(--accent)",
              border:"none", borderRadius:9, color:"#000",
              fontFamily:"var(--font-display)", fontWeight:800, fontSize:15,
              cursor: loading ? "not-allowed" : "pointer",
              transition:"all 0.2s",
              display:"flex", alignItems:"center", justifyContent:"center", gap:8,
            }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.transform="translateY(-1px)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform="translateY(0)"; }}
            >
              {loading ? (
                <>
                  <div style={{ width:16, height:16, borderRadius:"50%", border:"2px solid rgba(0,0,0,0.3)", borderTopColor:"#000", animation:"spin 0.7s linear infinite" }} />
                  {mode === "login" ? "Logging in..." : "Creating account..."}
                </>
              ) : (
                mode === "login" ? "Log In →" : "Create Account →"
              )}
            </button>

            {/* Hint to switch mode */}
            <div style={{ textAlign:"center", color:"var(--text3)", fontSize:12, marginTop:2 }}>
              {mode === "login"
                ? <>No account? <span onClick={() => { setMode("signup"); setError(""); }} style={{ color:"var(--accent)", cursor:"pointer", fontWeight:600 }}>Sign up for free</span></>
                : <>Already have an account? <span onClick={() => { setMode("login"); setError(""); }} style={{ color:"var(--accent)", cursor:"pointer", fontWeight:600 }}>Log in</span></>
              }
            </div>

          </div>
        </div>

        <div style={{ textAlign:"center", color:"var(--text3)", fontSize:11, marginTop:16 }}>
          Market data is for informational purposes only.
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}