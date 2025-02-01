import React, { useState } from 'react';
import { Button, FormControl, InputLabel, MenuItem, Select, TextField, Switch, Typography, Box, Tooltip, Modal, Alert, CircularProgress, LinearProgress, Stack, ToggleButton, ToggleButtonGroup } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import InfoTwoToneIcon from '@mui/icons-material/InfoTwoTone';
import axios from 'axios';
import styled from '@emotion/styled';

const nodeJSBaseUrl = process.env.REACT_APP_API_NODEJS_BASE_URL;
const pythonBaseUrl = process.env.REACT_APP_API_PYTHON_BASE_URL;
const websocketUrl = process.env.REACT_APP_API_WEBSOCKET_URL;
const VisuallyHiddenInput = styled('input')({
  display: 'none',
});

const settingsStyle = {
  borderBottom: '1px solid #ddd',
  paddingBottom: '1rem',
  marginBottom: '1rem',
  padding: '8px',
  backgroundColor: '#80808017',
  borderRadius: '8px'
}

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 500,
  bgcolor: 'background.paper',
  boxShadow: 24,
  p: 4,
};

const CreateVoiceModels = ({castedDirectories, folders}) => {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(null);
  const [loadingStage, setLoadingStage] = useState('idle');
  const [successMessage, setSuccessMessage] = useState(null);
  const [progress, setProgress] = useState(0);
  const [processing, setProcessing] = useState(null);
  const [epoch, setEpoch] = useState(1)
  const [learningRate, setLearningRate] = useState(0.00005)
  const [squim, setSquim] = useState(false);
  const [pitch, setPitch] = useState(true); 
  const [snr, setSNR] = useState(true);
  const [rate, setRate] = useState(true);
  const [incrementalTraining, setIncrementalTraining] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState("");
  const [prefix, setPrefix] = useState("")

  const handlePrefixTextFieldChange = (event) => {
    setPrefix(event.target.value)
  }

  const handleSwitchChange = (event) => {
    setIncrementalTraining(event.target.checked);
    setSelectedFolder("");
    setError(null)
    if (!event.target.checked) {
      setPrefix('')
    }
  };

  const handleDropdownChange = (event) => {
    setSelectedFolder(event.target.value);
    setError(false)
  };

  const handleToggleChange = (event, newToggles) => {
    if (newToggles.includes('SQUIM') || newToggles.length === 3) {
      setSquim(newToggles.includes('SQUIM')); // Update SQUIM state only
    }
  };

  const handleEpochTextFieldChange = (event) => { setEpoch(event.target.value); };
  const handleLearningRateTextFieldChange = (event) => { setLearningRate(event.target.value); };
  const handleOpen = () => setOpen(true);
  const handleClose = () => {
    setOpen(false);
    setError(null);
    setSuccessMessage(null);
    setLoadingStage('idle');
    setProgress(0);
  };

  const validateZipFile = async (fileName) => {
    try {
        const response = await axios.post(`${nodeJSBaseUrl}/api/v2/datasets/validate`, { fileName }, {
            headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": true },
        });

        if (response.data.status === 'success') {
            setSuccessMessage('ZIP file validated successfully.');
            setLoadingStage('csvValidation');
        } else {
            setError(`Validation failed: ${response.data.message}`);
            setLoadingStage('idle');
        }
    } catch (err) {
        setError('Error validating zip file: ' + (err.response?.data?.message || err.message));
        setLoadingStage('idle');
    }
};


  const handleFileUpload = async (event) => {
    setLoadingStage('uploading');
    setError(null);
    setSuccessMessage(null);
    setProgress(0);

    if (incrementalTraining && !selectedFolder){
      event.stopPropagation(); 
      setError('For incremental training, you must select a model.');
      setLoadingStage('idle');
      return;
    }
    

    const files = event.target.files;
    // const file = files[0];

    // if (!file) {
    //     setError('No file selected. Please upload a zip file.');
    //     setLoadingStage('idle');
    //     return;
    // }

    // const chunkSize = 1024 * 1024; // 1 MB
    // const totalChunks = Math.ceil(file.size / chunkSize);

    // // Upload chunks
    // for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
    //     const start = chunkIndex * chunkSize;
    //     const end = Math.min(file.size, start + chunkSize);
    //     const chunk = file.slice(start, end);

    //     const formData = new FormData();
    //     formData.append('chunk', chunk);
    //     formData.append('fileName', file.name);
    //     formData.append('chunkIndex', chunkIndex);
    //     formData.append('totalChunks', totalChunks);

    //     try {
    //         await axios.post(`${nodeJSBaseUrl}/api/v2/datasets/upload-chunk`, formData, {
    //             headers: { 'Content-Type': 'multipart/form-data', "ngrok-skip-browser-warning": true },
    //         });

    //         setProgress(Math.round(((chunkIndex + 1) / totalChunks) * 100));
    //     } catch (err) {
    //         console.error('Error uploading chunk:', err.response ? err.response.data : err.message);
    //         setError(`Failed to upload chunk ${chunkIndex + 1} of ${totalChunks}: ${err.message}`);
    //         setLoadingStage('idle');
    //         return;
    //     }
    // }

    try {
        // setLoadingStage('zipValidation');
        // await validateZipFile(file.name);

        setLoadingStage('csvValidation');
        const validateCsvResponse = await axios.post(`${pythonBaseUrl}/api/v1/datasets/validate_csv`, {
          headers: { 'Content-Type': 'application/json', "ngrok-skip-browser-warning": true },
        });

        if (validateCsvResponse.data.status !== 'success') {
          setError('CSV validation failed: ' + validateCsvResponse.data.message);
          setLoadingStage('idle');
          return;
        }

        // setSuccessMessage('CSV file validated successfully.');
        setLoadingStage('extractingFeatures');
        
        let ws_url = `${websocketUrl}/feature_extraction`;
        const socket = new WebSocket(ws_url);
        socket.onopen = () => {
          console.log("WebSocket connected to:", ws_url);
          const params = {
            squim: squim,
            pitch: pitch,
            snr: snr,
            rate: rate,
            stage: null,
            output_folder_name: null,
            epoch: epoch,
            learning_rate: learningRate,
            uses_incremental_training: incrementalTraining,
            checkpoint_folder: selectedFolder,
            model_prefix: prefix
          };
          socket.send(JSON.stringify(params));
        };

        socket.onerror = (event) => { console.error('WebSocket error:', event);  };
        
        socket.onmessage = (event) => {
          console.log("Raw WebSocket Event:", event);
          const data = JSON.parse(event.data);
          console.log("Parsed message:", data);
  
          if (data.type === "status") {
              console.log("Status update:", data.message);
              if (data.status === 'success') {
                setSuccessMessage(data.message);
                setLoadingStage('idle');
              } else {
                setError('Feature Extraction failed');
                setLoadingStage('idle');
                return;
              }
          }
  
          if (data.type === "progress") {
              console.log("Progress update:", data.progress);
              setProgress(data.progress);
          }
        };
        
        socket.onerror = (error) => {
          console.error("WebSocket error:", error);
        };
        
        socket.onclose = () => {
          console.log("WebSocket connection closed");
        };
    } catch (err) {
        console.error('Error validating zip file:', err.response ? err.response.data : err.message);
        setError('Validation failed: ' + (err.response?.data?.message || err.message));
        setLoadingStage('idle');
    }
};

const castedDatasetContinuation = async (dir) => {
  setError(null);
  setSuccessMessage(null);
  setProgress(0);
  setProcessing(dir);
  try {
      setLoadingStage('extractingFeatures');
      let ws_url = `${websocketUrl}/feature_extraction`
      const socket = new WebSocket(ws_url);
      socket.onopen = () => {
        console.log("WebSocket connected to:", ws_url);
        const params = {
          squim: squim,
          pitch: pitch,
          snr: snr,
          rate: rate,
          stage: 'casted',
          output_folder_name: dir,
          epoch: epoch,
          learning_rate: learningRate,
          uses_incremental_training: incrementalTraining,
          checkpoint_folder: selectedFolder,
          model_prefix: prefix
        };
        socket.send(JSON.stringify(params));
      };

      socket.onerror = (event) => { console.error('WebSocket error:', event);  };
      
      socket.onmessage = (event) => {
        console.log("Raw WebSocket Event:", event);
        const data = JSON.parse(event.data);
        console.log("Parsed message:", data);

        if (data.type === "status") {
            console.log("Status update:", data.message);
            if (data.status === 'success') {
              setSuccessMessage(data.message);
              setLoadingStage('idle');
            } else {
              setError('Feature Extraction failed');
              setLoadingStage('idle');
              return;
            }
        }

        if (data.type === "progress") {
            console.log("Progress update:", data.progress);
            setProgress(data.progress);
        }
      };
      
      socket.onerror = (error) => {
        console.error("WebSocket error:", error);
      };
      
      socket.onclose = () => {
        console.log("WebSocket connection closed");
      };
  } catch (err) {
      console.error('Extraction Failed:', err.response ? err.response.data : err.message);
      setError('Extraction failed: ' + (err.response?.data?.message || err.message));
      setLoadingStage('idle');
  }
};

  return (
    <div>
      <Button variant="contained" color="primary" onClick={handleOpen}>
        Create Voice Model
      </Button>
      <Modal open={open} onClose={handleClose} aria-labelledby="create-voice-model-modal" aria-describedby="instructions-for-uploading-audio-folder"> 
        <Box sx={style}>
          <Box sx={settingsStyle}>
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', padding: '5px' }}>
              <Typography sx={{margin: '5px'}}>Incremental Training</Typography>
              <Switch
                checked={incrementalTraining}
                onChange={handleSwitchChange}
                color="primary"
              />
            </Box>
            {incrementalTraining && (
              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel id="folder-select-label">Select Model</InputLabel>
                <Select
                  labelId="folder-select-label"
                  id="folder-select"
                  value={selectedFolder}
                  onChange={handleDropdownChange}
                >
                  {folders.map((folder, index) => (
                    <MenuItem key={index} value={folder}>
                      {folder}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', padding: '5px' }}>
              <TextField id="epoch" label="Epochs" variant="outlined" value={epoch} onChange={handleEpochTextFieldChange}/>
              <TextField id="learning-rate" label="Learning Rate" value={learningRate} onChange={handleLearningRateTextFieldChange}/>
              <TextField id="model-prefix" disabled={incrementalTraining} label="Model Prefix" value={prefix} onChange={handlePrefixTextFieldChange} placeholder='Helpful prefix to identify your model'/>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <ToggleButtonGroup
                value={['PITCH', 'SNR', 'RATE', squim ? 'SQUIM' : null].filter(Boolean)}
                onChange={handleToggleChange}
                exclusive={false}
                sx={{ flexWrap: 'wrap', justifyContent: 'center' }}
              >
                {/* SQUIM Toggle */}
                <ToggleButton
                  value="SQUIM"
                  selected={squim}
                  sx={{
                    borderRadius: '20px',
                    fontWeight: 'bold',
                    textTransform: 'none',
                  }}
                >
                  SQUIM
                  <Tooltip title="Compute SI-SDR, PESQ, STOI" arrow>
                    <InfoTwoToneIcon fontSize="small" color="primary" sx={{ ml: 1 }} />
                  </Tooltip>
                </ToggleButton>

                {/* Disabled Toggles */}
                <ToggleButton
                  value="PITCH"
                  disabled
                  sx={{
                    borderRadius: '20px',
                    fontWeight: 'bold',
                    textTransform: 'none',
                  }}
                >
                  PITCH
                </ToggleButton>
                <ToggleButton
                  value="SNR"
                  disabled
                  sx={{
                    borderRadius: '20px',
                    fontWeight: 'bold',
                    textTransform: 'none',
                  }}
                >
                  SNR
                </ToggleButton>
                <ToggleButton
                  value="RATE"
                  disabled
                  sx={{
                    borderRadius: '20px',
                    fontWeight: 'bold',
                    textTransform: 'none',
                  }}
                >
                  RATE
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>
    </Box>
          <Box sx={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
            <Button component="label" role={undefined} variant="contained" tabIndex={-1} startIcon={<CloudUploadIcon />}>
              Upload Folder
              <VisuallyHiddenInput type="file" webkitdirectory="true" multiple onChange={handleFileUpload} />
            </Button>
          </Box>

          {loadingStage === 'zipValidation' && <Alert severity="info" sx={{ mt: 2 }}>Validating ZIP file...</Alert>}
          {loadingStage === 'csvValidation' && <Alert severity="info" sx={{ mt: 2 }}>Validating CSV file...</Alert>}
          {loadingStage === 'extractingFeatures' && (
            <Box sx={{ mt: 2 }}>
              <Alert severity="info">Extracting Features...</Alert>
              <LinearProgress variant="determinate" value={progress} sx={{ mt: 1 }} />
              <Typography>{progress}%</Typography>
            </Box>
          )}
          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
          {successMessage && <Alert severity="success" sx={{ mt: 2 }}>{successMessage}</Alert>}
          {loadingStage !== 'idle' && <CircularProgress sx={{ mt: 2 }} />}

          {loadingStage === 'uploading' && (
              <Box sx={{ mt: 2 }}>
                  <Alert severity="info">Uploading file...</Alert>
                  <LinearProgress variant="determinate" value={progress} sx={{ mt: 1 }} />
                  <Typography>{progress}%</Typography>
              </Box>
          )}
          {castedDirectories.length > 0 && (
            <Stack direction="row" spacing={2} sx={{ mt: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
            {castedDirectories.map((dir, index) => (
              <Button
                key={index}
                variant="outlined"
                sx={{
                  borderRadius: '50px',
                  borderColor: 'purple',
                  color: 'purple',
                  textTransform: 'none',
                  fontWeight: 'bold',
                }}
                onClick={() => castedDatasetContinuation(dir)}
                disabled = {processing === dir}
              >
                {dir}
              </Button>
            ))}
          </Stack>
          )}
        </Box>
      </Modal>
    </div>
  );
};

export default CreateVoiceModels;
