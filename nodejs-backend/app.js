const express = require('express');
const cors = require('cors');
const multer = require('multer');
const unzipper = require('unzipper');
const fs = require('fs');
const path = require('path');

const app = express();
const upload = multer({ dest: 'uploads/' });

const PORT = 8080;

const corsOptions = {
    origin: ['https://shalinir8.github.io', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'ngrok-skip-browser-warning'],
};

app.use(cors(corsOptions));
app.use(express.json());

app.post('/api/v2/datasets/validate', upload.single('zipFile'), async (req, res) => {
    const filePath = req.file?.path; // Ensure the file path is correct
    const fileMime = req.file.mimetype;
    const extractPath = path.join(__dirname, '../', 'extracted');
    // --- Cleanup Logic ---
    async function cleanExtractPath(directoryPath) {
        try {
            const files = await fs.promises.readdir(directoryPath);
            for (const file of files) {
                const fileToDelete = path.join(directoryPath, file);
                const stats = await fs.promises.stat(fileToDelete);
                if (stats.isDirectory()) {
                    // Recursively delete directory
                    await fs.promises.rm(fileToDelete, { recursive: true, force: true });
                } else {
                    // Delete file
                    await fs.promises.unlink(fileToDelete);
                }
            }
            console.log(`Cleared contents of: ${directoryPath}`);
        } catch (error) {
            if (error.code !== 'ENOENT') {
                console.error(`Failed to clean directory ${directoryPath}:`, error);
                throw error;
            }
            // If directory doesn't exist, proceed without error
        }
    }
    // ----------------------

    if (fileMime !== 'application/zip' && fileMime !== 'application/x-zip-compressed') {
        return res.status(400).json({ status: 'error', message: `Invalid file type: ${fileMime}. Please upload a zip file.` });
    }

    try {
        await fs.promises.mkdir(extractPath, { recursive: true });
        await cleanExtractPath(extractPath);
        
        await fs.createReadStream(filePath)
        .pipe(unzipper.Extract({ path: extractPath }))
        .promise();
        
        const extractedFiles = await fs.promises.readdir(extractPath);
        console.log((!extractedFiles.includes('wavs') || !extractedFiles.includes('metadata.csv')))
        if (!extractedFiles.includes('wavs')) {
            return res.status(400).json({ status: 'error', message: `Invalid content. The zip file must contain a "wavs" folder. Searched in: ${extractedFiles.join(', ')}` });
        }else if (!extractedFiles.includes('metadata.csv')){
            return res.status(400).json({ status: 'error', message: `Invalid content. The zip file must contain a "metadata.csv" file. Searched in: ${extractedFiles.join(', ')}` });
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