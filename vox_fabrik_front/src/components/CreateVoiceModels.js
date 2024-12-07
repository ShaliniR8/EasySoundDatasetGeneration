import React, { useState } from 'react';
import { Button, Typography, Box, Modal, Alert, CircularProgress, LinearProgress } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import axios from 'axios';
import styled from '@emotion/styled';

const nodeJSBaseUrl = process.env.REACT_APP_API_NODEJS_BASE_URL;
const pythonBaseUrl = process.env.REACT_APP_API_PYTHON_BASE_URL;
const websocketUrl = process.env.REACT_APP_API_WEBSOCKET_URL;
const VisuallyHiddenInput = styled('input')({
  display: 'none',
});

const Highlight = styled('span')({
  backgroundColor: 'yellow',
  padding: '0 4px',
});

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: 'background.paper',
  boxShadow: 24,
  p: 4,
};

const CreateVoiceModels = () => {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(null);
  const [loadingStage, setLoadingStage] = useState('idle');
  const [successMessage, setSuccessMessage] = useState(null);
  const [progress, setProgress] = useState(0);

  const handleOpen = () => setOpen(true);
  const handleClose = () => {
    setOpen(false);
    setError(null);
    setSuccessMessage(null);
    setLoadingStage('idle');
    setProgress(0);
  };

  const validateZipFile = async (fileName) => {
    try {
        const response = await axios.post(`${nodeJSBaseUrl}/api/v2/datasets/validate`, { fileName }, {
            headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": true },
        });

        if (response.data.status === 'success') {
            setSuccessMessage('ZIP file validated successfully.');
            setLoadingStage('csvValidation');
        } else {
            setError(`Validation failed: ${response.data.message}`);
            setLoadingStage('idle');
        }
    } catch (err) {
        setError('Error validating zip file: ' + (err.response?.data?.message || err.message));
        setLoadingStage('idle');
    }
};


  const handleFileUpload = async (event) => {
    setLoadingStage('uploading');
    setError(null);
    setSuccessMessage(null);
    setProgress(0);

    const files = event.target.files;
    const file = files[0];

    if (!file) {
        setError('No file selected. Please upload a zip file.');
        setLoadingStage('idle');
        return;
    }

    const chunkSize = 1024 * 1024; // 1 MB
    const totalChunks = Math.ceil(file.size / chunkSize);

    // Upload chunks
    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const start = chunkIndex * chunkSize;
        const end = Math.min(file.size, start + chunkSize);
        const chunk = file.slice(start, end);

        const formData = new FormData();
        formData.append('chunk', chunk);
        formData.append('fileName', file.name);
        formData.append('chunkIndex', chunkIndex);
        formData.append('totalChunks', totalChunks);

        try {
            await axios.post(`${nodeJSBaseUrl}/api/v2/datasets/upload-chunk`, formData, {
                headers: { 'Content-Type': 'multipart/form-data', "ngrok-skip-browser-warning": true },
            });

            setProgress(Math.round(((chunkIndex + 1) / totalChunks) * 100));
        } catch (err) {
            console.error('Error uploading chunk:', err.response ? err.response.data : err.message);
            setError(`Failed to upload chunk ${chunkIndex + 1} of ${totalChunks}: ${err.message}`);
            setLoadingStage('idle');
            return;
        }
    }

    try {
        setLoadingStage('zipValidation');
        await validateZipFile(file.name);

        setLoadingStage('csvValidation');
        const validateCsvResponse = await axios.post(`${pythonBaseUrl}/api/v1/datasets/validate_csv`, {
          headers: { 'Content-Type': 'application/json', "ngrok-skip-browser-warning": true },
        });

        if (validateCsvResponse.data.status !== 'success') {
          setError('CSV validation failed: ' + validateCsvResponse.data.message);
          setLoadingStage('idle');
          return;
        }

        setSuccessMessage('CSV file validated successfully.');
        setLoadingStage('extractingFeatures');
        const socket = new WebSocket(`${websocketUrl}/feature_extraction`);
        console.log(`${websocketUrl}/feature_extraction`)
        socket.onopen = () => {
          console.log("WebSocket connected to:", websocketUrl);
        };
        
        socket.onmessage = (event) => {
          console.log("Raw WebSocket message:", event.data);
          const data = JSON.parse(event.data);
          console.log("Parsed message:", data);
  
          if (data.type === "status") {
              console.log("Status update:", data.message);
              if (data.status =='success') {
                setSuccessMessage(data.message);
                setLoadingStage('idle');
              } else {
                setError('Feature Extraction failed');
                setLoadingStage('idle');
                return;
              }
          }
  
          if (data.type === "progress") {
              console.log("Progress update:", data.progress);
              setProgress(data.progress);
          }
        };
        
        socket.onerror = (error) => {
          console.error("WebSocket error:", error);
        };
        
        socket.onclose = () => {
          console.log("WebSocket connection closed");
        };
    } catch (err) {
        console.error('Error validating zip file:', err.response ? err.response.data : err.message);
        setError('Validation failed: ' + (err.response?.data?.message || err.message));
        setLoadingStage('idle');
    }
};


  return (
    <div>
      <Button variant="contained" color="primary" onClick={handleOpen}>
        Create Voice Model
      </Button>
      <Modal open={open} onClose={handleClose} aria-labelledby="create-voice-model-modal" aria-describedby="instructions-for-uploading-audio-folder">
        <Box sx={style}>
          <Typography id="create-voice-model-modal" variant="h6" component="h2">
            Instructions
          </Typography>
          <Typography id="instructions-for-uploading-audio-folder" sx={{ mt: 2 }}>
            1. Upload a folder containing a <Highlight>metadata.csv</Highlight> file and a <Highlight>wavs</Highlight> folder containing audio (wav) files.<br />
            2. The <Highlight>metadata.csv</Highlight> file should be delimited by <Highlight>|</Highlight>.<br />
            3. The CSV file should have two columns: <Highlight>audio</Highlight> and <Highlight>transcript</Highlight>. <Highlight>audio</Highlight> should contain the name of the audio file, and <Highlight>transcript</Highlight> should contain the text spoken in the audio file.
          </Typography>

          <Box sx={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
            <Button component="label" role={undefined} variant="contained" tabIndex={-1} startIcon={<CloudUploadIcon />}>
              Upload Folder
              <VisuallyHiddenInput type="file" webkitdirectory="true" multiple onChange={handleFileUpload} />
            </Button>
          </Box>

          {loadingStage === 'zipValidation' && <Alert severity="info" sx={{ mt: 2 }}>Validating ZIP file...</Alert>}
          {loadingStage === 'csvValidation' && <Alert severity="info" sx={{ mt: 2 }}>Validating CSV file...</Alert>}
          {loadingStage === 'extractingFeatures' && (
            <Box sx={{ mt: 2 }}>
              <Alert severity="info">Extracting Features...</Alert>
              <LinearProgress variant="determinate" value={progress} sx={{ mt: 1 }} />
              <Typography>{progress}%</Typography>
            </Box>
          )}
          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
          {successMessage && <Alert severity="success" sx={{ mt: 2 }}>{successMessage}</Alert>}
          {loadingStage !== 'idle' && <CircularProgress sx={{ mt: 2 }} />}

          {loadingStage === 'uploading' && (
              <Box sx={{ mt: 2 }}>
                  <Alert severity="info">Uploading file...</Alert>
                  <LinearProgress variant="determinate" value={progress} sx={{ mt: 1 }} />
                  <Typography>{progress}%</Typography>
              </Box>
          )}
        </Box>
      </Modal>
    </div>
  );
};

export default CreateVoiceModels;
