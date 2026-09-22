import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { MessageCircle, Loader2 } from "lucide-react";
import { isAxiosError } from "axios";
import api from "../../services/api";
import { useToast } from "../../hooks/useToast";
import { cardEntrance, cardHover } from "./shared";

function ReportIssuePage() {
  const showToast = useToast();
  const [issueDescription, setIssueDescription] = useState("");
  const [isSubmittingIssue, setIsSubmittingIssue] = useState(false);

  const handleReportIssue = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmittingIssue(true);

    try {
      await api.post("/issues", { description: issueDescription });
      showToast("Issue reported successfully", "success");
      setIssueDescription("");
    } catch (err) {
      if (isAxiosError(err) && err.response?.data?.detail) {
        showToast(err.response.data.detail, "error");
      } else {
        showToast("Failed to report issue", "error");
      }
    } finally {
      setIsSubmittingIssue(false);
    }
  };

  return (
    <motion.div
      id="report-issue"
      className="dash-card admin-section"
      style={{ animation: "none" }}
      {...cardEntrance(0)}
      whileHover={cardHover}
    >
      <h2 className="dash-card-title">
        <MessageCircle size={18} className="dash-icon" style={{ color: "var(--color-cyan)" }} /> Report an Issue
      </h2>
      <form onSubmit={handleReportIssue}>
        <textarea
          className="dash-textarea"
          placeholder="Describe the issue..."
          value={issueDescription}
          onChange={(e) => setIssueDescription(e.target.value)}
          rows={3}
        />
        <motion.button
          className="dash-button"
          type="submit"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          disabled={isSubmittingIssue}
        >
          {isSubmittingIssue ? <Loader2 size={16} className="btn-spinner" /> : "Submit Report"}
        </motion.button>
      </form>
    </motion.div>
  );
}

export default ReportIssuePage;
