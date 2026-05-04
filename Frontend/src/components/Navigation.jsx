import React from 'react';

function Navigation({ authenticated, setAuthenticated }) {
  if (authenticated) {
    return (
      <div className="nav">
        <button onClick={() => setAuthenticated(false)}>Logout</button>
      </div>
    );
  }

  return (
    <div className="nav">
      <button onClick={() => setAuthenticated(true)}>Login</button>
    </div>
  );
}

export default Navigation;