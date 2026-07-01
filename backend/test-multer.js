const express = require('express');
const multer = require('multer');
const axios = require('axios');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(express.json());

app.put('/test', upload.single('file'), (req, res) => {
  res.json({ success: true, body: req.body });
});

app.use((err, req, res, next) => {
  console.error('Error middleware caught:', err);
  res.status(500).json({ error: err.message });
});

const server = app.listen(3001, async () => {
  try {
    const res = await axios.put('http://localhost:3001/test', { is_published: true });
    console.log('Response:', res.data);
  } catch (e) {
    console.error('Axios error:', e.response ? e.response.data : e.message);
  } finally {
    server.close();
  }
});
