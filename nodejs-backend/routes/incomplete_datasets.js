const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();

const findCastedDirectories = (baseDir) => {
  const result = [];

  try {
    const topLevelDirs = fs.readdirSync(baseDir, { withFileTypes: true });

    for (const dir of topLevelDirs) {
      if (dir.isDirectory()) {
        const castedPath = path.join(baseDir, dir.name, 'casted');
        if (fs.existsSync(castedPath) && fs.statSync(castedPath).isDirectory()) {
          result.push(path.join(dir.name));
        }
      }
    }
  } catch (error) {
    console.error(`Error accessing directories in ${baseDir}:`, error.message);
  }

  return result;
};

router.get('/casted_datasets', (req, res) => {
  const rootDir = path.join(__dirname, '../../');
  const castedDirectories = findCastedDirectories(rootDir);
  res.json({ castedDirectories });
});

module.exports = router;
