import React from 'react';
import { Button } from '@mui/material';
import { Download as DownloadIcon } from '@mui/icons-material';

const DownloadButton = ({ url }) => (
  <a href={url} download style={{ textDecoration: 'none' }}>
    <Button variant="contained" endIcon={<DownloadIcon />} fullWidth sx={{ marginTop: '1rem' }}>
      Download .zip
    </Button>
  </a>
);

export default DownloadButton;
