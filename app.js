import React, { useState, useEffect } from 'react';
import './App.css';
import WordCloud from './components/WordCloud';
import Navigation from './components/Navigation';

function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [navigationStack, setNavigationStack] = useState([]);
  const [cloudData, setCloudData] = useState(null);
  const [cloudType, setCloudType] = useState('years');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [deleteHistory, setDeleteHistory] = useState([]);
  const [emailIds, setEmailIds] = useState([]);

  useEffect(() => {
    checkAuth();
    
    const params = new URLSearchParams(window.location.search);
    if (params.get('auth') === 'success') {
      window.history.replaceState({}, '', '/');
      setAuthenticated(true);
      loadYearCloud();
    }
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('https://unimplicit-bmh01o71m-susan-aschners-projects.vercel.app/auth/status', {
        credentials: 'include'
      });
      const data = await response.json();
      setAuthenticated(data.authenticated);
      
      if (data.authenticated) {
        loadYearCloud();
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    try {
      const response = await fetch('https://unimplicit-bmh01o71m-susan-aschners-projects.vercel.app/auth/url');
      const data = await response.json();
      window.location.href = data.url;
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const loadYearCloud = async () => {
    try {
      const response = await fetch('https://unimplicit-bmh01o71m-susan-aschners-projects.vercel.app/api/emails/years', {
        credentials: 'include'
      });
      const data = await response.json();
      setCloudData(data.years);
      setCloudType('years');
      setNavigationStack([]);
    } catch (error) {
      console.error('Failed to load years:', error);
    }
  };

  const loadSenderCloud = async (year) => {
    try {
      const response = await fetch(`https://unimplicit-bmh01o71m-susan-aschners-projects.vercel.app/api/emails/senders/${year}`, {
        credentials: 'include'
      });
      const data = await response.json();
      setCloudData(data.senders);
      setCloudType('senders');
      setNavigationStack([{ type: 'year', value: year }]);
    } catch (error) {
      console.error('Failed to load senders:', error);
    }
  };

  const loadWordCloud = async (filters) => {
    try {
      const response = await fetch('https://unimplicit-bmh01o71m-susan-aschners-projects.vercel.app/api/emails/wordcloud', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(filters)
      });
      const data = await response.json();
      setCloudData(data.words);
      setEmailIds(data.emailIds || []);
      setCloudType('words');
    } catch (error) {
      console.error('Failed to load word cloud:', error);
    }
  };

  const handleWordClick = (word) => {
    if (selectionMode) {
      toggleSelection(word);
      return;
    }

    if (cloudType === 'years') {
      loadSenderCloud(word);
    } else if (cloudType === 'senders') {
      const year = navigationStack[0].value;
      loadWordCloud({ year, sender: word });
      setNavigationStack([
        ...navigationStack,
        { type: 'sender', value: word }
      ]);
    } else if (cloudType === 'words') {
      const year = navigationStack.find(n => n.type === 'year')?.value;
      const sender = navigationStack.find(n => n.type === 'sender')?.value;
      const previousWords = navigationStack.filter(n => n.type === 'word').map(n => n.value);
      
      loadWordCloud({ 
        year, 
        sender, 
        previousWords: [...previousWords, word] 
      });
      
      setNavigationStack([
        ...navigationStack,
        { type: 'word', value: word }
      ]);
    }
  };

  const handleWordLongPress = (word) => {
    setSelectionMode(true);
    setSelectedItems(new Set([word]));
  };

  const toggleSelection = (word) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(word)) {
      newSelected.delete(word);
    } else {
      newSelected.add(word);
    }
    setSelectedItems(newSelected);
    
    if (newSelected.size === 0) {
      setSelectionMode(false);
    }
  };

  const handleZoomOut = () => {
    if (navigationStack.length === 0) return;
    
    const newStack = [...navigationStack];
    newStack.pop();
    setNavigationStack(newStack);

    if (newStack.length === 0) {
      loadYearCloud();
    } else if (newStack.length === 1 && newStack[0].type === 'year') {
      loadSenderCloud(newStack[0].value);
    } else {
      const year = newStack.find(n => n.type === 'year')?.value;
      const sender = newStack.find(n => n.type === 'sender')?.value;
      const previousWords = newStack.filter(n => n.type === 'word').map(n => n.value);
      
      loadWordCloud({ year, sender, previousWords });
    }
    
    exitSelectionMode();
  };

  const handleBack = () => {
    if (navigationStack.length === 0) {
      if (window.confirm('Exit application?')) {
        window.location.href = 'about:blank';
      }
    } else {
      handleZoomOut();
    }
  };

  const handleDelete = async () => {
    if (selectedItems.size === 0) return;

    try {
      const deleteAction = {
        emailIds: [...emailIds],
        timestamp: Date.now()
      };
      
      setDeleteHistory([deleteAction, ...deleteHistory.slice(0, 3)]);

      await fetch('https://unimplicit-bmh01o71m-susan-aschners-projects.vercel.app/api/emails/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ emailIds })
      });

      const newCloudData = { ...cloudData };
      selectedItems.forEach(word => {
        delete newCloudData[word];
      });
      setCloudData(newCloudData);
      
      exitSelectionMode();
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const handleUndo = async () => {
    if (deleteHistory.length === 0) return;

    const lastDelete = deleteHistory[0];
    
    try {
      await fetch('https://unimplicit-bmh01o71m-susan-aschners-projects.vercel.app/api/emails/untrash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ emailIds: lastDelete.emailIds })
      });

      setDeleteHistory(deleteHistory.slice(1));
      
      if (navigationStack.length === 0) {
        loadYearCloud();
      } else if (navigationStack.length === 1 && navigationStack[0].type === 'year') {
        loadSenderCloud(navigationStack[0].value);
      } else {
        const year = navigationStack.find(n => n.type === 'year')?.value;
        const sender = navigationStack.find(n => n.type === 'sender')?.value;
        const previousWords = navigationStack.filter(n => n.type === 'word').map(n => n.value);
        loadWordCloud({ year, sender, previousWords });
      }
    } catch (error) {
      console.error('Undo failed:', error);
    }
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedItems(new Set());
  };

  const handleBreadcrumbClick = (index) => {
    const newStack = navigationStack.slice(0, index + 1);
    setNavigationStack(newStack);

    if (index === -1) {
      loadYearCloud();
    } else if (newStack.length === 1 && newStack[0].type === 'year') {
      loadSenderCloud(newStack[0].value);
    } else {
      const year = newStack.find(n => n.type === 'year')?.value;
      const sender = newStack.find(n => n.type === 'sender')?.value;
      const previousWords = newStack.filter(n => n.type === 'word').map(n => n.value);
      loadWordCloud({ year, sender, previousWords });
    }
    
    exitSelectionMode();
  };

  if (loading) {
    return <div className="app">Loading...</div>;
  }

  if (!authenticated) {
    return (
      <div className="app login-screen">
        <div className="login-container">
          <h1>Gmail Word Cloud</h1>
          <button onClick={handleLogin} className="login-button">
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app" onClick={selectionMode ? exitSelectionMode : undefined}>
      <Navigation
        navigationStack={navigationStack}
        selectionMode={selectionMode}
        selectedCount={selectedItems.size}
        canUndo={deleteHistory.length > 0}
        onBack={handleBack}
        onZoomOut={handleZoomOut}
        onDelete={handleDelete}
        onUndo={handleUndo}
        onBreadcrumbClick={handleBreadcrumbClick}
      />
      
      {cloudData && (
        <WordCloud
          data={cloudData}
          onWordClick={handleWordClick}
          onWordLongPress={handleWordLongPress}
          selectionMode={selectionMode}
          selectedItems={selectedItems}
        />
      )}
    </div>
  );
}

export default App;
