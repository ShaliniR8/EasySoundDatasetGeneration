import React, { useState, useEffect, useRef } from 'react';
import { Box, Button, ButtonGroup, TextField, Typography, Grid, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import ContentCutIcon from '@mui/icons-material/ContentCut';
import AudiotrackIcon from '@mui/icons-material/Audiotrack';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js'
import Hover from 'wavesurfer.js/dist/plugins/hover.esm.js'
import axios from 'axios';

const pythonBaseUrl = process.env.REACT_APP_API_PYTHON_BASE_URL;
const audioUrl = `${pythonBaseUrl}/api/v1/audio`;
const regions = RegionsPlugin.create()

const TTS = () => {
  const waveformRef = useRef(null);
  const timelineRef = useRef(null);
  const wavesurfer = useRef(null);

  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [inputText, setInputText] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const handleOpenDialog = () => setIsDialogOpen(true);
  const handleCloseDialog = () => setIsDialogOpen(false);

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
        setEndTime(duration.toFixed(1));
      });

      regions.on('region-updated', (region) => {
        setStartTime(region.start);
        setEndTime(region.end);
        console.log('Updated region', region);
      })

      let activeRegion = null
      regions.on('region-in', (region) => {
        console.log('region-in', region)
        activeRegion = region
      })

      regions.on('region-out', (region) => {
        console.log('region-out', region)
        if (activeRegion === region) {
          activeRegion = null
        }
      })

      regions.on('region-clicked', (region, e) => {
        console.log('Stopping this from going to main waveform')
        e.stopPropagation() // prevent triggering a click on the waveform
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

  const pausePlayback = () => {
    if (wavesurfer.current && wavesurfer.current.isPlaying()) {
      wavesurfer.current.pause();
    }
  };

  const chopAudio = async () => {
    handleCloseDialog(); // Close dialog after user confirms
    try {
      debugger
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

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" mb={4}>
        Text-to-Speech (TTS) Tool
      </Typography>

      <Box
        ref={waveformRef}
        sx={{ mb: 2, border: '1px solid #ddd', borderRadius: '4px' }}
      ></Box>
      <Box ref={timelineRef} sx={{ mb: 4 }}></Box>

      <Grid container spacing={2} alignItems="center" sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6}>
          <ButtonGroup fullWidth>
            <Button
              variant="contained"
              color="primary"
              startIcon={<PauseIcon />}
              onClick={pausePlayback}
            >
              Pause
            </Button>
            <Button
              variant="contained"
              color="success"
              startIcon={<ContentCutIcon />}
              onClick={handleOpenDialog}
            >
              Crop
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
    </Box>
  );
};

export default TTS;
