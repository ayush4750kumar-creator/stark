// routes/auth.js
const express = require("express");
const bcrypt  = require("bcryptjs");
const jwt     = require("jsonwebtoken");
const { getDB } = require("../config/database");

const router      = express.Router();
const JWT_SECRET  = process.env.JWT_SECRET || "stockpulse_jwt_secret_changeme";
const SALT_ROUNDS = 10;

function initials(name) {
  return name.trim().split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

router.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ success: false, error: "Name, email and password are required." });
  if (password.length < 6)
    return res.status(400).json({ success: false, error: "Password must be at least 6 characters." });
  if (!email.includes("@"))
    return res.status(400).json({ success: false, error: "Enter a valid email address." });

  const db = getDB();
  const existing = await db.prepare("SELECT id FROM users WHERE email = ?").get(email.toLowerCase());
  if (existing)
    return res.status(409).json({ success: false, error: "This email is already registered. Please log in." });

  try {
    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    const info = await db.prepare(
      "INSERT INTO users (name, email, password) VALUES (?, ?, ?) RETURNING id"
    ).run([name.trim(), email.toLowerCase(), hashed]);

    const token = jwt.sign(
      { id: info.lastInsertRowid, email: email.toLowerCase(), name: name.trim() },
      JWT_SECRET, { expiresIn: "30d" }
    );
    res.json({
      success: true, token,
      user: { id: info.lastInsertRowid, name: name.trim(), email: email.toLowerCase(), initials: initials(name) },
    });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ success: false, error: "Server error. Please try again." });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ success: false, error: "Email and password are required." });

  const db   = getDB();
  const user = await db.prepare("SELECT * FROM users WHERE email = ?").get(email.toLowerCase());

  if (!user)
    return res.status(404).json({ success: false, error: "No account found with this email. Please sign up first." });

  const match = await bcrypt.compare(password, user.password);
  if (!match)
    return res.status(401).json({ success: false, error: "Incorrect password. Please try again." });

  const token = jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    JWT_SECRET, { expiresIn: "30d" }
  );
  res.json({
    success: true, token,
    user: { id: user.id, name: user.name, email: user.email, initials: initials(user.name) },
  });
});

router.post("/verify", async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ success: false });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const db   = getDB();
    const user = await db.prepare("SELECT id, name, email FROM users WHERE id = ?").get(decoded.id);
    if (!user) return res.status(401).json({ success: false });
    res.json({ success: true, user: { ...user, initials: initials(user.name) } });
  } catch {
    res.status(401).json({ success: false, error: "Session expired. Please log in again." });
  }
});

function requireAuth(req, res, next) {
  const token = (req.headers.authorization || "").replace("Bearer ", "");
  if (!token) return res.status(401).json({ success: false, message: "No token" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ success: false, message: "Invalid token" });
  }
}

router.get("/watchlist", requireAuth, async (req, res) => {
  try {
    const db = getDB();
    const rows = await db.prepare(
      "SELECT symbol FROM watchlists WHERE user_id=? ORDER BY added_at ASC"
    ).all(req.user.id);
    res.json({ success: true, data: rows.map(r => r.symbol) });
  } catch(e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post("/watchlist", requireAuth, async (req, res) => {
  const { symbol } = req.body;
  if (!symbol) return res.status(400).json({ success: false, message: "symbol required" });
  try {
    const db = getDB();
    await db.prepare(
      "INSERT INTO watchlists (user_id, symbol) VALUES (?,?) ON CONFLICT DO NOTHING"
    ).run(req.user.id, symbol.toUpperCase());
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.delete("/watchlist/:symbol", requireAuth, async (req, res) => {
  try {
    const db = getDB();
    await db.prepare(
      "DELETE FROM watchlists WHERE user_id=? AND symbol=?"
    ).run(req.user.id, req.params.symbol.toUpperCase());
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;
