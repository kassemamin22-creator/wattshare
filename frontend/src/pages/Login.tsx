import { useState, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { isAxiosError } from "axios";
import { jwtDecode } from "jwt-decode";
import api from "../services/api";

interface DecodedToken {
  id: string;
  role: string;
  exp: number;
}

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    try {
      const response = await api.post("/login", { email, password });
      const token = response.data.access_token;
      localStorage.setItem("token", token);

      const decoded = jwtDecode<DecodedToken>(token);
      navigate(decoded.role === "owner" ? "/owner" : "/dashboard");
    } catch (err) {
      if (isAxiosError(err) && err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError("Login failed");
      }
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">⚡ WattShare</div>
        <div className="auth-title">Log In</div>
        <form onSubmit={handleSubmit}>
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
          <button className="auth-button" type="submit">
            Log In
          </button>
          {error && <div className="auth-error">{error}</div>}
        </form>
        <Link className="auth-link" to="/register">
          Don't have an account? Register
        </Link>
      </div>
    </div>
  );
}

export default Login;
