import React from "react";
import { Flame } from "lucide-react";
import { useFinancial } from "../context/FinancialContext";
import { todayLocalStr } from "../lib/utils";

const StreakCounter = () => {
  const { transactions } = useFinancial();

  const distinctDays = new Set(
    transactions
      .filter((t) => t.date)
      .map((t) => todayLocalStr(new Date(t.date))),
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
    <div className="rounded-xl border border-border bg-card px-4 py-3 flex items-center gap-3">
      <div className="p-2 rounded-full bg-orange-500/10 text-orange-500 dark:bg-orange-100 dark:text-orange-500">
        <Flame className="h-4 w-4" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">Day Streak</p>
        <p className="text-lg font-semibold tabular-nums">
          {streak} {streak === 1 ? "day" : "days"}
        </p>
      </div>
    </div>
  );
};

export default StreakCounter;
