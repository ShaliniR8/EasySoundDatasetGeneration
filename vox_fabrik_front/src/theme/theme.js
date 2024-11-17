import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  typography: {
    fontFamily: 'Roboto, sans-serif',
    h1: {
      fontSize: '2.5rem',
      textAlign: 'center',
      marginBottom: '1rem',
    },
    body1: {
      textAlign: 'center',
      marginBottom: '1rem',
    },
  },
});

export default theme;
