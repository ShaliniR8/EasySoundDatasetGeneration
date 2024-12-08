import React from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Button,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import GraphicEqIcon from '@mui/icons-material/GraphicEq';
import DownloadIcon from '@mui/icons-material/Download';
import axios from 'axios';


const nodeJSBaseUrl = process.env.REACT_APP_API_NODEJS_BASE_URL;


const RightDrawer = ({ open, onClose, keptTexts, folderName }) => {
  const handleDownload = async () => {
    try {
      const response = await axios.get(`${nodeJSBaseUrl}/api/v2/download`, {
        params: { folderName },
        headers: {
          'ngrok-skip-browser-warning': true,
        },
        responseType: 'blob', 
      });

      const blob = new Blob([response.data], { type: response.headers['content-type'] });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = 'downloaded_file';
      link.click();
    } catch (error) {
      console.error('Error downloading the file:', error);
      alert('Failed to download the file.');
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: 300, 
          padding: 2, 
          backgroundColor: '#f5f5f5', 
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        },
      }}
    >
      <Box>
        <Box display="flex" justifyContent="flex-end">
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>

        <Typography variant="h6" gutterBottom>
          Saved Entries
        </Typography>

        {keptTexts && keptTexts.length > 0 ? (
          <List>
            {keptTexts.map((text, index) => (
              <ListItem key={index} sx={{ alignItems: 'flex-start' }}>
                <ListItemIcon
                  sx={{
                    minWidth: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#1976d2',
                    color: 'white',
                    borderRadius: '50%',
                    width: 36,
                    height: 36,
                  }}
                >
                  <GraphicEqIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary={text}
                  sx={{
                    textAlign: 'left',
                    ml: 2,
                  }}
                />
              </ListItem>
            ))}
          </List>
        ) : (
          <Typography variant="body2" color="textSecondary">
            No saved entries yet.
          </Typography>
        )}
      </Box>

      <Box sx={{ mt: 2, mb: 4 }}>
        <Button
          variant="contained"
          color="primary"
          fullWidth
          startIcon={<DownloadIcon />}
          onClick={handleDownload}
        >
          Download
        </Button>
      </Box>
    </Drawer>
  );
};

export default RightDrawer;
