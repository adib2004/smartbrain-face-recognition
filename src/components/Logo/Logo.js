import React from 'react';
import Tilt from 'react-parallax-tilt';
import brain from './brains.png';
import './Logo.css';

const Logo = () => {
  return (
    <div className="logo-container">
      <Tilt className="Tilt br2 shadow-2">
        <div className="Tilt-inner">
          <img src={brain} alt="brains" />
        </div>
      </Tilt>
    </div>
  );
};

export default Logo;
