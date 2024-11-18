import React, { useState } from 'react';
import { Button, Typography, Box, Modal, Alert, CircularProgress } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import axios from 'axios';
import styled from '@emotion/styled';

const nodeJSBaseUrl = process.env.REACT_APP_API_NODEJS_BASE_URL;
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

const CreateVoiceModel = () => {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleOpen = () => setOpen(true);
  const handleClose = () => {
    setOpen(false);
    setError(null);
    setSuccess(false);
  };

  const handleFileUpload = async (event) => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    const files = event.target.files; // This is the FileList object from the input
    const formData = new FormData();

    // Assuming only one file (the zip file) is uploaded:
    if (files.length > 0) {
        formData.append('zipFile', files[0]); // 'zipFile' should match the field name in the backend
    } else {
        setError('No file selected. Please upload a zip file.');
        setLoading(false);
        return;
    }

    try {
        const validateResponse = await axios.post(`${nodeJSBaseUrl}/api/v2/datasets/validate`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });

        if (validateResponse.data.status === 'success') {
            setSuccess(true);
        } else {
            setError('Validation failed: ' + validateResponse.data.message);
        }
    } catch (err) {
        if (err.response && err.response.data && err.response.data.message) {
            setError('An error occurred: ' + err.response.data.message);
        } else {
            setError('An unexpected error occurred: ' + err.message);
        }
    } finally {
        setLoading(false);
    }
};


  return (
    <div>
      <Button 
        variant="contained" 
        color="primary" 
        onClick={handleOpen}
      >
        Create Voice Model
      </Button>
      <Modal
        open={open}
        onClose={handleClose}
        aria-labelledby="create-voice-model-modal"
        aria-describedby="instructions-for-uploading-audio-folder"
      >
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
            <Button
              component="label"
              role={undefined}
              variant="contained"
              tabIndex={-1}
              startIcon={<CloudUploadIcon />}
            >
              Upload Folder
              <VisuallyHiddenInput
                type="file"
                webkitdirectory="true" // Allows folder selection
                multiple
                onChange={handleFileUpload}
              />
            </Button>
          </Box>

          {loading && <CircularProgress sx={{ mt: 2 }} />}
          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mt: 2 }}>Dataset successfully created!</Alert>}
        </Box>
      </Modal>
    </div>
  );
};

export default CreateVoiceModel;
