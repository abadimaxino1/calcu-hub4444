const express = require('express');
const path = require('path');
const PORT = process.env.PORT || 5001;
const app = express();
const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');
app.use(express.static(dist));
// fallback to index.html for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(dist, 'index.html'));
});
app.listen(PORT, () => console.log(`Static server serving dist at http://localhost:${PORT}`));
