import React from 'react';
import { Typography } from '@mui/material';

const Title = ({ text }) => (
  <Typography variant="h1" sx={{ marginTop: '2rem' }}>
    {text}
  </Typography>
);

export default Title;
