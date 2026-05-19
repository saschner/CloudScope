

import React, { useState } from 'react';
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';
import './App.css';
import WordCloud from './components/WordCloud';

const BACKEND_URL = 'https://cloudscope.onrender.com';

function AppInner() {
  const [authenticated, setAuthenticated] = useState(false);
  const [words, setWords] = useState({});
  const [loading, setLoading] = useState(false);
  const [years, setYears] = useState({});
  const [selectedYear, setSelectedYear] = useState('');
  const [senders, setSenders] = useState({});
  const [selectedSender, setSelectedSender] = useState('');

  const login = useGoogleLogin({
    flow: 'implicit',
    scope: 'https://www.googleapis.com/auth/gmail.readonly',
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      try {
        // Fetch available years
        const yearsRes = await fetch(`https://cloudscope-backend.onrender/api/emails/years`, {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
        });
        const yearsData = await yearsRes.json();
        setYears(yearsData.years || {});
        setAuthenticated(true);
      } catch (err) {
        console.error('Auth error:', err);
      } finally {
        setLoading(false);
      }
    },
    onError: () => console.log('Login Failed'),
  });

  const fetchWordCloud = async (year, sender) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('gmail_token');
      const response = await fetch(`https://cloudscope-backend.onrender/api/emails/wordcloud`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ year, sender, previousWords: [] })
      });
      const data = await response.json();
      setWords(data.words || {});
    } catch (err) {
      console.error('Word cloud error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSenders = async (year) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('gmail_token');
      const response = await fetch(`http://cloudscope-backend.onrender/api/emails/senders/${year}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setSenders(data.senders || {});
      setSelectedYear(year);
      setSelectedSender('');
    } catch (err) {
      console.error('Senders error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleYearClick = (year) => {
    fetchSenders(year);
  };

  const handleSenderClick = (sender) => {
    setSelectedSender(sender);
    fetchWordCloud(selectedYear, sender);
  };

  if (!authenticated) {
    return (
      <div className="app" style={{ textAlign: 'center', padding: '20px' }}>
        <h1>CloudScope</h1>
        <button onClick={() => login()} style={{ padding: '10px 16px', fontSize: '16px' }}>
          Sign in with Google
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="app" style={{ textAlign: 'center', padding: '20px' }}>
        <h1>CloudScope</h1>
        <div>Loading...</div>
      </div>
    );
  }

  // Show year selection if no year selected yet
  if (!selectedYear) {
    return (
      <div className="app" style={{ textAlign: 'center', padding: '20px' }}>
        <h1>CloudScope</h1>
        <h2>Select a Year</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}>
          {Object.entries(years).map(([year, count]) => (
            <button
              key={year}
              onClick={() => handleYearClick(year)}
              style={{
                padding: '10px 20px',
                fontSize: `${Math.min(24, 12 + count / 5)}px`,
                cursor: 'pointer'
              }}
            >
              {year} ({count})
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Show senders if year selected but no sender selected yet
  if (selectedYear && !selectedSender) {
    return (
      <div className="app" style={{ textAlign: 'center', padding: '20px' }}>
        <h1>CloudScope</h1>
        <button onClick={() => setSelectedYear('')} style={{ marginBottom: '20px' }}>
          ← Back to Years
        </button>
        <h2>Senders in {selectedYear}</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}>
          {Object.entries(senders).map(([sender, count]) => (
            <button
              key={sender}
              onClick={() => handleSenderClick(sender)}
              style={{
                padding: '8px 16px',
                fontSize: `${Math.min(20, 12 + count / 3)}px`,
                cursor: 'pointer'
              }}
            >
              {sender} ({count})
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Show word cloud
  return (
    <div className="app" style={{ textAlign: 'center', padding: '20px' }}>
      <h1>CloudScope</h1>
      <button onClick={() => setSelectedSender('')} style={{ marginBottom: '20px' }}>
        ← Back to Senders
      </button>
      <h2>
        {selectedSender} — {selectedYear}
      </h2>
      <WordCloud words={words} />
    </div>
  );
}

export default function App() {
  return (
    <GoogleOAuthProvider clientId="613649107764-a62ejns04vkh5lc9sdc412idbpkfrn88.apps.googleusercontent.com">
      <AppInner />
    </GoogleOAuthProvider>
  );
}
