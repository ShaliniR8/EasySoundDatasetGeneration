const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 8080;

app.use(cors());
app.use(express.json());

app.get('/api/test', (req, res) => {
    res.json({ message: 'This is a test endpoint from the Node.js backend.' });
});

app.listen(PORT, () => {
    console.log(`Node.js server is running on http://localhost:${PORT}`);
});
