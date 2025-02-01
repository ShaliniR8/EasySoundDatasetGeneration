import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Box, Button, ButtonGroup, TextField, Typography, Grid, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, IconButton } from '@mui/material';
import ContentCutIcon from '@mui/icons-material/ContentCut';
import AudiotrackIcon from '@mui/icons-material/Audiotrack';
import AudioFileIcon from '@mui/icons-material/AudioFile';
import ListIcon from '@mui/icons-material/List';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js'
import Hover from 'wavesurfer.js/dist/plugins/hover.esm.js'
import RightDrawer from './KeptAudios'
import SpeechButtons from './SpeechButtons'
import axios from 'axios';

const pythonBaseUrl = process.env.REACT_APP_API_PYTHON_BASE_URL;
const nodeJSBaseUrl = process.env.REACT_APP_API_NODEJS_BASE_URL;
const audioUrl = `${pythonBaseUrl}/api/v1/audio`;
const regions = RegionsPlugin.create()

const TTS = () => {
  const location = useLocation();
  const { folderName } = location.state || {};
  const waveformRef = useRef(null);
  const timelineRef = useRef(null);
  const wavesurfer = useRef(null);
  const websocketUrl = process.env.REACT_APP_API_WEBSOCKET_URL;

  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [inputText, setInputText] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [keptTexts, setKeptTexts] = useState([]);
  const [disablePitch, setDisabledPitch] = useState(false)
  const [disableSpeed, setDisabledSpeed] = useState(false)
  const toggleDrawer = () => setIsDrawerOpen((prev) => !prev);

  useEffect(() => {
    wavesurfer.current = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: '#673ab7',
      progressColor: '#d1c4e9',
      height: 120,
      plugins: [
        regions, 
        Hover.create({
          lineColor: '#ff0000',
          lineWidth: 2,
          labelBackground: '#555',
          labelColor: '#fff',
          labelSize: '11px',
          formatTimeCallback: (seconds) => seconds.toFixed(2)
        }),
      ],
    });

    wavesurfer.current.on('decode', () => {
      regions.clearRegions();
      regions.addRegion({
        start: 0, 
        end: wavesurfer.current.getDuration(),
        content: 'Play, Resize, Crop', 
        color: 'rgba(144, 202, 249, 0.4)', 
        resize: true,
      });
    });

    console.log('WaveSurfer instance initialized:', wavesurfer.current);
  
    wavesurfer.current.on('error', (e) => {
      console.error('WaveSurfer error:', e);
      alert('Error loading audio file.');
    });
  
    return () => {
      if (wavesurfer.current) {
        wavesurfer.current.destroy();
      }
    };
  }, []);
  

  const refreshWaveform = async () => {
    if (wavesurfer.current) {
      console.log('audio URL: ', audioUrl);
      const response = await axios.get(`${pythonBaseUrl}/api/v1/audio`, {
        headers: {
          'ngrok-skip-browser-warning': true,
        },
        responseType: 'arraybuffer', // Required for binary data
      });
      const blob = new Blob([response.data], { type: 'audio/wav' });
      const blobUrl = URL.createObjectURL(blob);
      console.log('Blob URL being loaded:', blobUrl);
      wavesurfer.current.load(blobUrl); 

      wavesurfer.current.on('ready', () => {
        const duration = wavesurfer.current.getDuration();
        console.log('Audio loaded successfully. Duration:', duration);
        setEndTime(duration.toFixed(2));
      });

      regions.on('region-updated', (region) => {
        setStartTime(region.start);
        setEndTime(region.end);
        console.log('Updated region', region);
      })

      let activeRegion = null

      regions.on('region-clicked', (region, e) => {
        console.log('Stopping this from going to main waveform')
        e.stopPropagation()
        activeRegion = region
        region.play()
      })

      wavesurfer.current.on('interaction', () => {
        console.log("Interacting with main waveform.")
        activeRegion = null
        wavesurfer.current.play()
      })

      wavesurfer.current.on('error', (e) => {
        console.error('Error loading audio:', e);
      });
    }
  };

  const playSubsection = () => {
    if (!wavesurfer.current) return;
  
    const duration = wavesurfer.current.getDuration();
    wavesurfer.current.seekTo(startTime / duration);
    wavesurfer.current.play();

    const interval = setInterval(() => {
      if (wavesurfer.current.getCurrentTime() >= endTime) {
        wavesurfer.current.pause();
        clearInterval(interval);
      }
    }, 5);
  };
  

  const pausePlayback = () => {
    if (wavesurfer.current && wavesurfer.current.isPlaying()) {
      wavesurfer.current.pause();
    }
  };

  const handleReset = async () => {
    try {
      const response = await axios.post(
        `${pythonBaseUrl}/api/v1/reset_audio`,
        {
          headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': true,
          },
        }
      );
      console.log(response.data)
      await refreshWaveform();
    } catch (error) {
      console.error('Error restoring audio', error);
      alert('Error restoring audio.');
    }
  }
  const increasePitch = async () => {
    let ws_url = `${websocketUrl}/pitch`;
    const socket = new WebSocket(ws_url);
    socket.onopen = () => {
      console.log("WebSocket connected to:", ws_url);
      const params = {
        pitch_factor: 0.5
      };
      socket.send(JSON.stringify(params));
      setDisabledPitch(true)
    };

    socket.onerror = (event) => { console.error('WebSocket error:', event);
        setDisabledPitch(false)
      };
    
    socket.onmessage = (event) => {
      console.log("Raw WebSocket Event:", event);
      const data = JSON.parse(event.data);
      console.log("Parsed message:", data);

      if (data.type === "status") {
          console.log("Status update:", data.message);
          if (data.status === 'success') {
            refreshWaveform()
            setDisabledPitch(false)
            return;
          } else {
            console.log('Error')
            setDisabledPitch(false)
            return;
          }
      }
    };
  }
  const increaseSpeed = async () => {
    let ws_url = `${websocketUrl}/speed`;
    const socket = new WebSocket(ws_url);
    socket.onopen = () => {
      console.log("WebSocket connected to:", ws_url);
      const params = {
        speed_factor: 0.2
      };
      socket.send(JSON.stringify(params));
      setDisabledSpeed(true)
    };

    socket.onerror = (event) => { console.error('WebSocket error:', event);
        setDisabledSpeed(false)
      };
    
    socket.onmessage = (event) => {
      console.log("Raw WebSocket Event:", event);
      const data = JSON.parse(event.data);
      console.log("Parsed message:", data);

      if (data.type === "status") {
          console.log("Status update:", data.message);
          if (data.status === 'success') {
            refreshWaveform()
            setDisabledSpeed(false)
            return;
          } else {
            console.log('Error')
            setDisabledSpeed(false)
            return;
          }
      }
    };
  }
  const decreasePitch = async () => {
    let ws_url = `${websocketUrl}/pitch`;
    const socket = new WebSocket(ws_url);
    socket.onopen = () => {
      console.log("WebSocket connected to:", ws_url);
      const params = {
        pitch_factor: -0.5
      };
      socket.send(JSON.stringify(params));
      setDisabledPitch(true)
    };

    socket.onerror = (event) => { console.error('WebSocket error:', event);
        setDisabledPitch(false)
      };
    
    socket.onmessage = (event) => {
      console.log("Raw WebSocket Event:", event);
      const data = JSON.parse(event.data);
      console.log("Parsed message:", data);

      if (data.type === "status") {
          console.log("Status update:", data.message);
          if (data.status === 'success') {
            refreshWaveform()
            setDisabledPitch(false)
            return;
          } else {
            console.log('Error')
            setDisabledPitch(false)
            return;
          }
      }
    };
  }

  const decreaseSpeed = async () => {
    let ws_url = `${websocketUrl}/speed`;
    const socket = new WebSocket(ws_url);
    socket.onopen = () => {
      console.log("WebSocket connected to:", ws_url);
      const params = {
        speed_factor: -0.2
      };
      socket.send(JSON.stringify(params));
      setDisabledSpeed(true)
    };

    socket.onerror = (event) => { console.error('WebSocket error:', event);
        setDisabledSpeed(false)
      };
    
    socket.onmessage = (event) => {
      console.log("Raw WebSocket Event:", event);
      const data = JSON.parse(event.data);
      console.log("Parsed message:", data);

      if (data.type === "status") {
          console.log("Status update:", data.message);
          if (data.status === 'success') {
            refreshWaveform()
            setDisabledSpeed(false)
            return;
          } else {
            console.log('Error')
            setDisabledSpeed(false)
            return;
          }
      }
    };
  }

  const chopAudio = async () => {
    try {
      await axios.post(
        `${pythonBaseUrl}/api/v1/chop`,
        { start: startTime, end: endTime },
        {
          headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': true,
          },
        }
      );
      refreshWaveform();
    } catch (error) {
      console.error('Error chopping audio:', error);
      alert('Error chopping audio.');
    }
  };

  const generateAudio = async () => {
    if (!inputText.trim()) {
      alert('Please enter some text before generating audio.');
      return;
    }

    try {
      const response = await axios.post(
        `${pythonBaseUrl}/api/v1/generate`,
        { text: inputText },
        {
          headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': true,
          },
        }
      );
      
      console.log('Backend response:', response.data);
      refreshWaveform();
    } catch (error) {
      console.error('Error generating audio:', error);
      alert('Error generating audio.');
    }
  };

  const handleKeep = async () => {
    if (!inputText.trim()) {
      alert('Need both Text and Audio to keep.');
      return;
    }

    try {
      const response = await axios.post(
        `${pythonBaseUrl}/api/v1/keep`,
        { text: inputText, name_of_model: folderName },
        {
          headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': true,
          },
        }
      );

      console.log('Keep response:', response.data);
      setKeptTexts((prev) => [...prev, inputText]);
      setIsDrawerOpen(true);
    } catch (error) {
      console.error('Error keeping text:', error);
      alert('Error keeping text.');
    }
  };

  // TODO: Allow user to discard the samples
  // const discardSamples = async () => {
  //   try {
  //     const response = await axios.post(
  //       `${pythonBaseUrl}/api/v1/discard_all`,
  //       { model_name: folderName },
  //       {
  //         headers: {
  //           'Content-Type': 'application/json',
  //           'ngrok-skip-browser-warning': true,
  //         },
  //       }
  //     );
  //   }catch (error) {
  //     console.error('Error', error);
  //     alert('Failed to discard the samples.');
  //   }
  // }

  useEffect(() => {
    if (!folderName){
      alert("Please go to the main page and select a model.")
      return;
    };
    (async () => {
      try {
        const response = await axios.get(`${nodeJSBaseUrl}/api/v2/get_kept_samples`, {
          params: { folderName },
          headers: {
            'ngrok-skip-browser-warning': true,
          },
        });
        console.log('Kept files: ', response.data.texts)
        setKeptTexts(response.data.texts || []);
      } catch (error) {
        console.error('Error fetching kept samples:', error);
      }
    })();
  }, [folderName, nodeJSBaseUrl]);

  return (
    <Box sx={{ p: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4">
          Text-to-Speech (TTS) Tool
        </Typography>
        <IconButton onClick={toggleDrawer}>
          <ListIcon />
        </IconButton>
      </Box>

      <Box
        ref={waveformRef}
        sx={{ mb: 2, border: '1px solid #ddd', borderRadius: '4px' }}
      ></Box>
      <Box ref={timelineRef} sx={{ mb: 4 }}></Box>

      <SpeechButtons 
        chopAudio={chopAudio}
        playSubsection={playSubsection}
        pausePlayback={pausePlayback}
        increasePitch={increasePitch}
        decreasePitch={decreasePitch}
        increaseSpeed={increaseSpeed}
        decreaseSpeed={decreaseSpeed}
        handleKeep={handleKeep}
        handleReset={handleReset}
        disablePitch={disablePitch}
        disableSpeed={disableSpeed}
      />

      <br/>

      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12}>
          <TextField
            label="Enter Text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            fullWidth
            multiline
            rows={3}
          />
        </Grid>
        <Grid item xs={12} sm={3}>
          <Button
            variant="contained"
            color="info"
            startIcon={<AudiotrackIcon />}
            onClick={generateAudio}
            fullWidth
          >
            Generate Audio
          </Button>
        </Grid>
      </Grid>

      {/* TODO: Need to handle when user reloads page with kept samples */}
      {/* <Dialog open={isUnloadDialogueOpen} onClose={handleCloseUnloadDialog}>
        <DialogTitle>You have Unsaved Changes</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Please Download the kept sample to avoid losing progress.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseUnloadDialog} color="secondary">
            Cancel
          </Button>
          <Button onClick={discardSamples} color="primary">
            Discard Samples
          </Button>
        </DialogActions>
      </Dialog> */}
      <RightDrawer open={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} keptTexts={keptTexts} folderName={folderName}/>
    </Box>
  );
};

export default TTS;
