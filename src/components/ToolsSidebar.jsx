import React from "react";

function ToolsSidebar({
  activeTool,
  selectTool,
  showTextEditor,
  setShowTextEditor,
  newText,
  setNewText,
  addTextOverlay,
  textStyle,
  setTextStyle,
  formatTime,
  currentTime,
  duration,
  deleteSelected, // ✅ Combined delete function
  selectedId,
  trimStart,
  setTrimStart,
  trimEnd,
  setTrimEnd,
  applyTrim,
  resetTrim,
  isTrimmed,
  // Cut props
  cutPoints,
  addCutPoint,
  removeCutPoint,
  applyCut,
  resetCut,
}) {
  
  // ✅ FIXED: Better selected type detection
  const getSelectedType = () => {
    if (!selectedId) return null;
    
    // Agar selectedId string hai aur 'image-' se start hota hai
    if (typeof selectedId === 'string' && selectedId.startsWith('image-')) {
      return 'image';
    }
    
    // Otherwise text assume karo (number ya koi aur type)
    return 'text';
  };

  const selectedType = getSelectedType();

  return (
    <div className="tools-sidebar" style={{ padding: "10px", width: "250px", borderLeft: "1px solid #ccc" }}>
      <h3>Tools</h3>
      <div className="tools-grid" style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
        {["select", "cut", "trim", "text"].map((tool) => (
          <button
            key={tool}
            className={`tool-btn ${activeTool === tool ? "active" : ""}`}
            onClick={() => selectTool(tool)}
            style={{ 
              padding: "5px 10px", 
              cursor: "pointer",
              background: activeTool === tool ? "#007bff" : "#f0f0f0",
              color: activeTool === tool ? "white" : "black",
              border: "1px solid #ccc"
            }}
          >
            {tool.charAt(0).toUpperCase() + tool.slice(1)}
          </button>
        ))}
      </div>

      {/* Cut Editor */}
      {activeTool === "cut" && (
        <div className="cut-editor" style={{ marginTop: "15px", padding: "10px", border: "1px solid #ddd", borderRadius: "5px" }}>
          <h4>Cut Video</h4>
          
          <div className="cut-controls" style={{ marginBottom: "10px" }}>
            <button 
              onClick={addCutPoint}
              style={{ 
                width: "100%", 
                padding: "8px", 
                background: "#28a745", 
                color: "white", 
                border: "none", 
                borderRadius: "3px",
                cursor: "pointer",
                marginBottom: "10px"
              }}
            >
              Add Cut Point at {formatTime(currentTime)}
            </button>
            
            {/* Cut Points List */}
            {cutPoints.length > 0 && (
              <div style={{ marginBottom: "10px" }}>
                <h5 style={{ margin: "5px 0", fontSize: "14px" }}>Cut Points:</h5>
                {cutPoints.map((point, index) => (
                  <div key={index} style={{ 
                    display: "flex", 
                    justifyContent: "space-between", 
                    alignItems: "center",
                    padding: "5px",
                    background: "#f8f9fa",
                    marginBottom: "3px",
                    borderRadius: "3px"
                  }}>
                    <span style={{ fontSize: "12px" }}>{formatTime(point)}</span>
                    <button 
                      onClick={() => removeCutPoint(index)}
                      style={{ 
                        background: "red", 
                        color: "white", 
                        border: "none", 
                        borderRadius: "3px",
                        cursor: "pointer",
                        fontSize: "12px",
                        padding: "2px 6px"
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            <div style={{ display: "flex", gap: "5px", marginTop: "10px" }}>
              <button 
                onClick={applyCut}
                disabled={cutPoints.length === 0}
                style={{ 
                  flex: 1, 
                  padding: "8px", 
                  background: cutPoints.length > 0 ? "#007bff" : "#6c757d", 
                  color: "white", 
                  border: "none", 
                  borderRadius: "3px",
                  cursor: cutPoints.length > 0 ? "pointer" : "not-allowed"
                }}
              >
                Apply Cut ({cutPoints.length} points)
              </button>
              <button 
                onClick={resetCut}
                style={{ 
                  flex: 1, 
                  padding: "8px", 
                  background: "#6c757d", 
                  color: "white", 
                  border: "none", 
                  borderRadius: "3px",
                  cursor: "pointer"
                }}
              >
                Reset
              </button>
            </div>
          </div>
          
          <div className="cut-info" style={{ fontSize: "12px", color: "#666" }}>
            <div>Click "Add Cut Point" to mark segments to remove</div>
            <div>Current: {formatTime(currentTime)}</div>
          </div>
        </div>
      )}

      {/* Trim Editor */}
      {activeTool === "trim" && (
        <div className="trim-editor" style={{ marginTop: "15px", padding: "10px", border: "1px solid #ddd", borderRadius: "5px" }}>
          <h4>Trim Video</h4>
          
          <div className="trim-controls" style={{ marginBottom: "10px" }}>
            <div style={{ marginBottom: "8px" }}>
              <label style={{ display: "block", fontSize: "12px", marginBottom: "3px" }}>Start Time:</label>
              <input
                type="range"
                min="0"
                max={duration || 0}
                step="0.1"
                value={trimStart}
                onChange={(e) => setTrimStart(parseFloat(e.target.value))}
                style={{ width: "100%" }}
              />
              <span style={{ fontSize: "12px" }}>{formatTime(trimStart)}</span>
            </div>
            
            <div style={{ marginBottom: "8px" }}>
              <label style={{ display: "block", fontSize: "12px", marginBottom: "3px" }}>End Time:</label>
              <input
                type="range"
                min="0"
                max={duration || 0}
                step="0.1"
                value={trimEnd}
                onChange={(e) => setTrimEnd(parseFloat(e.target.value))}
                style={{ width: "100%" }}
              />
              <span style={{ fontSize: "12px" }}>{formatTime(trimEnd)}</span>
            </div>
            
            <div style={{ display: "flex", gap: "5px", marginTop: "10px" }}>
              <button 
                onClick={applyTrim}
                style={{ 
                  flex: 1, 
                  padding: "8px", 
                  background: "#007bff", 
                  color: "white", 
                  border: "none", 
                  borderRadius: "3px",
                  cursor: "pointer"
                }}
              >
                Apply Trim
              </button>
              <button 
                onClick={resetTrim}
                style={{ 
                  flex: 1, 
                  padding: "8px", 
                  background: "#6c757d", 
                  color: "white", 
                  border: "none", 
                  borderRadius: "3px",
                  cursor: "pointer"
                }}
              >
                Reset
              </button>
            </div>
          </div>
          
          <div className="trim-preview" style={{ fontSize: "12px", color: "#666" }}>
            <div>Original: {formatTime(duration)}</div>
            <div>Trimmed: {formatTime(trimEnd - trimStart)}</div>
          </div>
        </div>
      )}

      {/* Text Editor */}
      {showTextEditor && (
        <div className="text-editor" style={{ marginTop: "10px" }}>
          <h4>Add Text</h4>
          <input
            type="text"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="Enter text here"
            style={{ width: "100%", marginBottom: "5px", padding: "5px" }}
          />
          <select
            value={textStyle.fontFamily}
            onChange={(e) => setTextStyle((prev) => ({ ...prev, fontFamily: e.target.value }))}
            style={{ width: "100%", marginBottom: "5px", padding: "5px" }}
          >
            <option value="Arial">Arial</option>
            <option value="Times New Roman">Times New Roman</option>
            <option value="Courier New">Courier New</option>
            <option value="Verdana">Verdana</option>
            <option value="Georgia">Georgia</option>
          </select>
          <input
            type="color"
            value={textStyle.color}
            onChange={(e) => setTextStyle((prev) => ({ ...prev, color: e.target.value }))}
            style={{ width: "100%", marginBottom: "5px", padding: "3px" }}
          />

          <div style={{ display: "flex", gap: "5px" }}>
            <button onClick={addTextOverlay} style={{ flex: 1, cursor: "pointer" }}>
              Add Text
            </button>
            <button onClick={() => setShowTextEditor(false)} style={{ flex: 1, cursor: "pointer" }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ✅ FIXED: Combined Delete Button */}
      {selectedId && (
        <div style={{ marginTop: "15px" }}>
          <button
            onClick={deleteSelected}
            style={{ 
              width: "100%", 
              padding: "10px", 
              background: "red", 
              color: "white", 
              cursor: "pointer",
              border: "none",
              borderRadius: "5px",
              fontSize: "14px",
              fontWeight: "bold"
            }}
          >
            🗑️ Delete Selected {selectedType === 'image' ? 'Image' : 'Text'}
          </button>
          <div style={{ fontSize: "11px", color: "#666", textAlign: "center", marginTop: "5px" }}>
            or press <kbd>Delete</kbd> key
          </div>
        </div>
      )}

      {/* Properties Panel */}
      <div className="properties-panel" style={{ marginTop: "20px" }}>
        <h3>Properties</h3>
        <div className="property">
          <label>Current Time:</label>
          <span style={{ marginLeft: "5px" }}>{formatTime(currentTime)}</span>
        </div>
        <div className="property">
          <label>Duration:</label>
          <span style={{ marginLeft: "5px" }}>{formatTime(duration)}</span>
        </div>
        
        {/* Selection Info */}
        {selectedId && (
          <div className="property">
            <label>Selected:</label>
            <span style={{ marginLeft: "5px", color: "#007bff", fontWeight: "bold" }}>
              {selectedType === 'image' ? 'Image' : 'Text Overlay'}
            </span>
          </div>
        )}
        
        {activeTool === "trim" && (
          <>
            <div className="property">
              <label>Trim Start:</label>
              <span style={{ marginLeft: "5px" }}>{formatTime(trimStart)}</span>
            </div>
            <div className="property">
              <label>Trim End:</label>
              <span style={{ marginLeft: "5px" }}>{formatTime(trimEnd)}</span>
            </div>
          </>
        )}
        {activeTool === "cut" && cutPoints.length > 0 && (
          <div className="property">
            <label>Cut Points:</label>
            <span style={{ marginLeft: "5px" }}>{cutPoints.length}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default ToolsSidebar;