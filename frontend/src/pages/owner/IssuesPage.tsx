import { useOutletContext } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertCircle } from "lucide-react";
import api from "../../services/api";
import { useToast } from "../../hooks/useToast";
import { useTranslation } from "react-i18next";
import { getApiErrorMessage } from "../../utils/apiError";
import type { OwnerDashboardContext } from "./OwnerDashboardLayout";
import { statusPillClass, translateStatus, cardEntrance, cardHover, rowEntrance, rowHover } from "./helpers";

function IssuesPage() {
  const { issues, setIssues } = useOutletContext<OwnerDashboardContext>();
  const showToast = useToast();
  const { t, i18n } = useTranslation();

  const handleStatusChange = async (issueId: string, newStatus: string) => {
    try {
      await api.patch(`/issues/${issueId}?status=${newStatus}`);
      setIssues((prev) =>
        prev.map((issue) =>
          issue.id === issueId ? { ...issue, status: newStatus } : issue
        )
      );
    } catch (err) {
      showToast(getApiErrorMessage(err, t("owner.issues.toastUpdateFailed")), "error");
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
        <AlertCircle size={18} className="dash-icon" style={{ color: "var(--color-accent)" }} /> {t("owner.issues.title")}
      </h2>
      {issues.length === 0 ? (
        <p>{t("owner.issues.emptyState")}</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t("owner.issues.colSubscriber")}</th>
                <th>{t("owner.issues.colDescription")}</th>
                <th>{t("owner.issues.colReported")}</th>
                <th>{t("owner.issues.colStatus")}</th>
                <th>{t("owner.issues.colUpdate")}</th>
              </tr>
            </thead>
            <tbody>
              {issues.map((issue, index) => (
                <motion.tr key={issue.id} {...rowEntrance(index)} whileHover={rowHover}>
                  <td>{issue.subscriber_name || t("owner.issues.unknownSubscriber")}</td>
                  <td>{issue.description}</td>
                  <td>{new Date(issue.created_at).toLocaleString(i18n.language)}</td>
                  <td>
                    <span className={statusPillClass(issue.status)}>
                      <span className="pill-dot"></span>
                      {translateStatus(t, issue.status)}
                    </span>
                  </td>
                  <td>
                    <motion.select
                      className="owner-select"
                      value={issue.status}
                      onChange={(e) => handleStatusChange(issue.id, e.target.value)}
                      whileTap={{ scale: 0.97 }}
                    >
                      <option value="open">{t("common.status.open")}</option>
                      <option value="in progress">{t("common.status.inProgress")}</option>
                      <option value="resolved">{t("common.status.resolved")}</option>
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
