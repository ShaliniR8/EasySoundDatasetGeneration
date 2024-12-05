import React from 'react';
import { Button, Stack } from '@mui/material';
import CreateVoiceModels from './CreateVoiceModels'; // Corrected import

const HomePageButtons = ({ data }) => {
  return (
    data && (
      <Stack direction="row" spacing={2} justifyContent="center" sx={{ marginTop: '1rem' }}>
        <CreateVoiceModels />
        <Button variant="contained" color="secondary">
          Generate Speech from Text
        </Button>
      </Stack>
    )
  );
};

export default HomePageButtons;
