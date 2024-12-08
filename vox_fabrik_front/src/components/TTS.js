import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Box, Button, ButtonGroup, TextField, Typography, Grid, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, List,  IconButton } from '@mui/material';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ContentCutIcon from '@mui/icons-material/ContentCut';
import AudiotrackIcon from '@mui/icons-material/Audiotrack';
import AudioFileIcon from '@mui/icons-material/AudioFile';
import ListIcon from '@mui/icons-material/List';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js'
import Hover from 'wavesurfer.js/dist/plugins/hover.esm.js'
import RightDrawer from './KeptAudios'
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

  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [inputText, setInputText] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [keptTexts, setKeptTexts] = useState([]);

  const handleOpenDialog = () => setIsDialogOpen(true);
  const handleCloseDialog = () => setIsDialogOpen(false);
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

  const chopAudio = async () => {
    handleCloseDialog();
    try {
      console.log(endTime)
      const response = await axios.post(
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
        { text: inputText, model_name: folderName },
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

      <Grid container spacing={2} alignItems="center" sx={{ mb: 4 }}>
        <Grid item xs={12} sm={8}>
          <ButtonGroup fullWidth>
            <Button
                variant="contained"
                color="primary"
                startIcon={<PlayArrowIcon />}
                onClick={playSubsection}
              >
                Play Subsection
            </Button>
            <Button
              variant="contained"
              sx={{
                backgroundColor: "#78909c",
                '&:hover': { backgroundColor: "#90a4ae"},
              }}
              startIcon={<PauseIcon />}
              onClick={pausePlayback}
            >
              Pause
            </Button>
            <Button
              variant="outlined"
              color="secondary"
              startIcon={<ContentCutIcon />}
              onClick={handleOpenDialog}
            >
              Crop
            </Button>
            <Button
              variant="contained"
              color="success"
              startIcon={<AudioFileIcon />}
              onClick={handleKeep}
            >
              Keep
            </Button>
          </ButtonGroup>
        </Grid>
      </Grid>

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
      <Dialog open={isDialogOpen} onClose={handleCloseDialog}>
        <DialogTitle>Confirm Audio Modification</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure? This audio will be modified, and you will not be able to recover the original audio.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="secondary">
            Cancel
          </Button>
          <Button onClick={chopAudio} color="primary">
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

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
