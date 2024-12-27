import '../PropertyPage.css';

interface LoginPromptProps {
  show: boolean;
  onClose: () => void;
}

const LoginPrompt = ({ show, onClose }: LoginPromptProps) => {
  if (!show) return null;

  return (
    <div className="login-prompt-overlay">
      <div className="login-prompt-content">
        <h3 className="section-title">Please Log In</h3>
        <p>You need to be logged in to perform this action.</p>
        <button className="interested-button" onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

export default LoginPrompt;