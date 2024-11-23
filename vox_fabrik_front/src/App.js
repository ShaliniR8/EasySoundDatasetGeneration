import React, { useEffect, useState } from 'react';
import { Container, Typography, ThemeProvider} from '@mui/material';
import axios from 'axios';
import theme from './theme/theme';
import { Title, HomePageButtons } from './components';

function App() {
  const [data, setData] = useState(null);

  const pythonBaseUrl = process.env.REACT_APP_API_PYTHON_BASE_URL;

  useEffect(() => {
    axios.get(`${pythonBaseUrl}/api/v1/home`, {
      headers: { "ngrok-skip-browser-warning": "1" }
    })
      .then(response => setData(response.data.message))
      .catch(error => console.error('Error fetching data:', error));
  }, [pythonBaseUrl]);

  return (
    <ThemeProvider theme={theme}>
      <Container maxWidth="md">
        <Title text="FoxVabrik" />
        <Typography variant="body1">
          {data ? data : 'Backend is not running.'}
        </Typography>
        {data && (<HomePageButtons data={data} />)}
 
      </Container>
    </ThemeProvider>
  );
}

export default App;
