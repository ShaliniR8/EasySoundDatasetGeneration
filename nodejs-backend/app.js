const express = require('express');
const cors = require('cors');
const multer = require('multer');
const unzipper = require('unzipper');
const archiver = require('archiver');
const fs = require('fs');
const rimraf = require('rimraf')
const path = require('path');
const castedRoutes = require('./routes/incomplete_datasets');

const app = express();
// // MONGODB
// // TODO: User Registration and Login
// const mongoose = require('mongoose');
// const bodyParser = require('body-parser');
// require('dotenv').config();

// const authRoutes = require('./routes/auth');
// app.use(bodyParser.json());
const upload = multer({ dest: 'uploads/' });

const PORT = 8080;

// // TODO: User Registration and Login
// mongoose
//   .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
//   .then(() => console.log('MongoDB connected'))
//   .catch((err) => console.error('MongoDB connection failed:', err));

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

// // TODO: User Registration and Login
// app.use('/api/v2/auth', authRoutes);

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
        fs.rmSync(extractPath, { recursive: true, force: true });
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
        return res.json([]);
        }

        const folders = files
        .filter((file) => file.isDirectory())
        .map((folder) => folder.name);

        res.json(folders);
    });
});

app.get('/api/v2/get_kept_samples', (req, res) => {
    const folderName = req.query.folderName;
    if (!folderName) {
      return res.status(400).json({ error: 'folderName query param is required' });
    }
  
    const csvPath = path.join(__dirname, '../.tmp', `${folderName}_metadata.csv`);
  
    if (!fs.existsSync(csvPath)) {
      return res.status(404).json({ error: 'Metadata file not found for that folderName' });
    }
  
    fs.readFile(csvPath, 'utf8', (err, data) => {
      if (err) {
        console.error('Error reading CSV file:', err);
        return res.status(500).json({ error: 'Error reading file' });
      }
  
      const lines = data.trim().split('\n');
      const texts = lines.map(line => {
        const parts = line.split('|');
        return parts[1] ? parts[1] : '';
      }).filter(text => text.length > 0);
  
      res.json({ texts });
    });
  });

  app.get('/api/v2/download', async (req, res) => {
    const folderName = req.query.folderName;
  
    const baseDir = path.join(__dirname, '../.tmp');
    const wavsFolder = path.join(baseDir, 'wavs');
    const metadataFile = path.join(baseDir, `${folderName}_metadata.csv`);
    const zipFileName = `${folderName}_files.zip`;
    const zipFilePath = path.join(baseDir, zipFileName);
  
    try {
      if (!fs.existsSync(wavsFolder) || !fs.existsSync(metadataFile)) {
        return res.status(404).json({ error: 'Required files or folder not found' });
      }
  
      const output = fs.createWriteStream(zipFilePath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      archive.pipe(output);

      archive.file(metadataFile, { name: `${folderName}_metadata.csv` });
  
      const wavFiles = fs.readdirSync(wavsFolder).filter((file) => {
        return file.startsWith(folderName) && file.endsWith('.wav');
      });
  
      if (wavFiles.length === 0) {
        return res.status(404).json({ error: 'No matching WAV files found' });
      }
  
      const wavsFolderInZip = 'wavs';
      wavFiles.forEach((file) => {
        const filePath = path.join(wavsFolder, file);
        archive.file(filePath, { name: path.join(wavsFolderInZip, file) });
      });
  
      await archive.finalize();
  
      output.on('close', () => {
        fs.unlinkSync(metadataFile);
        wavFiles.forEach((file) => {
          fs.unlinkSync(path.join(wavsFolder, file));
        });

        res.download(zipFilePath, zipFileName, (err) => {
          if (err) {
            console.error('Error sending the ZIP file:', err);
          }
          fs.unlinkSync(zipFilePath);
        });
      });
    } catch (error) {
      console.error('Error processing the request:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

app.use('/api/v2', castedRoutes);

app.listen(PORT, () => {
    console.log(`Node.js server is running on http://localhost:${PORT}`);
});