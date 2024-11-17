import React, { useEffect, useState } from 'react';
import { Container, Typography, ThemeProvider } from '@mui/material';
import axios from 'axios';
import theme from './theme/theme';
import { Title, DownloadButton, HomePageButtons } from './components';

function App() {
  const [data, setData] = useState(null);

  const isLocal = window.location.hostname === 'localhost';
  const baseUrl = isLocal 
    ? 'http://localhost:3000/EasySoundDatasetGeneration' 
    : 'https://shalinir8.github.io/EasySoundDatasetGeneration';

  useEffect(() => {
    axios.get('http://localhost:5000/api/home')
      .then(response => setData(response.data.message))
      .catch(error => console.error('Error fetching data:', error));
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <Container maxWidth="md">
        <Title text="FoxVabrik" />
        <Typography variant="body1">
          {data ? data : 'Backend is not running. Please run the executable or download it from here...'}
        </Typography>
        {data ? (
          <>
            <HomePageButtons data={data} />
          </>
        ) : (
          <DownloadButton url={`${baseUrl}/vox_fabrik.exe`} />
        )}
      </Container>
    </ThemeProvider>
  );
}

export default App;
