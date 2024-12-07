import React, { useState, useEffect, useRef } from 'react';
import { Box, Button, ButtonGroup, TextField, Typography, Grid } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import ContentCutIcon from '@mui/icons-material/ContentCut';
import AudiotrackIcon from '@mui/icons-material/Audiotrack';
import WaveSurfer from 'wavesurfer.js';
import TimelinePlugin from 'wavesurfer.js/dist/plugins/timeline';
import axios from 'axios';

const pythonBaseUrl = process.env.REACT_APP_API_PYTHON_BASE_URL;

const TTS = () => {
  const waveformRef = useRef(null);
  const timelineRef = useRef(null);
  const wavesurfer = useRef(null);

  const [audioUrl, setAudioUrl] = useState(null);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [inputText, setInputText] = useState('');

  useEffect(() => {
    wavesurfer.current = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: '#673ab7',
      progressColor: '#d1c4e9',
      height: 80,
      plugins: [
        TimelinePlugin.create({
          container: timelineRef.current,
        }),
      ],
    });

    return () => {
      if (wavesurfer.current) {
        wavesurfer.current.destroy();
      }
    };
  }, []);

  useEffect(() => {
    if (audioUrl && wavesurfer.current) {
      wavesurfer.current.load(audioUrl);

      wavesurfer.current.on('ready', () => {
        const duration = wavesurfer.current.getDuration();
        setEndTime(duration.toFixed(1));
      });
    }
  }, [audioUrl]);

  const playSubsection = () => {
    if (!wavesurfer.current) return;
    if (startTime < endTime) {
      wavesurfer.current.play(startTime, endTime);
    } else {
      alert('Invalid start or end time.');
    }
  };

  const pausePlayback = () => {
    if (wavesurfer.current && wavesurfer.current.isPlaying()) {
      wavesurfer.current.pause();
    }
  };

  const chopAudio = async () => {
    if (startTime < endTime) {
      try {
        const response = await axios.post(
          `${pythonBaseUrl}/chop`,
          { start: startTime, end: endTime },
          {
            headers: {
              'Content-Type': 'application/json',
              'ngrok-skip-browser-warning': true
            }
          }
        );
        alert(response.data.message);
        if (response.data.audio_url) {
          setAudioUrl(response.data.audio_url);
        }
      } catch (error) {
        console.error('Error chopping audio:', error);
        alert('Error chopping audio.');
      }
    } else {
      alert('Invalid start or end time.');
    }
  };

  const generateAudio = async () => {
    if (!inputText.trim()) {
      alert('Please enter some text before generating audio.');
      return;
    }

    try {
      console.log(`URL: ${pythonBaseUrl}/api/v1/generate`)
      console.log(`inputText: ${inputText}`)
      const response = await axios.post(
        `${pythonBaseUrl}/api/v1/generate`,
        { text: inputText },
        {
          headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': true
          }
        }
      );

      alert(response.data.message);
      if (response.data.audio_url) {
        setAudioUrl(response.data.audio_url);
      } else {
        // If no audio_url is provided, fallback
        setAudioUrl('/tts.wav');
      }
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
        <Grid item xs={12} sm={3}>
          <TextField
            label="Start Time (seconds)"
            type="number"
            value={startTime}
            onChange={(e) => setStartTime(parseFloat(e.target.value))}
            fullWidth
            InputProps={{ inputProps: { min: 0, step: 0.1 } }}
          />
        </Grid>
        <Grid item xs={12} sm={3}>
          <TextField
            label="End Time (seconds)"
            type="number"
            value={endTime}
            onChange={(e) => setEndTime(parseFloat(e.target.value))}
            fullWidth
            InputProps={{ inputProps: { min: 0, step: 0.1 } }}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <ButtonGroup fullWidth>
            <Button
              variant="contained"
              color="primary"
              startIcon={<PlayArrowIcon />}
              onClick={playSubsection}
            >
              Play
            </Button>
            <Button
              variant="outlined"
              color="secondary"
              startIcon={<PauseIcon />}
              onClick={pausePlayback}
            >
              Pause
            </Button>
            <Button
              variant="contained"
              color="success"
              startIcon={<ContentCutIcon />}
              onClick={chopAudio}
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
    </Box>
  );
};

export default TTS;
