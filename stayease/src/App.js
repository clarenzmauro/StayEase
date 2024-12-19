import './App.css';
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import HomePage from './components/Homepage/HomePage';
import AccountPage from './components/Accounts/AccountPage';
import PropertyPage from './components/Property Page/PropertyPage';

function App() {
  return (
    <div className="App">
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/property/:id" element={<PropertyPage />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
