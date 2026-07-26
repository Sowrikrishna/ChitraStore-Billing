import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Home from './components/Home';
import Login from './components/Login';
import './App.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const loggedIn = localStorage.getItem('isLoggedIn') === 'true';
    setIsLoggedIn(loggedIn);
  }, []);

  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    // Show confirmation dialog
    if (window.confirm('Are you sure you want to logout?')) {
      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('username');
      setIsLoggedIn(false);
      navigate('/'); // redirect to login (or home)
    }
  };

  return (
    <>
      {isLoggedIn ? (
        <Home onLogout={handleLogout} />
      ) : (
        <Login onLogin={handleLogin} />
      )}
    </>
  );
}

export default App;