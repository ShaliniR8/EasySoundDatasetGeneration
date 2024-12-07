const express = require('express');
const cors = require('cors');
const multer = require('multer');
const unzipper = require('unzipper');
const fs = require('fs');
const path = require('path');

const app = express();
const upload = multer({ dest: 'uploads/' });

const PORT = 8080;

app.use(cors());
app.use(express.json());

const tempDir = path.join(__dirname, 'temp_chunks');
const uploadsDir = path.join(__dirname, 'uploads');

const mergeChunks = async (chunkFiles, mergedFilePath, uploadsDir) => {
    return new Promise((resolve, reject) => {
        const writeStream = fs.createWriteStream(mergedFilePath);
        const readAndWriteChunk = (index) => {
            if (index >= chunkFiles.length) {
                writeStream.end();
                return resolve();
            }
            const chunkFilePath = path.join(uploadsDir, chunkFiles[index]);
            const readStream = fs.createReadStream(chunkFilePath);
            readStream
                .on('error', reject)
                .on('end', () => {
                    fs.unlinkSync(chunkFilePath);
                    readAndWriteChunk(index + 1);
                })
                .pipe(writeStream, { end: false });
        };
        readAndWriteChunk(0);
    });
};


app.post('/api/v2/datasets/upload-chunk', upload.single('chunk'), (req, res) => {
    const { fileName, chunkIndex } = req.body;
    const uploadsDir = path.join(__dirname, 'uploads');
    const fileChunkPath = path.join(uploadsDir, `${fileName}.chunk.${chunkIndex}`);

    fs.mkdir(uploadsDir, { recursive: true }, (err) => {
        if (err) {
            console.error('Error creating uploads directory:', err);
            return res.status(500).send('Failed to create uploads directory.');
        }

        fs.rename(req.file.path, fileChunkPath, (err) => {
            if (err) {
                console.error('Error saving chunk:', err);
                return res.status(500).send('Failed to save chunk.');
            }

            res.status(200).send('Chunk uploaded successfully.');
        });
    });
});

app.post('/api/v2/datasets/validate', async (req, res) => {
    const fileName = 'datasets.zip';
    const uploadsDir = path.join(__dirname, 'uploads');
    const mergedFilePath = path.join(uploadsDir, fileName);
    const extractPath = path.join(__dirname, '../', 'extracted');

    try {
        const chunkFiles = fs.readdirSync(uploadsDir)
            .filter(file => file.includes('.chunk.'))
            .sort((a, b) => {
                const indexA = parseInt(a.split('.').pop(), 10);
                const indexB = parseInt(b.split('.').pop(), 10);
                return indexA - indexB;
            });

        if (chunkFiles.length === 0) {
            return res.status(400).json({ status: 'error', message: 'No chunks found to merge.' });
        }

        chunkFiles.forEach((file) => {
            const chunkFilePath = path.join(uploadsDir, file);
            const size = fs.statSync(chunkFilePath).size;
            if (size === 0) {
                throw new Error(`Chunk ${file} is empty or missing.`);
            }
        });

        await mergeChunks(chunkFiles, mergedFilePath, uploadsDir);
        const isZip = require('is-zip');
        if (!isZip(fs.readFileSync(mergedFilePath))) {
            return res.status(400).json({ status: 'error', message: 'Merged file is not a valid zip file.' });
        }

        const AdmZip = require('adm-zip');
        const zip = new AdmZip(mergedFilePath);
        zip.extractAllTo(extractPath, true);

        const extractedFiles = await fs.promises.readdir(extractPath);

        if (!extractedFiles.includes('wavs')) {
            return res.status(400).json({ status: 'error', message: `Invalid content. The zip file must contain a "wavs" folder. Searched in: ${extractedFiles.join(', ')}` });
        } else if (!extractedFiles.includes('metadata.csv')) {
            return res.status(400).json({ status: 'error', message: `Invalid content. The zip file must contain a "metadata.csv" file. Searched in: ${extractedFiles.join(', ')}` });
        }

        res.json({ status: 'success', message: 'Validation successful.' });

        fs.unlink(mergedFilePath, (err) => {
            if (err) console.error('Failed to delete merged file:', err);
        });
    } catch (error) {
        console.error('Error processing file:', error);
        res.status(500).json({ status: 'error', message: 'An error occurred during file extraction or validation.' });
    }
});



app.get('/api/v2/models', (req, res) => {
    const modelsDir = path.join(__dirname, '../models');

    fs.readdir(modelsDir, { withFileTypes: true }, (err, files) => {
        if (err) {
        console.error('Error reading models directory:', err);
        return res.status(500).json({ error: 'Failed to fetch models' });
        }

        const folders = files
        .filter((file) => file.isDirectory())
        .map((folder) => folder.name);

        res.json(folders);
    });
});


app.listen(PORT, () => {
    console.log(`Node.js server is running on http://localhost:${PORT}`);
});