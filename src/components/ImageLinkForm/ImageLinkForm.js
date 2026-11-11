import React from 'react';
import './ImageLinkForm.css';

const ImageLinkForm = ({ onInputChange, onButtonSubmit, isLoading = false }) => {
  return (
    <div className='form'>
      <p className='f4'>
        {'This magic brain will detect faces in your pictures. Give it a try'}
      </p>
      <div className='center'>
        <div className='detect-form pa4 br3 shadow-5'>
          <input
            className='f3 pa2 w-70 center'
            type='text'
            onChange={onInputChange}
          />
          <button
            className='w-30 grow f5 link ph3 pv2 dib white bg-light-purple'
            onClick={onButtonSubmit}
            disabled={isLoading}
          >
            {isLoading ? 'Detecting...' : 'Detect'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageLinkForm;
