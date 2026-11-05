import React from "react";
import { dateOnly } from '../lib/utils';
import { Flame } from "lucide-react";
import { useFinancial } from "../context/FinancialContext";
import { todayLocalStr } from "../lib/utils";

const StreakCounter = () => {
  const { transactions } = useFinancial();

  const distinctDays = new Set(
    transactions
      .filter((t) => t.date)
      .map((t) => dateOnly(t.date)),
  );

  let streak = 0;
  const cursor = new Date();
  let day = todayLocalStr(cursor);

  if (!distinctDays.has(day)) {
    cursor.setDate(cursor.getDate() - 1);
    day = todayLocalStr(cursor);
  }

  while (distinctDays.has(day)) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
    day = todayLocalStr(cursor);
  }

  return (
    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <Flame className="h-4 w-4" aria-hidden="true" />
      <span>
        <span className="font-medium text-foreground tabular-nums">{streak}</span>
        {streak === 1 ? " day" : " days"} streak
      </span>
    </div>
  );
};

export default StreakCounter;
