import React from 'react';
import API_BASE_URL from '../../api';


 class Register extends React.Component {
  constructor(props) {
           super(props);  
             this.state = {
               email:'', 
               password:'',
               name:'',
               error:'',
               isSubmitting:false
             }
     }
  
    
   onNameChange=(event) => { 
      this.setState({name:event.target.value})
     }  


   onEmailChange=(event) => { 
      this.setState({email:event.target.value})
     }  

  onPasswordChange=(event) => {
     this.setState({password:event.target.value})
   }   
 
  onSubmitSignIn=async (event) => {
     event.preventDefault();
     this.setState({ error:'', isSubmitting:true });

     try {
       const response = await fetch(`${API_BASE_URL}/register`, {
         method:'POST',
         headers:{'Content-Type':'application/json'},
         body:JSON.stringify({
           email:this.state.email,
           password:this.state.password,
           name:this.state.name
         })
       });
       const user = await response.json();
       if (!response.ok || !user.id) {
         throw new Error(user.error || 'Registration failed. Please try again.');
       }

       this.props.loadUser(user);
       this.props.onRouteChange('home');
     } catch (error) {
       this.setState({
         error:error.message || 'Unable to reach the server. Please try again.',
         isSubmitting:false
       });
     }
   }

  render() { 
     const { error, isSubmitting } = this.state;
     return (
        <article className="br3 ba b--black-10 mv4 w-100 w-50-m w-25-l mw6 shadow-5 center">
        <main className="pa4 black-80">
        <div className="measure">
        <form className="measure" onSubmit={this.onSubmitSignIn}>
        <fieldset id="sign_up" className="ba b--transparent ph0 mh0">
        <legend className="f1 fw6 ph0 mh0">Register</legend>
    
        <div className="mt3">
            <label className="db fw6 lh-copy f6" htmlFor="name">Name</label>
            <input className="pa2 input-reset ba bg-transparent hover-bg-black hover-white w-100" type="text" name="name"  
            id="name"
            autoComplete="name"
            required
            onChange={ this.onNameChange }/>
        </div>
    
       <div className="mt3">
            <label className="db fw6 lh-copy f6" htmlFor="email-address">Email</label>
            <input className="pa2 input-reset ba bg-transparent hover-bg-black hover-white w-100" 
                   type="email" 
                   name="email-address"  
                   id="email-address" 
                   autoComplete="email"
                   required
                   onChange={ this.onEmailChange } />
        </div>
      
        <div className="mt3">
            <label className="db fw6 lh-copy f6" htmlFor="password">Password</label>
            <input className="b pa2 input-reset ba bg-transparent hover-bg-black hover-white w-100"     type="password" 
               name="password"  
               id="password"
               autoComplete="new-password"
               required
               onChange={ this.onPasswordChange }/>
        </div>

        </fieldset>
        {error && <p className="red" role="alert">{error}</p>}
        <div className="">
        <input 
           className="b ph3 pv2 input-reset ba b--black bg-transparent grow pointer f6 dib" 
           type="submit"
           disabled={isSubmitting}
           value={isSubmitting ? 'Registering...' : 'Register'}
        
        />
        </div>
        </form>
       </div>
      </main>
    </article>
   
      );
   }
};

export default Register;