  // Updated exportVideo function for multiple videos
export async function exportVideo({ videoRef, textOverlays, canvasOptions, processingInfo, imageOverlays = [], videoClips = [] }) {
  // Agar multiple videos hain toh unhe combine karo
  if (videoClips && videoClips.length > 1) {
    return exportMultipleVideos({ videoClips, textOverlays, canvasOptions, imageOverlays });
  }

  // Single video wala existing code
  if (!videoRef.current) throw new Error("Video element not found");

  const video = videoRef.current;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const stream = canvas.captureStream(30);
  const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
  const chunks = [];

  return new Promise((resolve, reject) => {
    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      resolve(url);
    };
    recorder.onerror = (err) => reject(err);

    recorder.start();

    let startTime = 0;
    let endTime = video.duration;

    if (processingInfo) {
      if (processingInfo.type === 'trim') {
        startTime = processingInfo.start;
        endTime = processingInfo.end;
      } else if (processingInfo.type === 'cut') {
        if (processingInfo.segments.length > 0) {
          startTime = processingInfo.segments[0].start;
          endTime = processingInfo.segments[0].end;
        }
      }
    }

    video.currentTime = startTime;
    video.play();

    // Preload images
    const imagePromises = imageOverlays.map(image => {
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = image.source;
      });
    });

    const draw = async () => {
      if (!video.paused && !video.ended && video.currentTime <= endTime) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Apply flip/rotate from canvasOptions
        ctx.save();
        if (canvasOptions?.flipHorizontal || canvasOptions?.flipVertical) {
          ctx.translate(
            canvasOptions.flipHorizontal ? canvas.width : 0,
            canvasOptions.flipVertical ? canvas.height : 0
          );
          ctx.scale(
            canvasOptions.flipHorizontal ? -1 : 1,
            canvasOptions.flipVertical ? -1 : 1
          );
        }
        if (canvasOptions?.rotate) {
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate((canvasOptions.rotate * Math.PI) / 180);
          ctx.translate(-canvas.width / 2, -canvas.height / 2);
        }

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        ctx.restore();

        // Draw image overlays
        for (const image of imageOverlays) {
          try {
            const img = new Image();
            img.crossOrigin = "anonymous";
            await new Promise((resolve) => {
              img.onload = resolve;
              img.onerror = resolve;
              img.src = image.source;
            });
            
            if (img.complete && img.naturalWidth !== 0) {
              ctx.save();
              const imgX = (image.position.x / 100) * canvas.width - (image.size.width / 2);
              const imgY = (image.position.y / 100) * canvas.height - (image.size.height / 2);
              ctx.globalAlpha = image.opacity || 1;
              ctx.drawImage(img, imgX, imgY, image.size.width, image.size.height);
              ctx.restore();
            }
          } catch (error) {
            console.error("Error drawing image:", error);
          }
        }

        // Draw text overlays
        textOverlays.forEach((o) => {
          ctx.fillStyle = o.style.color;
          ctx.font = `${o.style.fontSize || "24px"} ${o.style.fontFamily || "Arial"}`;
          ctx.fillText(
            o.text,
            (o.position?.x || 50) * canvas.width / 100,
            (o.position?.y || 50) * canvas.height / 100
          );
        });

        requestAnimationFrame(draw);
      } else if (video.currentTime >= endTime) {
        if (recorder.state === "recording") {
          recorder.stop();
        }
        video.pause();
      }
    };

    Promise.all(imagePromises).then(() => {
      draw();
    });

    video.onended = () => {
      if (recorder.state === "recording") {
        recorder.stop();
      }
      video.pause();
    };
  });
}

// IMPROVED: Function for multiple videos - continuous playback
async function exportMultipleVideos({ videoClips, textOverlays, canvasOptions, imageOverlays }) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  // Load first video to get dimensions
  const firstVideo = await loadVideo(videoClips[0].source);
  canvas.width = firstVideo.videoWidth;
  canvas.height = firstVideo.videoHeight;

  const stream = canvas.captureStream(30);
  const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
  const chunks = [];

  return new Promise(async (resolve, reject) => {
    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      resolve(url);
    };
    recorder.onerror = (err) => reject(err);

    recorder.start();

    let currentClipIndex = 0;
    let startTime = Date.now();
    
    const drawFrame = async () => {
      if (currentClipIndex >= videoClips.length) {
        recorder.stop();
        return;
      }

      const clip = videoClips[currentClipIndex];
      const video = await loadVideo(clip.source);
      
      const currentTime = (Date.now() - startTime) / 1000;
      const clipCurrentTime = currentTime - clip.start;
      
      if (clipCurrentTime >= 0 && clipCurrentTime <= clip.duration) {
        // Set video to correct time
        video.currentTime = Math.min(clipCurrentTime, video.duration);
        
        // Wait for video to be ready
        if (video.readyState >= 2) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          // Apply canvas transformations
          ctx.save();
          if (canvasOptions?.flipHorizontal || canvasOptions?.flipVertical) {
            ctx.translate(
              canvasOptions.flipHorizontal ? canvas.width : 0,
              canvasOptions.flipVertical ? canvas.height : 0
            );
            ctx.scale(
              canvasOptions.flipHorizontal ? -1 : 1,
              canvasOptions.flipVertical ? -1 : 1
            );
          }
          if (canvasOptions?.rotate) {
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate((canvasOptions.rotate * Math.PI) / 180);
            ctx.translate(-canvas.width / 2, -canvas.height / 2);
          }

          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          ctx.restore();

          // Draw overlays
          drawOverlays();
        }
        
        requestAnimationFrame(drawFrame);
      } else if (clipCurrentTime > clip.duration) {
        // Move to next clip
        currentClipIndex++;
        if (currentClipIndex < videoClips.length) {
          startTime = Date.now() - (videoClips[currentClipIndex].start * 1000);
        }
        requestAnimationFrame(drawFrame);
      } else {
        requestAnimationFrame(drawFrame);
      }
    };

    const drawOverlays = () => {
      // Draw image overlays
      imageOverlays.forEach(image => {
        try {
          const img = new Image();
          img.src = image.source;
          if (img.complete) {
            ctx.save();
            const imgX = (image.position.x / 100) * canvas.width - (image.size.width / 2);
            const imgY = (image.position.y / 100) * canvas.height - (image.size.height / 2);
            ctx.globalAlpha = image.opacity || 1;
            ctx.drawImage(img, imgX, imgY, image.size.width, image.size.height);
            ctx.restore();
          }
        } catch (error) {
          console.error("Error drawing image:", error);
        }
      });

      // Draw text overlays
      textOverlays.forEach((o) => {
        ctx.fillStyle = o.style.color;
        ctx.font = `${o.style.fontSize || "24px"} ${o.style.fontFamily || "Arial"}`;
        ctx.fillText(
          o.text,
          (o.position?.x || 50) * canvas.width / 100,
          (o.position?.y || 50) * canvas.height / 100
        );
      });
    };

    // Preload all videos first
    const videoPromises = videoClips.map(clip => loadVideo(clip.source));
    await Promise.all(videoPromises);
    
    drawFrame();
  });
}

// Helper function to load video
function loadVideo(src) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.crossOrigin = "anonymous";
    video.src = src;
    video.onloadeddata = () => resolve(video);
    video.onerror = reject;
  });
}
