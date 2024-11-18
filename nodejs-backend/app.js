const express = require('express');
const cors = require('cors');
const multer = require('multer');
const unzipper = require('unzipper');
const fs = require('fs');
const path = require('path');

const app = express();
const upload = multer({ dest: 'uploads/' });

const PORT = 8080;

app.use(cors({
    origin: ['http://localhost:3000', 'https://shalinir8.github.io/']
}));
app.use(express.json());

app.post('/api/v2/datasets/validate', upload.single('zipFile'), async (req, res) => {
    const filePath = req.file.path;
    const fileMime = req.file.mimetype;
    // const originalName = req.file.originalname.replace(/\.zip$/, '');
    if (fileMime !== 'application/zip' && fileMime !== 'application/x-zip-compressed') {
        return res.status(400).json({ status: 'error', message: 'Invalid file type. Please upload a zip file.' });
    }

    try {
        const extractPath = path.join(__dirname, 'extracted');
        await fs.promises.mkdir(extractPath, { recursive: true });

        await fs.createReadStream(filePath)
            .pipe(unzipper.Extract({ path: extractPath }))
            .promise();

        const extractedFiles = await fs.promises.readdir(extractPath);
        if (!extractedFiles.includes('wavs') || !extractedFiles.includes('metadata.csv')) {
            return res.status(400).json({ status: 'error', message: `Invalid content. The zip file must contain a "wavs" folder and a "metadata.csv" file. Searched in: ${extractedFiles.join(', ')}` });
        }

        res.json({ status: 'success', message: 'Validation successful.' });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'An error occurred during file extraction or validation.' });
    } finally {
        fs.unlink(filePath, (err) => {
            if (err) console.error('Failed to delete temp file:', err);
        });
    }
});

app.listen(PORT, () => {
    console.log(`Node.js server is running on http://localhost:${PORT}`);
});