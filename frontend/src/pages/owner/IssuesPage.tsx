import { useOutletContext } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertCircle } from "lucide-react";
import api from "../../services/api";
import type { OwnerDashboardContext } from "./OwnerDashboardLayout";
import { statusPillClass, cardEntrance, cardHover, rowEntrance, rowHover } from "./shared";

function IssuesPage() {
  const { issues, setIssues } = useOutletContext<OwnerDashboardContext>();

  const handleStatusChange = async (issueId: string, newStatus: string) => {
    try {
      await api.patch(`/issues/${issueId}?status=${newStatus}`);
      setIssues((prev) =>
        prev.map((issue) =>
          issue.id === issueId ? { ...issue, status: newStatus } : issue
        )
      );
    } catch {
      // status update failed; leave the dropdown as-is
    }
  };

  return (
    <motion.section
      id="issues"
      className="dash-card admin-section"
      {...cardEntrance(0)}
      whileHover={cardHover}
    >
      <h2 className="dash-card-title">
        <AlertCircle size={18} className="dash-icon" style={{ color: "var(--color-accent)" }} /> Reported Issues
      </h2>
      {issues.length === 0 ? (
        <p>No issues reported yet</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Subscriber</th>
                <th>Description</th>
                <th>Reported</th>
                <th>Status</th>
                <th>Update</th>
              </tr>
            </thead>
            <tbody>
              {issues.map((issue, index) => (
                <motion.tr key={issue.id} {...rowEntrance(index)} whileHover={rowHover}>
                  <td>{issue.subscriber_name || "Unknown"}</td>
                  <td>{issue.description}</td>
                  <td>{new Date(issue.created_at).toLocaleString()}</td>
                  <td>
                    <span className={statusPillClass(issue.status)}>
                      <span className="pill-dot"></span>
                      {issue.status.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <motion.select
                      className="owner-select"
                      value={issue.status}
                      onChange={(e) => handleStatusChange(issue.id, e.target.value)}
                      whileTap={{ scale: 0.97 }}
                    >
                      <option value="open">Open</option>
                      <option value="in progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                    </motion.select>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.section>
  );
}

export default IssuesPage;
