import React, { Component } from 'react';
import ParticlesBg from 'particles-bg';
import Navigation from './components/Navigation/Navigation';
import Signin from './components/Signin/Signin';
import Register from './components/Register/Register';
import Logo from './components/Logo/Logo';
import ImageLinkForm from './components/ImageLinkForm/ImageLinkForm';
import Rank from './components/Rank/Rank';
import FaceRecognition from './components/FaceRecognition/FaceRecognition';
import './App.css';

const initialState= {
        input: '',
        imageUrl: '',
        box: {},
        route: 'signin',
        isSignedIn:false, 
        user:{
          
              id:'',
              name:'', 
              email:'', 
              entries:0, 
              joined:''
          }
}

class App extends Component {
  constructor() {
    super();
    this.state = initialState;
    }
   

  loadUser=(data) => {
     this.setState({user:{   
            id:data.id,
            name:data.name, 
            email:data.email, 
            entries:data.entries, 
            joined:data.joined
              

     }})
   }


calculateFaceLocation = (data) => {
    if (!data || !data.outputs || !data.outputs[0] || !data.outputs[0].data || !data.outputs[0].data.regions) {
      return null;
    }
    const clarifaiFace = data.outputs[0].data.regions[0].region_info.bounding_box;
    const image = document.getElementById('inputimage');
    if (!image) return null;
    const width = Number(image.width);
    const height = Number(image.height);
    return {
      left_col: clarifaiFace.left_col * width,
      top_row: clarifaiFace.top_row * height,
      right_col: clarifaiFace.right_col * width,
      bottom_row: clarifaiFace.bottom_row * height
    };
  }                                  

 displayFaceBox=(box) => 
 {
    this.setState({box:box}); 
 } 

  onInputChange = (event) => {
    this.setState({ input: event.target.value });
  };

  onButtonSubmit = () => {
    const IMAGE_URL = this.state.input;
    this.setState({ imageUrl: IMAGE_URL, box: {} });
    if (!IMAGE_URL) return;
    fetch('http://localhost:3001/clarifai', {
      method: 'POST',  
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: IMAGE_URL })
    })
     .then((response) => {
   if (response) {
     fetch('http://localhost:3000/image', {
       method: 'put',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ id: this.state.user.id })
     })
     .then(res => res.json())
     .then(count => {
       this.setState(Object.assign(this.state.user, { entries: count }));
     }) 
     .catch(console.log)
   }

   return response.json(); // 
})

      .then((result) => {
        const box = this.calculateFaceLocation(result);
        if (box) {
          this.setState({ box });
          console.log('Bounding box:', box);
        } else {
          this.setState({ box: {} });
          console.log('No face detected.');
        }
      })
      .catch((error) => console.log('error', error));
  }; 

  onRouteChange =(route) => { 
    if(route==='signout') {
        this.setState(initialState); 
    } else if(route==='home'){ 
       this.setState({isSignedIn:true,route:route}); 
    }
    this.setState({route:route});  
  }

  render() { 
    const { isSignedIn,imageUrl,route,box }=this.state;
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
                />
              
                <FaceRecognition imageUrl={imageUrl} box={box} /> 
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