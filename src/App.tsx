import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import ChatManager from './components/Chat/ChatManager';
import './App.css';
import HomePage from './components/Homepage/HomePage';
import AccountPage from './components/Accounts/AccountPage';
import OwnersPage from './components/Owners/OwnersPage';
import PropertyPage from './components/Property Page/PropertyPage';
import ListingPage from './components/Owners/ListingPage';
import DevPage from './components/DevPage/DevPage';
import { AuthProvider } from './context/AuthContext';
import { withRestrictionCheck } from './components/common/RestrictedAccessScreen';
import RestrictedAccessScreen from './components/common/RestrictedAccessScreen';
import FeedbackPage from './components/Feedback/FeedbackPage';

// Wrap all components with restriction check
const ProtectedHomePage = withRestrictionCheck(HomePage);
const ProtectedAccountPage = withRestrictionCheck(AccountPage);
const ProtectedOwnersPage = withRestrictionCheck(OwnersPage);
const ProtectedPropertyPage = withRestrictionCheck(PropertyPage);
const ProtectedListingPage = withRestrictionCheck(ListingPage);
const ProtectedDevPage = withRestrictionCheck(DevPage);
const ProtectedChatManager = withRestrictionCheck(ChatManager);
const ProtectedFeedbackPage = withRestrictionCheck(FeedbackPage);

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<ProtectedHomePage />} />
          <Route path="/account" element={<ProtectedAccountPage />} />
          <Route path="/account/:userId" element={<ProtectedAccountPage />} />
          <Route path="/owner-page/:id" element={<ProtectedOwnersPage/>} />
          <Route path="/profile/:id" element={<ProtectedOwnersPage/>} />
          <Route path="/property/:id" element={<ProtectedPropertyPage />} />
          <Route path="/property/:id/edit-property" element={<ProtectedListingPage />} />
          <Route path="/property/:id/:owner-id/view-property" element={<ProtectedPropertyPage />} />
          <Route path="/owner-page/:id/add-property" element={<ProtectedListingPage />} />
          <Route path="/dev" element={<ProtectedDevPage />} />
          <Route path="/feedback" element={<ProtectedFeedbackPage />} />
          <Route path="/restricted" element={<RestrictedAccessScreen />} />
        </Routes>
        <ProtectedChatManager />
      </Router>
    </AuthProvider>
  );
}

export default App;
