import { useRef, useState, useEffect } from "react";

function Timeline({ 
  currentTime, 
  duration, 
  setCurrentTime, 
  videoRef, 
  videoSource,
  textOverlays,
  trimStart,
  trimEnd,
  cutPoints,
  isTrimmed,
  isCut,
  setTrimStart,
  setTrimEnd,
  onAddVideo,
  onAddAudio,
  onAddImage,
  imageOverlays = []
}) {
  const trackRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [resizing, setResizing] = useState(null);
  
  const fileInputRef = useRef(null);
  const [videoClips, setVideoClips] = useState([]);

  // Helper functions ko component ke start mein define karo
  const getTrackIcon = (type) => {
    switch (type) {
      case 'video': return '🎬';
      case 'audio': return '🎵';
      case 'text': return '📝';
      case 'image': return '🖼️';
      default: return '●';
    }
  };

  const formatTimeForRuler = (time) => {
    if (!time || isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Get total duration including all videos
  const getTotalDuration = () => {
    if (videoClips.length === 0) return duration;
    const lastClip = videoClips[videoClips.length - 1];
    return lastClip.end;
  };

  // Initialize video clips when video loads
  useEffect(() => {
    if (duration > 0 && videoSource) {
      setVideoClips([{
        id: 'video-1',
        type: 'video',
        start: 0,
        end: duration,
        duration: duration,
        source: videoSource,
        name: 'Main Video'
      }]);
    }
  }, [duration, videoSource]);

  // Add new video clip function
  const addNewVideoClip = async (videoURL, fileName) => {
    // Get duration of new video
    const newVideoDuration = await getVideoDuration(videoURL);
    
    const lastClip = videoClips[videoClips.length - 1];
    const startTime = lastClip ? lastClip.end : 0;
    
    const newClip = {
      id: `video-${Date.now()}`,
      type: 'video',
      start: startTime,
      end: startTime + newVideoDuration,
      duration: newVideoDuration,
      source: videoURL,
      name: fileName
    };
    
    setVideoClips(prev => [...prev, newClip]);
  };

  // Helper function to get video duration
  const getVideoDuration = (url) => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.src = url;
      video.onloadedmetadata = () => {
        resolve(video.duration);
      };
      video.onerror = () => {
        resolve(10); // Fallback duration
      };
    });
  };

  const [tracks, setTracks] = useState([
    { id: 1, type: 'video', name: 'Video Track', clips: [] },
    { id: 2, type: 'audio', name: 'Audio Track', clips: [] },
    { id: 3, type: 'text', name: 'Text Overlays', clips: [] },
    { id: 4, type: 'image', name: 'Image Overlays', clips: [] }
  ]);

  // Update tracks when video clips change
  useEffect(() => {
    if (videoClips.length > 0) {
      setTracks(prevTracks => 
        prevTracks.map(track => 
          track.type === 'video' 
            ? { ...track, clips: videoClips }
            : track
        )
      );
    }
  }, [videoClips]);

  // Handle video file upload for multi-video
  const handleVideoUpload = async (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('video/')) {
      const videoURL = URL.createObjectURL(file);
      
      // Add new video clip to timeline
      await addNewVideoClip(videoURL, file.name);
      
      // Parent handler ko bhi call karo
      if (onAddVideo) {
        onAddVideo(getTotalDuration(), videoURL, file.name);
      }
      
      // Reset file input
      event.target.value = '';
    } else {
      alert('Please select a valid video file.');
    }
  };

  const triggerVideoUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // helper: calculate time based on mouse X
    // helper: calculate time based on mouse X
// Timeline.jsx mein yeh function update karo:
// Timeline.jsx mein yeh function update karo:
const updateTimeFromMouse = (e) => {
  if (!trackRef.current || !getTotalDuration()) return;

  const rect = trackRef.current.getBoundingClientRect();
  const offsetX = e.clientX - rect.left;
  const percent = Math.max(0, Math.min(1, offsetX / rect.width));
  const newTime = percent * getTotalDuration();

  // FIXED: Use the handleSeek function passed from Editor
  setCurrentTime(newTime);
};

  const handleMouseDown = (e) => {
    // Check if clicking on resize handle
    if (e.target.classList.contains('resize-handle')) {
      const trackId = parseInt(e.target.dataset.trackId);
      const clipId = e.target.dataset.clipId;
      const handleType = e.target.dataset.handleType;
      
      const rect = trackRef.current.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const startTime = (offsetX / rect.width) * getTotalDuration();
      
      setResizing({
        trackId,
        clipId,
        handleType,
        startX: e.clientX,
        startTime: startTime
      });
      e.stopPropagation();
    } else {
      // Regular timeline click for seeking
      setIsDragging(true);
      updateTimeFromMouse(e);
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      updateTimeFromMouse(e);
    } else if (resizing) {
      handleResizeMove(e);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setResizing(null);
  };

  const handleResizeMove = (e) => {
    if (!resizing || !trackRef.current || !getTotalDuration()) return;

    const rect = trackRef.current.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, offsetX / rect.width));
    const newTime = percent * getTotalDuration();

    setTracks(prevTracks => {
      return prevTracks.map(track => {
        if (track.id !== resizing.trackId) return track;
        
        return {
          ...track,
          clips: track.clips.map(clip => {
            if (clip.id !== resizing.clipId) return clip;
            
            let newStart = clip.start;
            let newEnd = clip.end;
            
            if (resizing.handleType === 'left') {
              // Resize left handle - change start time
              newStart = Math.max(0, Math.min(newTime, clip.end - 1)); // Minimum 1s duration
            } else if (resizing.handleType === 'right') {
              // Resize right handle - change end time
              newEnd = Math.max(clip.start + 1, Math.min(newTime, getTotalDuration())); // Minimum 1s duration
            }
            
            console.log(`Resizing ${clip.type}: ${newStart.toFixed(2)} - ${newEnd.toFixed(2)}`);
            
            return {
              ...clip,
              start: newStart,
              end: newEnd,
              duration: newEnd - newStart
            };
          })
        };
      });
    });
  };

  // Generate ruler marks based on total duration
  const generateRulerMarks = () => {
    const marks = [];
    const totalSeconds = getTotalDuration();
    const interval = Math.max(1, Math.floor(totalSeconds / 10));
    
    for (let i = 0; i <= totalSeconds; i += interval) {
      marks.push(
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${(i / totalSeconds) * 100}%`,
            height: "100%",
            width: "1px",
            background: "#666",
            display: "flex",
            flexDirection: "column",
            alignItems: "center"
          }}
        >
          <div style={{ 
            fontSize: "10px", 
            color: "#999", 
            marginTop: "2px",
            whiteSpace: "nowrap"
          }}>
            {formatTimeForRuler(i)}
          </div>
        </div>
      );
    }
    return marks;
  };

  const getClipStyle = (clip, trackType) => {
    const totalDuration = getTotalDuration();
    const left = (clip.start / totalDuration) * 100;
    const width = ((clip.end - clip.start) / totalDuration) * 100;

    const baseStyle = {
      position: "absolute",
      left: `${left}%`,
      width: `${width}%`,
      height: "80%",
      top: "10%",
      borderRadius: "4px",
      cursor: "move",
      overflow: "visible",
      minWidth: "30px",
      border: '2px solid transparent'
    };

    switch (trackType) {
      case 'video':
        return {
          ...baseStyle,
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          border: "2px solid #5a6fd8"
        };
      case 'audio':
        return {
          ...baseStyle,
          background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
          border: "2px solid #e66879"
        };
      case 'text':
        return {
          ...baseStyle,
          background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
          border: "2px solid #3aa8e6"
        };
      case 'image':
        return {
          ...baseStyle,
          background: "linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)",
          border: "2px solid #ff6b6b"
        };
      default:
        return baseStyle;
    }
  };

  const RenderResizeHandles = ({ clip, trackId }) => (
    <>
      {/* Left Resize Handle */}
      <div
        className="resize-handle"
        data-track-id={trackId}
        data-clip-id={clip.id}
        data-handle-type="left"
        style={{
          position: "absolute",
          left: "-6px",
          top: "0",
          bottom: "0",
          width: "12px",
          background: "rgba(255, 255, 255, 0.9)",
          cursor: "col-resize",
          border: "2px solid #333",
          borderRadius: "3px",
          zIndex: 30,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#333",
          fontSize: "10px",
          fontWeight: "bold"
        }}
        title="Drag to resize start time"
      >
        ⋮
      </div>
      
      {/* Right Resize Handle */}
      <div
        className="resize-handle"
        data-track-id={trackId}
        data-clip-id={clip.id}
        data-handle-type="right"
        style={{
          position: "absolute",
          right: "-6px",
          top: "0",
          bottom: "0",
          width: "12px",
          background: "rgba(255, 255, 255, 0.9)",
          cursor: "col-resize",
          border: "2px solid #333",
          borderRadius: "3px",
          zIndex: 30,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#333",
          fontSize: "10px",
          fontWeight: "bold"
        }}
        title="Drag to resize end time"
      >
        ⋮
      </div>
    </>
  );

  // Reset all clips to full duration
  const resetAllClips = () => {
    setVideoClips(prev => 
      prev.map(clip => ({
        ...clip,
        start: 0,
        end: getTotalDuration(),
        duration: getTotalDuration()
      }))
    );
  };

  return (
    <div className="timeline-container" style={{ background: "#1a1a1a", padding: "10px", borderRadius: "8px" }}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleVideoUpload}
        accept="video/*"
        style={{ display: "none" }}
      />
      
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
        <h3 style={{ margin: 0, color: "white", fontSize: "14px" }}>Timeline</h3>
        
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <div style={{ fontSize: "12px", color: "#4CAF50" }}>
            Videos: {videoClips.length} | Total: {formatTimeForRuler(getTotalDuration())}
          </div>
          
          {/* Reset Button */}
          <button 
            onClick={resetAllClips}
            style={{
              padding: "4px 8px",
              background: "#6c757d",
              color: "white",
              border: "none",
              borderRadius: "3px",
              cursor: "pointer",
              fontSize: "11px"
            }}
            title="Reset all clips to full duration"
          >
            Reset Clips
          </button>
        </div>
      </div>

      {/* Time Ruler */}
      <div 
        className="time-ruler" 
        style={{ 
          position: "relative", 
          height: "25px", 
          background: "#2d2d2d", 
          borderBottom: "1px solid #444",
          overflow: "hidden"
        }}
      >
        {generateRulerMarks()}
        
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            width: "2px",
            background: "#ff4444",
            left: `${(currentTime / getTotalDuration()) * 100}%`,
            zIndex: 10
          }}
        />
      </div>

      {/* Timeline Tracks */}
      <div
        className="timeline-tracks"
        ref={trackRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ 
          position: "relative", 
          background: "#252525",
          border: "1px solid #444",
          borderRadius: "4px",
          cursor: "pointer"
        }}
      >
        {tracks.map((track, trackIndex) => (
          <div
            key={track.id}
            className="timeline-track"
            style={{
              display: "flex",
              height: "70px",
              borderBottom: trackIndex < tracks.length - 1 ? "1px solid #333" : "none",
              background: trackIndex % 2 === 0 ? "#2a2a2a" : "#252525",
              position: "relative"
            }}
          >
            <div
              style={{
                width: "120px",
                padding: "10px",
                background: "#333",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                borderRight: "1px solid #444",
                fontSize: "12px",
                color: "white"
              }}
            >
              <span>{getTrackIcon(track.type)}</span>
              <span>{track.name}</span>
            </div>

            <div
              style={{
                flex: 1,
                position: "relative",
                padding: "8px"
              }}
            >
              <div style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: `repeating-linear-gradient(
                  90deg,
                  transparent,
                  transparent 49px,
                  #333 49px,
                  #333 50px
                )`
              }} />

              {/* Video Clips with Resize Handles */}
              {track.clips.map((clip) => (
                <div
                  key={clip.id}
                  style={getClipStyle(clip, track.type)}
                  title={`${clip.name}\n${formatTimeForRuler(clip.start)} - ${formatTimeForRuler(clip.end)}\nDrag the ⋮ handles to resize`}
                >
                  {/* Resize Handles */}
                  <RenderResizeHandles clip={clip} trackId={track.id} />
                  
                  {/* Clip Content */}
                  <div style={{
                    padding: "5px 8px",
                    color: "white",
                    fontSize: "11px",
                    fontWeight: "bold",
                    background: "rgba(0,0,0,0.4)",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    textAlign: "center"
                  }}>
                    {clip.name}
                    <br />
                    <span style={{ fontSize: "9px", opacity: "0.8" }}>
                      {formatTimeForRuler(clip.start)}-{formatTimeForRuler(clip.end)}
                    </span>
                  </div>
                </div>
              ))}

              {/* + Buttons after each video */}
              {track.type === 'video' && track.clips.map((clip) => (
                <button
                  key={`add-${clip.id}`}
                  onClick={triggerVideoUpload}
                  style={{
                    position: "absolute",
                    left: `${(clip.end / getTotalDuration()) * 100}%`,
                    top: "50%",
                    transform: "translate(-50%, -50%)",
                    width: "28px",
                    height: "28px",
                    background: "#28a745",
                    color: "white",
                    border: "none",
                    borderRadius: "50%",
                    cursor: "pointer",
                    fontSize: "16px",
                    fontWeight: "bold",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 25,
                    boxShadow: "0 2px 6px rgba(0,0,0,0.4)"
                  }}
                  title="Add another video after this one"
                >
                  +
                </button>
              ))}

              <div
                className="playhead"
                style={{
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  width: "2px",
                  background: "red",
                  left: `${(currentTime / getTotalDuration()) * 100}%`,
                  zIndex: 20,
                  pointerEvents: "none"
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        marginTop: "10px",
        color: "#999",
        fontSize: "12px"
      }}>
        <div>
          • Click to seek • Drag <strong>⋮</strong> handles to resize • Click <strong>+</strong> to add more videos
        </div>
        <div style={{ color: "#4CAF50", fontWeight: "bold" }}>
          Total: {formatTimeForRuler(getTotalDuration())}
        </div>
      </div>
    </div>
  );
}

export default Timeline;
