content = open('stockpulse-backend/server.js').read()
content = content.replace('app.get("/", (req, res) => { res.json({ success: true, message: "Gramble API is running!" }); });\n', '')
content = content.replace('app.use((req, res) => res.status(404)', 'app.get("/", (req, res) => { res.json({ success: true, message: "Gramble API is running!" }); });\n  app.use((req, res) => res.status(404)')
open('stockpulse-backend/server.js', 'w').write(content)
