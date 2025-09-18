import React from 'react';
import './FaceRecognition.css';

const FaceRecognition = ({ imageUrl, box }) => {
  return (
    <div className="center ma">
      <div style={{ position: 'relative', display: 'inline-block' }}>
        {imageUrl && (
          <img
            id="inputimage"
            alt=""
            src={imageUrl}
            width="500px"
            height="auto"
          />
        )}
        {imageUrl && box && box.top_row && (
          <div
            className="bounding-box"
            style={{
              position: 'absolute',
              top: box.top_row + 'px',
              left: box.left_col + 'px',
              width: (box.right_col - box.left_col) + 'px',
              height: (box.bottom_row - box.top_row) + 'px',
              boxShadow: '0 0 0 3px #149df2 inset',
              pointerEvents: 'none'
            }}
          ></div>
        )}
      </div>
    </div>
  );
};

export default FaceRecognition;