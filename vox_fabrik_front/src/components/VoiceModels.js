import React, { useState } from 'react';
import { Button, Typography, Box, Modal, IconButton, List, ListItem, CircularProgress } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CloseIcon from '@mui/icons-material/Close';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const pythonBaseUrl = process.env.REACT_APP_API_PYTHON_BASE_URL;

const VoiceModels = ({folders}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [loadingStage, setLoadingStage] = useState('idle');

  const navigate = useNavigate();

  const toggleModal = (isOpen) => {
    setModalOpen(isOpen);
  };

  const handleOpenTTS = async (folderName) => {
    setLoadingStage('getModel');
    try {
      const { data } = await axios.get(`${pythonBaseUrl}/api/v1/model`, {
        params: { folder_name: folderName },
        headers: { "ngrok-skip-browser-warning": true },
      });
      console.log(data.message);
      navigate('/tts', { state: { folderName } });
    } catch (error) {
      console.error('Error fetching model:', error);
    } finally {
      setLoadingStage('idle');
    }
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

          {loadingStage === 'fetchFolders' ? (
            <Box display="flex" justifyContent="center" alignItems="center" height="100%">
              <CircularProgress />
            </Box>
          ) : folders.length > 0 ? (
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
                    disabled={loadingStage === 'getModel'}
                  >
                    {loadingStage === 'getModel' ? <CircularProgress size={20} /> : 'Open'}
                  </Button>
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography>No folders found.</Typography>
          )}
        </Box>
      </Modal>
    </>
  );
};

export default VoiceModels;
