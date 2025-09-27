const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.static('public'));

// Ensure uploads dir exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});
const upload = multer({ storage });

// Upload endpoint
app.post('/upload', upload.single('photo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({ file: '/uploads/' + req.file.filename });
});

// Pair endpoint (mock)
app.get('/pair', (req, res) => {
  const { number, photo } = req.query;
  if (!number || !photo) return res.status(400).json({ error: 'Missing params' });

  const fakePairCode = Math.random().toString(36).substr(2, 6).toUpperCase();
  console.log(`Pairing requested for number ${number} with photo ${photo}`);
  res.json({ pairCode: fakePairCode });
});

app.listen(port, () => console.log('Server running on port ' + port));
