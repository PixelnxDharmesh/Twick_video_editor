function Controls({ isPlaying, togglePlay, videoRef, setCurrentTime, handleImport, fileInputRef, handleVideoUpload }) {
  return (
    <div className="main-controls">
      <button className="btn" onClick={togglePlay}>
        {isPlaying ? "Pause" : "Play"}
      </button>
      <button
        className="btn"
        onClick={() => {
          if (videoRef.current) {
            videoRef.current.currentTime = 0;
            setCurrentTime(0);
          }
        }}
      >
        Rewind
      </button>
      <button className="btn" onClick={handleImport}>Upload Media</button>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleVideoUpload}
        accept="video/*,image/*,audio/*"
        style={{ display: "none" }}
      />
    </div>
  );
}
export default Controls;
