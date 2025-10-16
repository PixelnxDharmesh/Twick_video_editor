import React, { useState } from 'react';
import { videosData } from './videosData';
import { imagesData } from './imagesData';
import { audioData } from './audioData';
import { elementsData } from "../MediaSidebar/elementsData.js";

function MediaSidebar({ mediaType, setMediaType, selectTool, onMediaSelect }) {
  
  // Media items data from separate files
  const mediaItems = {
    videos: videosData,
    images: imagesData,
    audio: audioData,
    elements: elementsData,
  };

  const handleMediaClick = (item) => {
    if (onMediaSelect) {
      onMediaSelect(item);
    }
  };

  const [showImageUpload, setShowImageUpload] = useState(false);
  const [imageUrl, setImageUrl] = useState("");

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const imageURL = URL.createObjectURL(file);
      if (onMediaSelect) {
        onMediaSelect({
          id: Date.now(),
          name: file.name,
          thumbnail: "🖼️",
          type: "image",
          source: imageURL
        });
      }
      setShowImageUpload(false);
    }
  };

  const handleUrlImageAdd = () => {
    if (imageUrl.trim()) {
      if (onMediaSelect) {
        onMediaSelect({
          id: Date.now(),
          name: "URL Image",
          thumbnail: "🖼️",
          type: "image",
          source: imageUrl
        });
      }
      setImageUrl("");
      setShowImageUpload(false);
    }
  };
  return (
    <div className="media-sidebar" style={{ padding: "10px", width: "250px", borderRight: "1px solid #ccc" }}>
      <h3>Media Library</h3>
 
      
      {/* Image Upload Section */}
      {mediaType === "images" && (
        <div style={{ marginBottom: "15px" }}>
          <button 
            onClick={() => setShowImageUpload(!showImageUpload)}
            style={{
              width: "100%",
              padding: "8px",
              background: "#28a745",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              marginBottom: "10px"
            }}
          >
            {showImageUpload ? "Cancel" : "➕ Add Image"}
          </button>

          {showImageUpload && (
            <div style={{ 
              padding: "10px", 
              background: "#f8f9fa", 
              borderRadius: "4px",
              border: "1px solid #dee2e6"
            }}>
              <h4 style={{ margin: "0 0 10px 0", fontSize: "14px" }}>Add Image</h4>
              
              {/* URL Input */}
              <input
                type="text"
                placeholder="Paste image URL here"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px",
                  marginBottom: "8px",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  fontSize: "12px"
                }}
              />
              <button 
                onClick={handleUrlImageAdd}
                disabled={!imageUrl.trim()}
                style={{
                  width: "100%",
                  padding: "8px",
                  background: imageUrl.trim() ? "#007bff" : "#6c757d",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: imageUrl.trim() ? "pointer" : "not-allowed",
                  marginBottom: "8px"
                }}
              >
                Add from URL
              </button>

              {/* File Upload */}
              <div style={{ textAlign: "center" }}>
                <label style={{
                  display: "inline-block",
                  padding: "8px 12px",
                  background: "#6c757d",
                  color: "white",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "12px"
                }}>
                  📁 Upload Image
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    style={{ display: "none" }}
                  />
                </label>
              </div>
            </div>
          )}
        </div>
      )}
      {/* Media Tabs */}
      <div className="media-tabs" style={{ display: "flex", gap: "5px", marginBottom: "15px" }}>
        {["videos", "images", "audio", "elements"].map(type => (
          <button 
            key={type}
            className={mediaType === type ? "active" : ""}
            onClick={() => setMediaType(type)}
            style={{
              flex: 1,
              padding: "8px 5px",
              background: mediaType === type ? "#007bff" : "#f0f0f0",
              color: mediaType === type ? "white" : "black",
              border: "1px solid #ccc",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "12px"
            }}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      {/* Media List */}
      <div className="media-list" style={{ maxHeight: "400px", overflowY: "auto" }}>
        {mediaItems[mediaType].map(item => (
          <div 
            key={item.id} 
            className="media-item"
            onClick={() => handleMediaClick(item)}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "8px",
              marginBottom: "8px",
              border: "1px solid #ddd",
              borderRadius: "4px",
              cursor: "pointer",
              background: "#f9f9f9",
              transition: "background 0.2s"
            }}
            onMouseEnter={(e) => e.target.style.background = "#e9e9e9"}
            onMouseLeave={(e) => e.target.style.background = "#f9f9f9"}
          >
            <div 
              className="media-thumbnail"
              style={{ 
                fontSize: "24px", 
                marginRight: "10px",
                width: "40px",
                textAlign: "center"
              }}
            >
              {item.thumbnail}
            </div>
            <div className="media-info" style={{ flex: 1 }}>
              <div 
                className="media-name"
                style={{ 
                  fontSize: "14px", 
                  fontWeight: "bold",
                  marginBottom: "2px"
                }}
              >
                {item.name}
              </div>
              {item.duration && (
                <div 
                  className="media-duration"
                  style={{ 
                    fontSize: "12px", 
                    color: "#666" 
                  }}
                >
                  {item.duration}
                </div>
              )}
              <div 
                style={{ 
                  fontSize: "10px", 
                  color: "#999",
                  textTransform: "capitalize"
                }}
              >
                {item.type}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Record Button */}
      <button 
        className="sidebar-btn record-btn" 
        onClick={() => selectTool("record")}
        style={{
          width: "100%",
          padding: "10px",
          marginTop: "15px",
          background: "#dc3545",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
          fontSize: "14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px"
        }}
      >
        <span className="icon" style={{ fontSize: "16px" }}>●</span> 
        Record
      </button>

      {/* Instructions */}
      <div style={{ marginTop: "15px", fontSize: "11px", color: "#666", textAlign: "center" }}>
        Click on media items to add to timeline
      </div>
    </div>
  );
}

export default MediaSidebar;