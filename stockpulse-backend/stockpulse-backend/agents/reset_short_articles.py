# reset_short_articles.py
# Run ONCE to mark articles with short full_text for reprocessing
# Usage: py -3.11 agents/reset_short_articles.py

import sqlite3, os
from dotenv import load_dotenv
load_dotenv()

DB_PATH = os.getenv("DB_PATH", "./database/stockpulse.db")
conn = sqlite3.connect(DB_PATH)

# Count how many have short full_text
short = conn.execute(
    "SELECT COUNT(*) FROM articles WHERE processed = 2 AND (full_text IS NULL OR LENGTH(full_text) < 300)"
).fetchone()[0]
total = conn.execute("SELECT COUNT(*) FROM articles WHERE processed = 2").fetchone()[0]

print(f"Total processed articles: {total}")
print(f"Articles with short text (<300 chars): {short}")
print(f"Resetting these for reprocessing...")

conn.execute(
    "UPDATE articles SET processed = 0 WHERE processed = 2 AND (full_text IS NULL OR LENGTH(full_text) < 300)"
)
conn.commit()
print(f"✅ Done — {short} articles reset to processed=0")
print(f"   Now run: py -3.11 agents/agentC_agentD.py --loop")
conn.close()