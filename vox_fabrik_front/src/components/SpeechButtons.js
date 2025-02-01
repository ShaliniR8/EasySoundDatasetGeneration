import React from 'react';
import { Box, Grid, Button, ButtonGroup } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import ContentCutIcon from '@mui/icons-material/ContentCut';
import AudioFileIcon from '@mui/icons-material/AudioFile';
import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import RestoreIcon from '@mui/icons-material/Restore';

function DashboardButtons({
  playSubsection,
  pausePlayback,
  chopAudio,
  increasePitch,
  decreasePitch,
  increaseSpeed,
  decreaseSpeed,
  handleKeep,
  handleReset,
  disablePitch,
  disableSpeed
}) {
  return (
    <Box sx={{ backgroundColor: '#f5f5f5', p: 2 }}>
      <Grid 
        container 
        spacing={2} 
        alignItems="center" 
  
        wrap="nowrap"
      >
        {/* Play / Pause buttons */}
        <Grid item>
          <ButtonGroup variant="contained" sx={{ borderTopLeftRadius: '16px', borderBottomLeftRadius: '16px', borderTopRightRadius: '16px', borderBottomRightRadius: '16px'}} >
            <Button
              color="primary"
              sx = {{borderTopLeftRadius: '16px', borderBottomLeftRadius: '16px'}}
              startIcon={<PlayArrowIcon />}
              onClick={playSubsection}
            >
              Play
            </Button>
            <Button
              sx={{
                backgroundColor: "#78909c",
                '&:hover': { backgroundColor: "#90a4ae" },
                borderTopRightRadius: '16px', borderBottomRightRadius: '16px'
              }}
              startIcon={<PauseIcon />}
              onClick={pausePlayback}
            >
              Pause
            </Button>
          </ButtonGroup>
        </Grid>

        {/* Crop, Pitch Up, Pitch Down, Speed Up, Speed Down */}
        <Grid item>
          <ButtonGroup variant="contained" sx={{ borderTopLeftRadius: '16px', borderBottomLeftRadius: '16px', borderTopRightRadius: '16px', borderBottomRightRadius: '16px'}} >
               <Button
               color="warning"
               sx={{ borderTopLeftRadius: '16px', borderBottomLeftRadius: '16px'}}
               startIcon={<ContentCutIcon />}
               onClick={chopAudio}
               >
               Crop
               </Button>
               <ButtonGroup disableElevation>
                    <Box
                    sx={{
                         backgroundColor: '#e0e0e0',
                         color: '#000',
                         px: 2,
                         display: 'flex',
                         alignItems: 'center',
                         fontWeight: 'bold',
                         height: '100%',
                    }}
                    >
                    <span style={{ marginRight: '8px', cursor: 'default' }}>PITCH</span>

                    <ButtonGroup variant="contained">
                         <Button sx={{padding: '2px'}} color="warning" onClick={increasePitch} disabled={disablePitch}><ArrowDropUpIcon/></Button>
                         <Button sx={{padding: '2px'}} color="warning" onClick={decreasePitch} disabled={disablePitch}><ArrowDropDownIcon/></Button>
                    </ButtonGroup>
                   </Box>
               </ButtonGroup>

               <ButtonGroup disableElevation>
                    <Box
                    sx={{
                         backgroundColor: '#e0e0e0',
                         color: '#000',
                         px: 2,
                         display: 'flex',
                         alignItems: 'center',
                         fontWeight: 'bold',
                         height: '100%',
                         borderTopRightRadius: '16px', borderBottomRightRadius: '16px'
                    }}
                    >
                    <span style={{ marginRight: '8px', cursor: 'default' }}>SPEED</span>

                    <ButtonGroup variant="contained" >
                         <Button sx={{padding: '2px'}}
                              color="warning"
                              disabled={disableSpeed}
                              onClick={increaseSpeed}>
                              <ArrowDropUpIcon/>
                         </Button>
                         <Button sx={{padding: '2px'}} color="warning" disabled={disableSpeed} onClick={decreaseSpeed}>
                         <ArrowDropDownIcon/>
                         </Button>
                    </ButtonGroup>
                   </Box>
               </ButtonGroup>
          </ButtonGroup>
        </Grid>

        {/* Keep / Reset buttons */}
        <Grid item>
          <ButtonGroup variant="contained" sx={{ borderTopLeftRadius: '16px', borderBottomLeftRadius: '16px', borderTopRightRadius: '16px', borderBottomRightRadius: '16px'}}>
            <Button
              variant="contained"
              color="success"
              sx={{ borderTopLeftRadius: '16px', borderBottomLeftRadius: '16px'}}
              startIcon={<AudioFileIcon />}
              onClick={handleKeep}
            >
              Keep
            </Button>
            <Button
              variant="contained"
              color="secondary"
              startIcon={<RestoreIcon/>}
              sx={{borderTopRightRadius: '16px', borderBottomRightRadius: '16px'}}
              onClick={handleReset}
            >
              Reset
            </Button>
          </ButtonGroup>
        </Grid>
      </Grid>
    </Box>
  );
}

export default DashboardButtons;
