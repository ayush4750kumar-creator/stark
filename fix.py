content = open('stockpulse-backend/server.js').read()
new = content.replace('app.get("/", (req, res) => { res.json({ success: true, message: "Gramble API is running!" }); });\n', '')
new = new.replace('app.listen(', 'app.get("/", (req, res) => { res.json({ success: true, message: "Gramble API is running!" }); });\napp.listen(')
open('stockpulse-backend/server.js', 'w').write(new)
