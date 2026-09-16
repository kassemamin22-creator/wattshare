import { useNavigate } from "react-router-dom";

function Dashboard() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">⚡ WattShare</div>
        <h1 className="auth-title">Welcome to WattShare</h1>
        <p>You are logged in.</p>
        <button className="auth-button" onClick={handleLogout}>
          Log Out
        </button>
      </div>
    </div>
  )
}

export default Dashboard
