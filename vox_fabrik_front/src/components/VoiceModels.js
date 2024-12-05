import React, { useState } from 'react';
import { Button, Typography, Box, Modal, IconButton, List, ListItem } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CloseIcon from '@mui/icons-material/Close';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const nodeJSBaseUrl = process.env.REACT_APP_API_NODEJS_BASE_URL;

const VoiceModels = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [folders, setFolders] = useState([]);
  const navigate = useNavigate();

  const fetchFolders = async () => {
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
    }
  };

  const toggleModal = (isOpen) => {
    setModalOpen(isOpen);
    if (isOpen) fetchFolders();
  };

  const handleOpenTTS = (folderName) => {
    navigate('/tts', { state: { folderName } }); // Navigate to TTS with folder name
  };
  
  return (
    <>
      <Button variant="contained" color="secondary" onClick={() => toggleModal(true)}>
        Voice Models
      </Button>

      <Modal open={modalOpen} onClose={(_, reason) => reason === 'backdropClick' && null}>
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 400,
            bgcolor: 'background.paper',
            boxShadow: 24,
            p: 4,
          }}
        >
          <Box display="flex" justifyContent="space-between" mb={2}>
            <Typography variant="h6">Available Voice Models</Typography>
            <IconButton onClick={() => toggleModal(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
          {Array.isArray(folders) && folders.length > 0 ? (
            <List>
              {folders.map((folder, index) => (
                <ListItem
                  key={index}
                  sx={{
                    bgcolor: '#f1f8ff',
                    color: 'black',
                    borderRadius: '8px',
                    mb: 1,
                    padding: '10px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Typography
                    sx={{
                      fontWeight: 'bold',
                      fontFamily: 'Arial, sans-serif',
                      fontSize: '1rem',
                      textAlign: 'left',
                    }}
                  >
                    {folder}
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    endIcon={<ArrowForwardIcon />}
                    sx={{
                      borderRadius: '8px',
                      textTransform: 'none',
                      fontWeight: 600,
                    }}
                    onClick={() => handleOpenTTS(folder)}
                  >
                    Open
                  </Button>
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography>{folders.length === 0 ? 'No folders found.' : 'Loading folders...'}</Typography>
          )}
        </Box>
      </Modal>
    </>
  );
};

export default VoiceModels;
