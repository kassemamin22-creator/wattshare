import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { isAxiosError } from "axios";
import api from "../services/api";

function Subscribe() {
  const [ampere, setAmpere] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    try {
      await api.post("/subscription", { ampere: Number(ampere) });
      navigate("/dashboard");
    } catch (err) {
      if (isAxiosError(err) && err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError("Subscription failed");
      }
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">⚡ WattShare</div>
        <div className="auth-title">Subscribe to a Generator</div>
        <form onSubmit={handleSubmit}>
          <input
            className="auth-input"
            type="number"
            placeholder="Ampere"
            value={ampere}
            onChange={(e) => setAmpere(e.target.value)}
          />
          <button className="auth-button" type="submit">
            Subscribe
          </button>
          {error && <div className="auth-error">{error}</div>}
        </form>
      </div>
    </div>
  );
}

export default Subscribe;
