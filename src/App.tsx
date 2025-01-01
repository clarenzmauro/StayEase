import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import ChatManager from './components/Chat/ChatManager';
import './App.css';
import HomePage from './components/Homepage/HomePage';
import AccountPage from './components/Accounts/AccountPage';
import OwnersPage from './components/Owners/OwnersPage';
import PropertyPage from './components/Property Page/PropertyPage';
import ListingPage from './components/Owners/ListingPage';

function App() {
  return (
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/owner-page/:id" element={<OwnersPage/>} />
          <Route path="/property/:id" element={<PropertyPage />} />
          <Route path="/owner-page/:id/add-property" element={<ListingPage />} />
        </Routes>
        <ChatManager />
      </Router>
  );
}

export default App;
