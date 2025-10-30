// Alternative simple export function - Complete version
export async function exportVideo({ videoRef, textOverlays, canvasOptions, processingInfo, imageOverlays = [], videoClips = [] }) {
  // Agar multiple videos hain toh warning show karo
  if (videoClips && videoClips.length > 1) {
    console.warn("Multiple videos export currently supports only single video. Using first video only.");
  }

  return new Promise(async (resolve) => {
    const video = videoRef.current;
    if (!video) {
      throw new Error("Video element not found");
    }

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    // Canvas size set karo video ke dimensions pe
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const stream = canvas.captureStream(30);
    const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
    const chunks = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      resolve(url);
    };

    recorder.onerror = (error) => {
      console.error("Recording error:", error);
      resolve(null);
    };

    // Preload images
    const imagePromises = imageOverlays.map(img => {
      return new Promise((resolveImg) => {
        const image = new Image();
        image.crossOrigin = "anonymous";
        image.onload = () => {
          console.log("Image loaded successfully:", img.source);
          resolveImg({ image, imgObj: img });
        };
        image.onerror = () => {
          console.error("Failed to load image:", img.source);
          resolveImg(null);
        };
        image.src = img.source;
      });
    });

    const loadedImages = await Promise.all(imagePromises);
    console.log("Loaded images:", loadedImages.filter(img => img !== null).length);

    // Trim times set karo
    let startTime = 0;
    let endTime = video.duration;

    if (processingInfo) {
      if (processingInfo.type === 'trim') {
        startTime = processingInfo.start;
        endTime = processingInfo.end;
      } else if (processingInfo.type === 'cut' && processingInfo.segments.length > 0) {
        startTime = processingInfo.segments[0].start;
        endTime = processingInfo.segments[0].end;
      }
    }

    recorder.start();
    video.currentTime = startTime;

    // Wait for video to be ready
    await new Promise(resolve => {
      const onSeeked = () => {
        video.removeEventListener('seeked', onSeeked);
        resolve();
      };
      video.addEventListener('seeked', onSeeked);
    });

    let isRecording = true;

    const drawFrame = () => {
      if (!isRecording) return;

      try {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Apply canvas transformations
        ctx.save();
        
        // Flip horizontal
        if (canvasOptions?.flipHorizontal) {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }
        
        // Flip vertical
        if (canvasOptions?.flipVertical) {
          ctx.translate(0, canvas.height);
          ctx.scale(1, -1);
        }
        
        // Rotate
        if (canvasOptions?.rotate) {
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate((canvasOptions.rotate * Math.PI) / 180);
          ctx.translate(-canvas.width / 2, -canvas.height / 2);
        }

        // Draw video
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        ctx.restore();
        
        // Draw images
        loadedImages.forEach((loadedImage) => {
          if (loadedImage && loadedImage.image) {
            try {
              const { image, imgObj } = loadedImage;
              const x = (imgObj.position.x / 100) * canvas.width - (imgObj.size.width / 2);
              const y = (imgObj.position.y / 100) * canvas.height - (imgObj.size.height / 2);
              
              ctx.save();
              ctx.globalAlpha = imgObj.opacity || 1;
              ctx.drawImage(image, x, y, imgObj.size.width, imgObj.size.height);
              ctx.restore();
            } catch (error) {
              console.error("Error drawing image:", error);
            }
          }
        });
        
        // Draw text
        textOverlays.forEach(textObj => {
          try {
            ctx.save();
            ctx.fillStyle = textObj.style.color || "#ffffff";
            ctx.font = `${textObj.style.fontSize || "24px"} ${textObj.style.fontFamily || "Arial"}`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            
            const x = (textObj.position?.x || 50) / 100 * canvas.width;
            const y = (textObj.position?.y || 50) / 100 * canvas.height;
            
            ctx.fillText(textObj.text, x, y);
            ctx.restore();
          } catch (error) {
            console.error("Error drawing text:", error);
          }
        });

        // Check if video should continue
        if (video.currentTime >= endTime || video.ended || video.paused) {
          console.log("Stopping recording - video ended or reached end time");
          isRecording = false;
          if (recorder.state === "recording") {
            recorder.stop();
          }
          return;
        }

        requestAnimationFrame(drawFrame);
      } catch (error) {
        console.error("Error in drawFrame:", error);
        isRecording = false;
        if (recorder.state === "recording") {
          recorder.stop();
        }
      }
    };

    // Video events handle karo
    video.addEventListener('ended', () => {
      console.log("Video ended event");
      isRecording = false;
      if (recorder.state === "recording") {
        recorder.stop();
      }
    });

    video.addEventListener('error', (error) => {
      console.error("Video error:", error);
      isRecording = false;
      if (recorder.state === "recording") {
        recorder.stop();
      }
    });

    // Start video playback and drawing
    try {
      await video.play();
      console.log("Video playback started");
      drawFrame();
    } catch (error) {
      console.error("Failed to play video:", error);
      // Phir bhi drawing start karo
      drawFrame();
    }

    // Safety timeout - agar 30 seconds se zyada ho jaye toh stop kar do
    setTimeout(() => {
      if (recorder.state === "recording") {
        console.log("Safety timeout - stopping recording");
        isRecording = false;
        recorder.stop();
      }
    }, 30000);
  });
}

// Fallback function for multiple videos (simple implementation)
async function exportMultipleVideos({ videoClips, textOverlays, canvasOptions, imageOverlays }) {
  console.warn("Multiple videos export using first video only in simple mode");
  
  // Temporary video element create karo
  const tempVideo = document.createElement('video');
  tempVideo.src = videoClips[0].source;
  
  await new Promise(resolve => {
    tempVideo.onloadedmetadata = resolve;
  });

  const tempVideoRef = { current: tempVideo };
  
  return exportVideo({
    videoRef: tempVideoRef,
    textOverlays,
    canvasOptions,
    imageOverlays
  });
}
