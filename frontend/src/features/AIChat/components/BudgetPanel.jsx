import React from "react";
import styles from "../AIChat.module.css";

const CATEGORY_LABELS = {
  flights: "Flights",
  hotels: "Hotels",
  food: "Food",
  transport: "Transport",
  activities: "Activities",
  misc: "Misc",
};

export const BudgetPanel = ({ tripPlan, constraints }) => {
  const budget = tripPlan?.budgetSummary;

  if (!budget) {
    const total = constraints?.budgetTotal;
    return (
      <p className={styles.emptyPanelText}>
        {total
          ? `Budget target: ${total.currency} ${total.amount} — ask SkyNora to calculate a full breakdown.`
          : "No budget calculated yet. Share your budget and ask for a cost breakdown."}
      </p>
    );
  }

  const breakdown = budget.breakdown || {};
  const maxAmount = Math.max(
    ...Object.values(breakdown).map((m) => m?.amount || 0),
    budget.totalBudget?.amount || 1
  );

  return (
    <div className={styles.budgetPanel}>
      <div className={styles.budgetSummaryRow}>
        <span>Total budget</span>
        <strong>{budget.totalBudget?.currency} {budget.totalBudget?.amount}</strong>
      </div>
      <div className={styles.budgetSummaryRow}>
        <span>Estimated spend</span>
        <strong>{budget.totalSpent?.currency} {budget.totalSpent?.amount}</strong>
      </div>
      <div className={styles.budgetSummaryRow}>
        <span>Remaining</span>
        <strong className={budget.remaining?.amount < 0 ? styles.overBudget : ""}>
          {budget.remaining?.currency} {budget.remaining?.amount}
        </strong>
      </div>

      <hr className={styles.divider} />

      {Object.entries(breakdown).map(([key, money]) => {
        if (!money?.amount) return null;
        const pct = Math.min(100, (money.amount / maxAmount) * 100);
        return (
          <div key={key} className={styles.budgetBarGroup}>
            <div className={styles.budgetBarLabel}>
              <span>{CATEGORY_LABELS[key] || key}</span>
              <span>{money.currency} {money.amount}</span>
            </div>
            <div className={styles.budgetBarTrack}>
              <div className={styles.budgetBarFill} style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}

      {budget.perPersonPerDay && (
        <p className={styles.budgetFootnote}>
          Per person/day: {budget.perPersonPerDay.currency} {budget.perPersonPerDay.amount}
        </p>
      )}
    </div>
  );
};
