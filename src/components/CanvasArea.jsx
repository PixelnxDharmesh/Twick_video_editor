import React, { useRef, useEffect, useState } from "react";
import { exportVideo } from "../components/VideoUploader";

function CanvasArea({
 videoRef,
  videoSource,
  canvasOptions,
  textOverlays,
  setTextOverlays,
  selectedId,
  setSelectedId,
  handleTimeUpdate,
  handleLoadedMetadata,
  handleVideoEnd, // NEW: Receive video end handler
  processingInfo,
  imageOverlays = [],
  setImageOverlays = () => {},
  deleteImageOverlay = () => {},
  updateImageOverlay = () => {},
  videoClips = []
}) {
  const containerRef = useRef(null);
  const draggingRef = useRef(null);
  const resizingRef = useRef(null);

  const [recordedUrl, setRecordedUrl] = useState("");
  const [recording, setRecording] = useState(false);

  // ---------------- DRAG / RESIZE LOGIC ----------------
  const handleContainerMouseDown = (e) => {
    if (e.target === containerRef.current || e.target.tagName === "VIDEO") {
      setSelectedId(null);
    }
  };

  const onOverlayMouseDown = (e, overlay) => {
    e.stopPropagation();
    setSelectedId(overlay.id);
    const parentRect = containerRef.current.getBoundingClientRect();
    draggingRef.current = {
      id: overlay.id,
      startX: e.clientX,
      startY: e.clientY,
      startPos: overlay.position,
    };
    document.addEventListener("mousemove", onDragMove);
    document.addEventListener("mouseup", onDragEnd);
  };

  const onDragMove = (e) => {
    if (!draggingRef.current) return;
    const { id, startX, startY, startPos } = draggingRef.current;
    const parentRect = containerRef.current.getBoundingClientRect();
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    const xPercent = startPos.x + (dx / parentRect.width) * 100;
    const yPercent = startPos.y + (dy / parentRect.height) * 100;

    setTextOverlays((prev) =>
      prev.map((o) =>
        o.id === id
          ? { ...o, position: { x: Math.max(0, Math.min(100, xPercent)), y: Math.max(0, Math.min(100, yPercent)) } }
          : o
      )
    );
  };

  const onDragEnd = () => {
    draggingRef.current = null;
    document.removeEventListener("mousemove", onDragMove);
    document.removeEventListener("mouseup", onDragEnd);
  };

  const onHandleMouseDown = (e, overlay, dir) => {
    e.stopPropagation();
    setSelectedId(overlay.id);

    resizingRef.current = {
      id: overlay.id,
      dir,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: overlay.width || 120,
      startHeight: overlay.height || 40,
      startFontSize: parseInt(overlay.style.fontSize) || 24,
    };

    document.addEventListener("mousemove", onResizeMove);
    document.addEventListener("mouseup", onResizeEnd);
  };

  const onResizeMove = (e) => {
    if (!resizingRef.current) return;
    const r = resizingRef.current;
    let newWidth = r.startWidth;
    let newHeight = r.startHeight;

    if (r.dir.includes("e")) newWidth = Math.max(40, r.startWidth + (e.clientX - r.startX));
    if (r.dir.includes("s")) newHeight = Math.max(20, r.startHeight + (e.clientY - r.startY));
    if (r.dir.includes("w")) newWidth = Math.max(40, r.startWidth - (e.clientX - r.startX));
    if (r.dir.includes("n")) newHeight = Math.max(20, r.startHeight - (e.clientY - r.startY));

    const scale = newWidth / r.startWidth;
    const newFontSize = Math.max(8, Math.round(r.startFontSize * scale));

    setTextOverlays((prev) =>
      prev.map((o) =>
        o.id === r.id
          ? {
              ...o,
              width: newWidth,
              height: newHeight,
              style: { ...o.style, fontSize: `${newFontSize}px` },
            }
          : o
      )
    );
  };

  const onResizeEnd = () => {
    resizingRef.current = null;
    document.removeEventListener("mousemove", onResizeMove);
    document.removeEventListener("mouseup", onResizeEnd);
  };

  // NEW: Image overlay drag and resize handlers
  const onImageMouseDown = (e, image) => {
    e.stopPropagation();
    setSelectedId(`image-${image.id}`); 
      
    const parentRect = containerRef.current.getBoundingClientRect();
    draggingRef.current = {
      type: 'image',
      id: image.id,
      startX: e.clientX,
      startY: e.clientY,
      startPos: image.position,
    };
    
    document.addEventListener("mousemove", onImageDragMove);
    document.addEventListener("mouseup", onImageDragEnd);
  };

  const onImageDragMove = (e) => {
    if (!draggingRef.current || draggingRef.current.type !== 'image') return;
    
    const { id, startX, startY, startPos } = draggingRef.current;
    const parentRect = containerRef.current.getBoundingClientRect();
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    const xPercent = startPos.x + (dx / parentRect.width) * 100;
    const yPercent = startPos.y + (dy / parentRect.height) * 100;

    updateImageOverlay(id, { 
      position: { 
        x: Math.max(0, Math.min(100, xPercent)), 
        y: Math.max(0, Math.min(100, yPercent)) 
      } 
    });
  };

  const onImageDragEnd = () => {
    if (draggingRef.current?.type === 'image') {
      draggingRef.current = null;
    }
    document.removeEventListener("mousemove", onImageDragMove);
    document.removeEventListener("mouseup", onImageDragEnd);
  };

  // NEW: Image resize handlers
  const onImageResizeMouseDown = (e, image, dir) => {
    e.stopPropagation();
    setSelectedId(`image-${image.id}`);

    resizingRef.current = {
      type: 'image',
      id: image.id,
      dir,
      startX: e.clientX,
      startY: e.clientY,
      startSize: image.size,
    };

    document.addEventListener("mousemove", onImageResizeMove);
    document.addEventListener("mouseup", onImageResizeEnd);
  };

  const onImageResizeMove = (e) => {
    if (!resizingRef.current || resizingRef.current.type !== 'image') return;
    
    const r = resizingRef.current;
    let newWidth = r.startSize.width;
    let newHeight = r.startSize.height;

    if (r.dir.includes("e")) newWidth = Math.max(50, r.startSize.width + (e.clientX - r.startX));
    if (r.dir.includes("s")) newHeight = Math.max(50, r.startSize.height + (e.clientY - r.startY));
    if (r.dir.includes("w")) newWidth = Math.max(50, r.startSize.width - (e.clientX - r.startX));
    if (r.dir.includes("n")) newHeight = Math.max(50, r.startSize.height - (e.clientY - r.startY));

    updateImageOverlay(r.id, { 
      size: { width: newWidth, height: newHeight } 
    });
  };

  const onImageResizeEnd = () => {
    if (resizingRef.current?.type === 'image') {
      resizingRef.current = null;
    }
    document.removeEventListener("mousemove", onImageResizeMove);
    document.removeEventListener("mouseup", onImageResizeEnd);
  };

  useEffect(() => {
    return () => {
      document.removeEventListener("mousemove", onDragMove);
      document.removeEventListener("mouseup", onDragEnd);
      document.removeEventListener("mousemove", onResizeMove);
      document.removeEventListener("mouseup", onResizeEnd);
      document.removeEventListener("mousemove", onImageDragMove);
      document.removeEventListener("mouseup", onImageDragEnd);
      document.removeEventListener("mousemove", onImageResizeMove);
      document.removeEventListener("mouseup", onImageResizeEnd);
    };
  }, []);

  // ---------------- EXPORT FUNCTION ----------------
  const handleExport = async () => {
    try {
      setRecording(true);
      const url = await exportVideo({ 
        videoRef, 
        textOverlays, 
        canvasOptions,
        processingInfo,
        imageOverlays,
        videoClips // Pass video clips to export
      });
      setRecordedUrl(url);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setRecording(false);
    }
  };

  // Get status indicator
  const getStatusIndicator = () => {
    if (!processingInfo) return null;
    
    if (processingInfo.type === 'trim') {
      return {
        color: '#4CAF50',
        text: `TRIMMED: ${Math.round(processingInfo.start)}s - ${Math.round(processingInfo.end)}s`,
        message: `Export will include only trimmed segment`
      };
    } else if (processingInfo.type === 'cut') {
      return {
        color: '#FF9800',
        text: `CUT: ${processingInfo.segments.length} segments`,
        message: `Export will include ${processingInfo.segments.length} video segments`
      };
    }
    return null;
  };

  const status = getStatusIndicator();

  return (
    <div
      ref={containerRef}
      className="canvas-container"
      style={{ position: "relative", userSelect: "none" }}
      onMouseDown={handleContainerMouseDown}
    >
       <div className="video-player" style={{ position: "relative" }}>
        <video
          ref={videoRef}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleVideoEnd} // NEW: Add video end event handler
          className={`
            ${canvasOptions.fill ? "fill" : ""}
            ${canvasOptions.fit ? "fit" : ""}
            ${canvasOptions.flipHorizontal ? "flip-horizontal" : ""}
            ${canvasOptions.flipVertical ? "flip-vertical" : ""}
          `}
          style={{ transform: `rotate(${canvasOptions.rotate}deg)`, width: "100%" }}
          src={videoSource}
        />
        
        {/* Processing Indicator Overlay */}
        {status && (
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: "none",
            border: `2px solid ${status.color}`,
            boxSizing: "border-box"
          }}>
            <div style={{
              position: "absolute",
              top: "10px",
              left: "10px",
              background: status.color,
              color: "white",
              padding: "5px 10px",
              borderRadius: "3px",
              fontSize: "12px",
              fontWeight: "bold"
            }}>
              {status.text}
            </div>
          </div>
        )}

        {/* Image Overlays */}
        {imageOverlays.map((image) => (
          <div
            key={image.id}
            onMouseDown={(e) => onImageMouseDown(e, image)}
            style={{
              position: "absolute",
              left: `${image.position.x}%`,
              top: `${image.position.y}%`,
              transform: "translate(-50%, -50%)",
              width: `${image.size.width}px`,
              height: `${image.size.height}px`,
              outline: selectedId === `image-${image.id}` ? "2px dashed blue" : "none",
              cursor: "move",
              overflow: "hidden",
              borderRadius: "4px"
            }}
          >
            <img
              src={image.source}
              alt={image.name}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                pointerEvents: "none",
                opacity: image.opacity || 1
              }}
              onError={(e) => {
                console.error("Image failed to load:", image.source);
                e.target.style.display = 'none';
              }}
            />

            {/* Resize Handles - ONLY SHOW WHEN SELECTED */}
            {selectedId === `image-${image.id}` && (
              <>
                {/* Resize Handles */}
                <div
                  onMouseDown={(e) => onImageResizeMouseDown(e, image, 'nw')}
                  style={{
                    position: "absolute",
                    top: "-5px",
                    left: "-5px",
                    width: "10px",
                    height: "10px",
                    background: "blue",
                    borderRadius: "50%",
                    cursor: "nwse-resize",
                    border: "2px solid white"
                  }}
                />
                <div
                  onMouseDown={(e) => onImageResizeMouseDown(e, image, 'ne')}
                  style={{
                    position: "absolute",
                    top: "-5px",
                    right: "-5px",
                    width: "10px",
                    height: "10px",
                    background: "blue",
                    borderRadius: "50%",
                    cursor: "nesw-resize",
                    border: "2px solid white"
                  }}
                />
                <div
                  onMouseDown={(e) => onImageResizeMouseDown(e, image, 'se')}
                  style={{
                    position: "absolute",
                    bottom: "-5px",
                    right: "-5px",
                    width: "10px",
                    height: "10px",
                    background: "blue",
                    borderRadius: "50%",
                    cursor: "nwse-resize",
                    border: "2px solid white"
                  }}
                />
            
                <div
                  onMouseDown={(e) => onImageResizeMouseDown(e, image, 'sw')}
                  style={{
                    position: "absolute",
                    bottom: "-5px",
                    left: "-5px",
                    width: "10px",
                    height: "10px",
                    background: "blue",
                    borderRadius: "50%",
                    cursor: "nesw-resize",
                    border: "2px solid white"
                  }}
                />
              </>
            )}
          </div>
        ))}

        {/* Text Overlays */}
        {textOverlays.map((overlay) => (
          <div
            key={overlay.id}
            onMouseDown={(e) => onOverlayMouseDown(e, overlay)}
            style={{
              position: "absolute",
              left: `${overlay.position?.x}%`,
              top: `${overlay.position?.y}%`,
              transform: "translate(-50%, -50%)",
              width: overlay.width || "auto",
              height: overlay.height || "auto",
              outline: selectedId === overlay.id ? "1px dashed blue" : "none",
              cursor: "move",
              display: "inline-block",
              padding: "4px",
            }}
          >
            <div
              style={{
                color: overlay.style.color,
                fontSize: overlay.style.fontSize,
                fontFamily: overlay.style.fontFamily,
                whiteSpace: "nowrap",
                pointerEvents: "none",
              }}
            >
              {overlay.text}
            </div>

            {selectedId === overlay.id &&
              ["nw", "ne", "se", "sw"].map((dir) => (
                <div
                  key={dir}
                  onMouseDown={(e) => onHandleMouseDown(e, overlay, dir)}
                  style={{
                    position: "absolute",
                    width: "10px",
                    height: "10px",
                    background: "white",
                    border: "1px solid black",
                    cursor: dir === "nw" || dir === "se" ? "nwse-resize" : "nesw-resize",
                    ...(dir === "nw" ? { top: -6, left: -6 } : {}),
                    ...(dir === "ne" ? { top: -6, right: -6 } : {}),
                    ...(dir === "se" ? { bottom: -6, right: -6 } : {}),
                    ...(dir === "sw" ? { bottom: -6, left: -6 } : {}),
                  }}
                />
              ))}
          </div>
        ))}
      </div>

      {/* Export Button */}
      <div style={{ marginTop: "10px" }}>
        <button onClick={handleExport} disabled={recording}>
          {recording ? "Exporting..." : "Export Video"}
        </button>
        {status && (
          <div style={{ fontSize: "12px", color: status.color, marginTop: "5px" }}>
            {status.message}
          </div>
        )}
        {recordedUrl && (
          <a
            href={recordedUrl}
            download="exported_video.webm"
            style={{ display: "block", marginTop: "5px" }}
          >
            Download Video
          </a>
        )}
      </div>
    </div>
  );
}

export default CanvasArea;
