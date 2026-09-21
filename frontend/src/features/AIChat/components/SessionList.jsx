import React from "react";
import styles from "../AIChat.module.css";
import HistoryIcon from "@mui/icons-material/History";
import AddIcon from "@mui/icons-material/Add";

export const SessionList = ({ sessions, activeSessionId, onSelect, onNewChat, loading }) => (
  <div className={styles.sessionListWrap}>
    <button type="button" className={styles.newChatBtn} onClick={onNewChat}>
      <AddIcon fontSize="small" /> New trip chat
    </button>

    {loading ? (
      <p className={styles.emptyPanelText}>Loading sessions...</p>
    ) : sessions.length === 0 ? (
      <p className={styles.emptyPanelText}>No past sessions yet.</p>
    ) : (
      sessions.map((s) => {
        const dest = s.constraints?.destination || "Trip planning";
        const date = new Date(s.updatedAt || s.createdAt).toLocaleDateString();
        const isActive = s._id === activeSessionId;
        return (
          <button
            key={s._id}
            type="button"
            className={isActive ? styles.sessionCardActive : styles.sessionCard}
            onClick={() => onSelect(s._id)}
          >
            <HistoryIcon fontSize="small" />
            <div>
              <div className={styles.sessionTitle}>{dest}</div>
              <div className={styles.sessionMeta}>{date}</div>
            </div>
          </button>
        );
      })
    )}
  </div>
);
