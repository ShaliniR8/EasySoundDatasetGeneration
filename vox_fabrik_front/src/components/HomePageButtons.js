import React from 'react';
import { Stack } from '@mui/material';
import CreateVoiceModels from './CreateVoiceModels'; // Corrected import
import VoiceModels from './VoiceModels'; // Corrected import

const HomePageButtons = ({ data }) => {
  return (
    data && (
      <Stack direction="row" spacing={2} justifyContent="center" sx={{ marginTop: '1rem' }}>
        <CreateVoiceModels />
        <VoiceModels />
      </Stack>
    )
  );
};

export default HomePageButtons;
