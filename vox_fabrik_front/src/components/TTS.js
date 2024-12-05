import React from 'react';
import { useLocation } from 'react-router-dom';

const TTS = () => {
  const location = useLocation();
  const folderName = location.state?.folderName;

  return (
    <div>
      <h1>TTS Page</h1>
      {folderName ? <p>Selected Folder: {folderName}</p> : <p>No folder selected</p>}
    </div>
  );
};

export default TTS;
