import { useState, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { isAxiosError } from "axios";
import api from "../services/api";

function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("subscriber");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    try {
      await api.post("/register", { name, email, password, role });
      navigate("/");
    } catch (err) {
      if (isAxiosError(err) && err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError("Registration failed");
      }
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">⚡ WattShare</div>
        <div className="auth-title">Create Account</div>
        <form onSubmit={handleSubmit}>
          <input
            className="auth-input"
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="auth-input"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="auth-input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <select
            className="auth-input"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="subscriber">Subscriber</option>
            <option value="owner">Owner</option>
          </select>
          <button className="auth-button" type="submit">
            Create Account
          </button>
          {error && <div className="auth-error">{error}</div>}
        </form>
        <Link className="auth-link" to="/">
          Already have an account? Log In
        </Link>
      </div>
    </div>
  );
}

export default Register;
