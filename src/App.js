import React, { Component } from 'react';
import ParticlesBg from 'particles-bg';
import Navigation from './components/Navigation/Navigation';
import Signin from './components/Signin/Signin';
import Register from './components/Register/Register';
import Logo from './components/Logo/Logo';
import ImageLinkForm from './components/ImageLinkForm/ImageLinkForm';
import Rank from './components/Rank/Rank';
import FaceRecognition from './components/FaceRecognition/FaceRecognition';
import API_BASE_URL from './api';
import { validateImageUrl } from './imageUrl';
import './App.css';

const initialState= {
        input: '',
        imageUrl: '',
        faces: [],
        faceDetectionMessage: '',
        isDetecting: false,
        route: 'signin',
        isSignedIn:false, 
        user:{
          
              id:'',
              name:'', 
              email:'', 
              token:'',
              entries:0, 
              joined:''
          }
}

class App extends Component {
  constructor() {
    super();
    this.state = initialState;
    this.detectRequestId = 0;
    this.activeDetectionRequestId = null;
    this.userSessionId = 0;
    }
   

  loadUser=(data) => {
     this.setState({user:{   
            id:data.id,
            name:data.name, 
            email:data.email, 
            token:data.token,
            entries:data.entries, 
            joined:data.joined
              

     }})
   }


calculateFaceLocation = (face) => {
    const vertices = face?.vertices;
    if (!Array.isArray(vertices) || vertices.length < 2) {
      return null;
    }

    const xCoordinates = vertices.map((vertex) => vertex?.x ?? 0);
    const yCoordinates = vertices.map((vertex) => vertex?.y ?? 0);
    if (![...xCoordinates, ...yCoordinates].every(Number.isFinite)) return null;

    return {
      left_col: Math.min(...xCoordinates),
      top_row: Math.min(...yCoordinates),
      right_col: Math.max(...xCoordinates),
      bottom_row: Math.max(...yCoordinates)
    };
  }                                  

 displayFaceBox=(box) => 
 {
    this.setState({box:box}); 
 } 

  onInputChange = (event) => {
    this.setState({ input: event.target.value });
  };

  onImageLoadError = (failedImageUrl) => {
    if (failedImageUrl !== this.state.imageUrl) return;

    this.detectRequestId += 1;
    this.setState({
      imageUrl: '',
      faces: [],
      faceDetectionMessage: 'Unable to load this image. Please check the image URL and try again.',
      isDetecting: this.activeDetectionRequestId !== null
    });
  };

  onButtonSubmit = async () => {
    if (this.detectRequestInProgress) return;

    const { url: imageUrl, error: validationError } = validateImageUrl(this.state.input);
    if (validationError) {
      this.setState({
        imageUrl: '',
        faces: [],
        faceDetectionMessage: validationError
      });
      return;
    }

    const requestId = ++this.detectRequestId;
    const requestSessionId = this.userSessionId;
    const { id: requestUserId, token: requestUserToken } = this.state.user;
    this.activeDetectionRequestId = requestId;
    this.detectRequestInProgress = true;
    this.setState({
      imageUrl,
      faces: [],
      faceDetectionMessage: '',
      isDetecting: true
    });

    try {
      const response = await fetch(`${API_BASE_URL}/detect-face`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.state.user.token}`
        },
        body: JSON.stringify({ input: imageUrl })
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Face detection failed. Please try again.');
      }

      const requestIsCurrent = requestId === this.detectRequestId;
      const faces = requestIsCurrent
        ? (Array.isArray(result.faces) ? result.faces : []).map((face) => {
            const likelihoods = face?.likelihoods && typeof face.likelihoods === 'object'
              ? face.likelihoods
              : {};
            const box = this.calculateFaceLocation(face);
            if (!box) return null;

            return {
              ...face,
              box,
              likelihoods: {
                ...likelihoods,
                joyLikelihood: likelihoods.joyLikelihood ?? face?.joyLikelihood ?? 'UNKNOWN',
                sorrowLikelihood: likelihoods.sorrowLikelihood ?? face?.sorrowLikelihood ?? 'UNKNOWN',
                angerLikelihood: likelihoods.angerLikelihood ?? face?.angerLikelihood ?? 'UNKNOWN',
                surpriseLikelihood: likelihoods.surpriseLikelihood ?? face?.surpriseLikelihood ?? 'UNKNOWN'
              }
            };
          }).filter(Boolean)
        : null;
      this.setState((state) => {
        const updates = {};
        if (
          this.userSessionId === requestSessionId &&
          state.user.id === requestUserId &&
          state.user.token === requestUserToken &&
          Number.isInteger(result.entries)
        ) {
          updates.user = { ...state.user, entries: result.entries };
        }
        if (requestId === this.detectRequestId) {
          updates.faces = faces || [];
          updates.faceDetectionMessage = faces?.length === 0
            ? 'No faces detected in this image.'
            : '';
        }
        return Object.keys(updates).length > 0 ? updates : null;
      });
    } catch (error) {
      if (requestId === this.detectRequestId) {
        this.setState({
          faceDetectionMessage: error instanceof TypeError
            ? 'Unable to reach the face detection service. Please try again.'
            : error.message || 'Face detection failed. Please try again.'
        });
      }
    } finally {
      if (this.activeDetectionRequestId === requestId) {
        this.activeDetectionRequestId = null;
        this.detectRequestInProgress = false;
        this.setState({ isDetecting: false });
      }
    }
  }; 

  onRouteChange =(route) => { 
    if(route==='signout') {
        this.userSessionId += 1;
        this.detectRequestId += 1;
        this.activeDetectionRequestId = null;
        this.detectRequestInProgress = false;
        this.setState(initialState);
        return;
    } else if(route==='home'){ 
       this.setState({isSignedIn:true,route:route}); 
       return;
    }
    this.setState({route:route});  
  }

  render() { 
    const { isSignedIn,imageUrl,route,faces,faceDetectionMessage,isDetecting }=this.state;
    return (
      <div className="App">
        <div className="particles">
          <ParticlesBg type="polygon" bg={true} />
        </div>
        <Navigation isSignedIn={isSignedIn} onRouteChange={this.onRouteChange} />  
       { route === 'home'  
         
         ? <div>
              <Logo />
              <Rank name={this.state.user.name} entries={this.state.user.entries}/> 
              <ImageLinkForm 
                    onInputChange={this.onInputChange} 
                    onButtonSubmit={this.onButtonSubmit} 
                    isLoading={isDetecting}
                />
              
                <FaceRecognition
                  imageUrl={imageUrl}
                  faces={faces}
                  onImageError={this.onImageLoadError}
                />
                {faceDetectionMessage && <p role="alert">{faceDetectionMessage}</p>}
            </div> 
           : (

                 route==='signin' 
               ?  <Signin loadUser={ this.loadUser } onRouteChange={this.onRouteChange} />
               : <Register loadUser={ this.loadUser } onRouteChange={this.onRouteChange}/>
             )
        
         }
     
        </div>
    );
  }
}
        
  
  
export default App;