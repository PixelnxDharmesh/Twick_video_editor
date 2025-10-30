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
  imageOverlays = [],
  videoClips = [],
  setVideoClips
}) {
  const trackRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [resizing, setResizing] = useState(null);
  
  const fileInputRef = useRef(null);

  // FIXED: Timeline configuration
  const TIMELINE_CONFIG = {
    PIXELS_PER_SECOND: 100, // 100px per second - fixed scale
    MIN_CLIP_WIDTH: 40, // Minimum 40px width for clips
    TRACK_HEIGHT: 60
  };

  // Helper functions
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

  // FIXED: Get timeline width based on content
  const getTimelineWidth = () => {
    if (videoClips.length === 0) {
      return Math.max(800, (duration || 10) * TIMELINE_CONFIG.PIXELS_PER_SECOND);
    }
    
    const totalDuration = getTotalContentDuration();
    return Math.max(800, totalDuration * TIMELINE_CONFIG.PIXELS_PER_SECOND);
  };

  // Get total video content duration
  const getTotalContentDuration = () => {
    if (videoClips.length === 0) return duration || 10;
    const lastClip = videoClips[videoClips.length - 1];
    return lastClip.end;
  };

  // FIXED: Convert time to pixels
  const timeToPixels = (time) => {
    return time * TIMELINE_CONFIG.PIXELS_PER_SECOND;
  };

  // FIXED: Convert pixels to time
  const pixelsToTime = (pixels) => {
    return pixels / TIMELINE_CONFIG.PIXELS_PER_SECOND;
  };

  // FIXED: Check if current time is within video content
  const isTimeInVideoContent = (time) => {
    if (videoClips.length === 0) return true;
    
    for (const clip of videoClips) {
      if (time >= clip.start && time <= clip.end) {
        return true;
      }
    }
    return false;
  };

  // FIXED: Get playhead position in pixels
  const getPlayheadPosition = () => {
    return timeToPixels(currentTime);
  };

  // FIXED: Update time from mouse - using pixel-based calculation
  const updateTimeFromMouse = (e) => {
    if (!trackRef.current) return;

    const rect = trackRef.current.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const newTime = pixelsToTime(offsetX);

    // Only set time if it's within video content
    if (isTimeInVideoContent(newTime)) {
      setCurrentTime(newTime);
    } else {
      // If outside video content, set to end of last video
      setCurrentTime(getTotalContentDuration());
    }
  };

  // Handle video file upload for multi-video
  const handleVideoUpload = async (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('video/')) {
      const videoURL = URL.createObjectURL(file);
      
      // Get video duration
      const clipDuration = await getVideoDuration(videoURL);
      
      const lastClip = videoClips[videoClips.length - 1];
      const startTime = lastClip ? lastClip.end : 0;
      
      const newClip = {
        id: `video-${Date.now()}`,
        type: 'video',
        start: startTime,
        end: startTime + clipDuration,
        duration: clipDuration,
        source: videoURL,
        name: file.name,
        originalDuration: clipDuration // Store original duration
      };
      
      // Add to video clips
      setVideoClips(prev => [...prev, newClip]);
      
      // Reset file input
      event.target.value = '';
      
      console.log(`New video added: ${file.name}, Duration: ${clipDuration}s`);
    } else {
      alert('Please select a valid video file.');
    }
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

  const triggerVideoUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleMouseDown = (e) => {
    // FIXED: Better resize handle detection
    if (e.target.classList.contains('resize-handle')) {
      const clipId = e.target.dataset.clipId;
      const handleType = e.target.dataset.handleType;
      
      const rect = trackRef.current.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const startTime = pixelsToTime(offsetX);
      
      setResizing({
        clipId,
        handleType,
        startX: e.clientX,
        startTime: startTime,
        originalClip: videoClips.find(clip => clip.id === clipId)
      });
      e.stopPropagation();
      e.preventDefault();
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

  // FIXED: Improved resize move function with pixel-based calculation
  const handleResizeMove = (e) => {
    if (!resizing || !trackRef.current) return;

    const rect = trackRef.current.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const newTime = pixelsToTime(offsetX);

    setVideoClips(prevClips => {
      return prevClips.map(clip => {
        if (clip.id !== resizing.clipId) return clip;
        
        const originalClip = resizing.originalClip;
        let newStart = clip.start;
        let newEnd = clip.end;
        
        if (resizing.handleType === 'left') {
          // Resize left handle - change start time
          const minStart = originalClip.start;
          const maxStart = Math.min(originalClip.end - 0.5, clip.end - 0.5);
          newStart = Math.max(minStart, Math.min(newTime, maxStart));
        } else if (resizing.handleType === 'right') {
          // Resize right handle - change end time
          const minEnd = Math.max(originalClip.start + 0.5, clip.start + 0.5);
          const maxEnd = originalClip.end;
          newEnd = Math.max(minEnd, Math.min(newTime, maxEnd));
        }
        
        console.log(`Resizing ${clip.name}: ${newStart.toFixed(2)} - ${newEnd.toFixed(2)}`);
        
        return {
          ...clip,
          start: newStart,
          end: newEnd,
          duration: newEnd - newStart
        };
      });
    });
  };

  // Tracks setup for multiple videos
  const [tracks, setTracks] = useState([
    { id: 1, type: 'video', name: 'Video Track', clips: [] },
    { id: 2, type: 'audio', name: 'Audio Track', clips: [] },
    { id: 3, type: 'text', name: 'Text Overlays', clips: [] },
    { id: 4, type: 'image', name: 'Image Overlays', clips: [] }
  ]);

  // Update tracks when video clips change
  useEffect(() => {
    setTracks(prevTracks => 
      prevTracks.map(track => 
        track.type === 'video' 
          ? { ...track, clips: videoClips }
          : track
      )
    );
  }, [videoClips]);

  // FIXED: Generate ruler marks based on fixed pixel scale
  const generateRulerMarks = () => {
    const marks = [];
    const totalSeconds = Math.ceil(getTotalContentDuration());
    const timelineWidth = getTimelineWidth();
    
    // Show marks every 5 seconds or based on zoom level
    const interval = timelineWidth > 1500 ? 1 : timelineWidth > 800 ? 2 : 5;
    
    for (let i = 0; i <= totalSeconds; i += interval) {
      const position = timeToPixels(i);
      marks.push(
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${position}px`,
            height: "100%",
            width: "1px",
            background: i % (interval * 5) === 0 ? "#888" : "#666",
            display: "flex",
            flexDirection: "column",
            alignItems: "center"
          }}
        >
          <div style={{ 
            fontSize: "10px", 
            color: i % (interval * 5) === 0 ? "#fff" : "#999", 
            marginTop: "2px",
            whiteSpace: "nowrap",
            background: i % (interval * 5) === 0 ? "rgba(0,0,0,0.7)" : "transparent",
            padding: i % (interval * 5) === 0 ? "1px 3px" : "0",
            borderRadius: i % (interval * 5) === 0 ? "2px" : "0"
          }}>
            {formatTimeForRuler(i)}
          </div>
        </div>
      );
    }
    return marks;
  };

  // FIXED: Clip style calculation with pixel-based positioning
  const getClipStyle = (clip, trackType) => {
    const left = timeToPixels(clip.start);
    const width = Math.max(TIMELINE_CONFIG.MIN_CLIP_WIDTH, timeToPixels(clip.duration));

    const baseStyle = {
      position: "absolute",
      left: `${left}px`,
      width: `${width}px`,
      height: "70%",
      top: "15%",
      borderRadius: "4px",
      cursor: "move",
      overflow: "hidden",
      minWidth: `${TIMELINE_CONFIG.MIN_CLIP_WIDTH}px`,
      border: '2px solid transparent',
      boxSizing: 'border-box'
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

  // FIXED: Improved resize handles
  const RenderResizeHandles = ({ clip, trackId }) => (
    <>
      {/* Left Resize Handle */}
      <div
        className="resize-handle"
        data-clip-id={clip.id}
        data-handle-type="left"
        style={{
          position: "absolute",
          left: "0px",
          top: "0",
          bottom: "0",
          width: "8px",
          background: "rgba(255, 255, 255, 0.9)",
          cursor: "col-resize",
          border: "1px solid #333",
          borderRadius: "2px 0 0 2px",
          zIndex: 30,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#333",
          fontSize: "8px",
          fontWeight: "bold"
        }}
        title="Drag to resize start time"
        onMouseDown={(e) => e.stopPropagation()}
      >
        ⋮
      </div>
      
      {/* Right Resize Handle */}
      <div
        className="resize-handle"
        data-clip-id={clip.id}
        data-handle-type="right"
        style={{
          position: "absolute",
          right: "0px",
          top: "0",
          bottom: "0",
          width: "8px",
          background: "rgba(255, 255, 255, 0.9)",
          cursor: "col-resize",
          border: "1px solid #333",
          borderRadius: "0 2px 2px 0",
          zIndex: 30,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#333",
          fontSize: "8px",
          fontWeight: "bold"
        }}
        title="Drag to resize end time"
        onMouseDown={(e) => e.stopPropagation()}
      >
        ⋮
      </div>
    </>
  );

  // FIXED: Reset all clips to original duration
  const resetAllClips = () => {
    setVideoClips(prev => 
      prev.map(clip => {
        const originalDuration = clip.originalDuration || clip.duration;
        return {
          ...clip,
          start: clip.start,
          end: clip.start + originalDuration,
          duration: originalDuration
        };
      })
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
            Videos: {videoClips.length} | Scale: {TIMELINE_CONFIG.PIXELS_PER_SECOND}px/sec
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
            title="Reset all clips to original duration"
          >
            Reset Clips
          </button>
        </div>
      </div>

      {/* FIXED: Time Ruler with scrollable container */}
      <div style={{ overflowX: 'auto', border: '1px solid #444', borderRadius: '4px' }}>
        <div 
          className="time-ruler" 
          style={{ 
            position: "relative", 
            height: "25px", 
            background: "#2d2d2d", 
            width: `${getTimelineWidth()}px`,
            minWidth: "100%"
          }}
        >
          {generateRulerMarks()}
          
          {/* FIXED: Playhead - absolute pixel positioning */}
          <div
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              width: "2px",
              background: "#ff4444",
              left: `${getPlayheadPosition()}px`,
              zIndex: 10
            }}
          />
        </div>

        {/* FIXED: Timeline Tracks with scrollable container */}
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
            width: `${getTimelineWidth()}px`,
            minWidth: "100%",
            cursor: "pointer"
          }}
        >
          {tracks.map((track, trackIndex) => (
            <div
              key={track.id}
              className="timeline-track"
              style={{
                display: "flex",
                height: `${TIMELINE_CONFIG.TRACK_HEIGHT}px`,
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
                  color: "white",
                  flexShrink: 0
                }}
              >
                <span>{getTrackIcon(track.type)}</span>
                <span>{track.name}</span>
              </div>

              <div
                style={{
                  position: "relative",
                  height: "100%",
                  minWidth: `calc(100% - 120px)`
                }}
              >
                {/* Background grid */}
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
                    title={`${clip.name}\n${formatTimeForRuler(clip.start)} - ${formatTimeForRuler(clip.end)}\nDuration: ${formatTimeForRuler(clip.duration)}\nDrag the ⋮ handles to resize`}
                  >
                    {/* Resize Handles */}
                    <RenderResizeHandles clip={clip} trackId={track.id} />
                    
                    {/* Clip Content */}
                    <div style={{
                      padding: "2px 4px",
                      color: "white",
                      fontSize: "10px",
                      fontWeight: "bold",
                      background: "rgba(0,0,0,0.4)",
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      textAlign: "center"
                    }}>
                      <div>{clip.name}</div>
                      <div style={{ fontSize: "8px", opacity: "0.8" }}>
                        {formatTimeForRuler(clip.duration)}
                      </div>
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
                      left: `${timeToPixels(clip.end) + 5}px`,
                      top: "50%",
                      transform: "translateY(-50%)",
                      width: "20px",
                      height: "20px",
                      background: "#28a745",
                      color: "white",
                      border: "none",
                      borderRadius: "50%",
                      cursor: "pointer",
                      fontSize: "12px",
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

                {/* FIXED: Playhead - absolute pixel positioning */}
                <div
                  className="playhead"
                  style={{
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    width: "2px",
                    background: "red",
                    left: `${getPlayheadPosition()}px`,
                    zIndex: 20,
                    pointerEvents: "none"
                  }}
                />
              </div>
            </div>
          ))}
        </div>
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
          • Drag <strong>⋮</strong> handles to resize • Click <strong>+</strong> to add videos
        </div>
        <div style={{ color: "#4CAF50", fontWeight: "bold" }}>
          Duration: {formatTimeForRuler(getTotalContentDuration())}
        </div>
      </div>
    </div>
  );
}

export default Timeline;
