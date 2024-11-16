import React, { useEffect, useState } from 'react';
import axios from 'axios';

function App() {
  const [data, setData] = useState(null);

  const isLocal = window.location.hostname === 'localhost';
  const baseUrl = isLocal 
    ? 'http://localhost:3000/EasySoundDatasetGeneration' 
    : 'https://shalinir8.github.io/EasySoundDatasetGeneration';

  useEffect(() => {
    axios.get('http://localhost:5000/api/data')
      .then(response => setData(response.data.message))
      .catch(error => console.error('Error fetching data:', error));
  }, []);

  return (
    <div>
      <h1>FoxVabrik</h1>
      <p>{data ? data : 'Backend is not running...'}</p>
      {!data && (
        <a 
          href={`${baseUrl}/vox_fabrik.exe`} 
          download
        >
          <button>Download Backend Starter</button>
        </a>
      )}
    </div>
  );
}

export default App;
