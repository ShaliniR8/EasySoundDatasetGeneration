import React, { useEffect, useState } from 'react';
import { Stack, Box, CircularProgress, Typography, Alert } from '@mui/material';
import CreateVoiceModels from './CreateVoiceModels';
import VoiceModels from './VoiceModels';
import styled from '@emotion/styled';
import axios from 'axios';

const nodeJSBaseUrl = process.env.REACT_APP_API_NODEJS_BASE_URL;

const style = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: "#00000054",
  borderRadius: '10px',
  padding: '20px',
  margin: '20px auto',
  maxWidth: '500px', 
  boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
}

const Highlight = styled('span')({
  backgroundColor: 'yellow',
  padding: '0 4px',
});

const HomePageButtons = () => {
  const [castedDirectories, setCastedDirectories] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCastedDirectories = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_NODEJS_BASE_URL}/api/v2/casted_datasets`,
          {
            headers: { "ngrok-skip-browser-warning": "1" },
          }
        );
        setCastedDirectories(response.data.castedDirectories || []);
      } catch (err) {
        setError('Failed to fetch casted datasets: ' + (err.response?.data?.message || err.message));
      } finally {
        setLoading(false);
      }
    };

    const fetchFolders = async () => { 
      setLoading(true);
      try {
        const { data } = await axios.get(`${nodeJSBaseUrl}/api/v2/models`, {
          headers: { "ngrok-skip-browser-warning": true },
        });
        if (Array.isArray(data)) {
          setFolders(data);
        } else {
          console.error('Unexpected API response format:', data);
          setFolders([]);
        }
      } catch (error) {
        console.error('Error fetching folders:', error);
        setFolders([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCastedDirectories();
    fetchFolders();
  }, []);

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <div>
      {/* Buttons */}
        <Stack direction="row" spacing={2} justifyContent="center" sx={{ marginTop: '1rem' }}>
          <CreateVoiceModels castedDirectories={castedDirectories} folders={folders}/>
          <VoiceModels folders={folders}/>
        </Stack>

        {/* Instructions */}
        <Box sx={style}>
          <Typography id="create-voice-model-modal" variant="h5" component="h2">
              Instructions For Uploading a Dataset
          </Typography>
          <Typography id="instructions-for-uploading-audio-folder" sx={{ mt: 2 }}>
            1. Upload a folder containing a <Highlight>metadata.csv</Highlight> file and a <Highlight>wavs</Highlight> folder containing audio (wav) files.<br />
            2. The metadata.csv file should be delimited by <Highlight>|</Highlight>.<br/>
            3. The CSV file should have two columns: <Highlight>audio</Highlight> and <Highlight>transcript</Highlight>. audio should contain the name of the audio file, and transcript should contain the text spoken in the audio file.
          </Typography>
        </Box>
    </div>
  );
};

export default HomePageButtons;
