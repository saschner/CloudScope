import React from 'react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import './App.css';
import WordCloud from './components/WordCloud';
import Navigation from './components/Navigation';

const fakeWords = {
  meeting: 24, project: 17, update: 16, urgent: 15, 
  deployment: 14, invoice: 13, schedule: 12, reminder: 11
};

function App() {
  const [authenticated, setAuthenticated] = React.useState(false);

  return (
    <GoogleOAuthProvider clientId="613649107764-a62ejns04vkh5lc9sdc412idbpkfrn88.apps.googleusercontent.com">
      <div className="app" style={{ textAlign: 'center', padding: '20px' }}>
        <header>
          <h1>CloudScope</h1>
          {!authenticated ? (
            <GoogleLogin 
              onSuccess={() => setAuthenticated(true)}
              onError={() => console.log('Login Failed')}
            />
          ) : (
            <Navigation authenticated={authenticated} setAuthenticated={setAuthenticated} />
          )}
        </header>
        
        {authenticated && <WordCloud words={fakeWords} />}
      </div>
    </GoogleOAuthProvider>
  );
}

export default App;