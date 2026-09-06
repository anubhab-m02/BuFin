import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFinancial } from "../context/FinancialContext";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
// import {
//   PieChart,
//   Pie,
//   Cell,
//   ResponsiveContainer,
//   Tooltip,
//   Legend,
// } from "recharts";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Trash2,
  Wallet2,
  ArrowLeft,
} from "lucide-react";
import JargonBuster from "./JargonBuster";
import { Button } from "./ui/button";
import EmptyState from "./EmptyState";
import { Skeleton } from "./ui/skeleton";
import { ThresholdProgress } from "./ui/progress";
import { CHART_COLORS, chartTooltipStyle } from "../lib/chartTheme";

export const BudgetSummaryCard = () => {
  const { budgets, transactions, isDataLoading } = useFinancial();
  const navigate = useNavigate();

  const now = new Date();
  const withSpend = budgets.map((b) => {
    const spent = transactions
      .filter((t) => {
        if (t.type !== "expense" || t.category !== b.category) return false;
        const d = new Date(t.date);
        return (
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear()
        );
      })
      .reduce((acc, t) => acc + t.amount, 0);
    return {
      ...b,
      spent,
      pct: b.monthlyLimit > 0 ? (spent / b.monthlyLimit) * 100 : 0,
    };
  });

  const overBudget = withSpend
    .filter((b) => b.pct >= 100)
    .sort((a, b) => b.pct - a.pct);

  if (isDataLoading) {
    return (
      <Card className="h-full shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Budgets</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className="h-full shadow-sm cursor-pointer hover:bg-primary/5 transition-colors"
      onClick={() => navigate("/budgets")}
    >
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Wallet2 className="h-4 w-4 text-muted-foreground" />
          Budgets
        </CardTitle>
      </CardHeader>
      <CardContent>
        {budgets.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No budgets set — tap to add category limits.
          </p>
        ) : overBudget.length === 0 ? (
          <p className="text-sm text-success font-medium">
            All {budgets.length} categories on track this month.
          </p>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              {overBudget.length} of {budgets.length} categor
              {overBudget.length === 1 ? "y" : "ies"} over budget
            </p>
            {overBudget.slice(0, 2).map((b) => (
              <div key={b.id} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium">{b.category}</span>
                  <span className="text-destructive tabular-nums">
                    {Math.round(b.pct)}%
                  </span>
                </div>
                <ThresholdProgress value={b.pct} className="h-2" />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const FinancialSummaryCard = () => {
  const { balance, income, expense, isDataLoading } = useFinancial();

  if (isDataLoading) {
    return (
      <Card className="h-full">
        <CardContent className="h-full flex flex-col justify-between p-5">
          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-32" />
          </div>
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardContent className="h-full flex flex-col justify-between p-5">
        {/* Balance */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Net Balance
            </span>
            <Wallet className="h-3.5 w-3.5" />
          </div>
          <div className="text-3xl font-bold tracking-tight tabular-nums">
            ₹{balance.toFixed(0)}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
          {/* Income */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <div className="p-1 rounded-full bg-success/10">
                <TrendingUp className="h-3 w-3 text-success" />
              </div>
              <span className="text-[10px] font-semibold uppercase">
                Income
              </span>
            </div>
            <div className="text-lg font-semibold text-success tabular-nums">
              +₹{income.toFixed(0)}
            </div>
          </div>

          {/* Expenses */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <div className="p-1 rounded-full bg-destructive/10">
                <TrendingDown className="h-3 w-3 text-destructive" />
              </div>
              <span className="text-[10px] font-semibold uppercase">
                Expense
              </span>
            </div>
            <div className="text-lg font-semibold text-destructive tabular-nums">
              -₹{expense.toFixed(0)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const ExpenseBreakdown = () => {
  const { transactions, isDataLoading } = useFinancial();
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Group all expense transactions by category for the pie chart.
  const chartData = useMemo(() => {
    return transactions
      .filter((t) => t.type === "expense")
      .reduce((acc, curr) => {
        const category = curr.category || "Other";
        const existing = acc.find((item) => item.name === category);

        if (existing) {
          existing.value += Number(curr.amount) || 0;
        } else {
          acc.push({
            name: category,
            value: Number(curr.amount) || 0,
          });
        }

        return acc;
      }, []);
  }, [transactions]);

  // Build a six-month spending history for the selected category.
  const trendData = useMemo(() => {
    if (!selectedCategory) return [];

    const now = new Date();

    return Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);

      const month = date.getMonth();
      const year = date.getFullYear();

      // Sum expenses belonging to the selected category for this month.
      const amount = transactions
        .filter((transaction) => {
          if (
            transaction.type !== "expense" ||
            (transaction.category || "Other") !== selectedCategory
          ) {
            return false;
          }

          const transactionDate = new Date(transaction.date);

          return (
            transactionDate.getMonth() === month &&
            transactionDate.getFullYear() === year
          );
        })
        .reduce(
          (sum, transaction) => sum + (Number(transaction.amount) || 0),
          0,
        );

      return {
        month: date.toLocaleDateString("en-US", {
          month: "short",
        }),
        amount,
      };
    });
  }, [transactions, selectedCategory]);

  // Calculate the total spending for the currently selected category.
  const selectedCategoryTotal = useMemo(() => {
    if (!selectedCategory) return 0;

    return chartData.find((item) => item.name === selectedCategory)?.value || 0;
  }, [chartData, selectedCategory]);

  return (
    <Card className="h-[420px] flex flex-col shadow-sm">
      <CardHeader className="pb-2 pt-4 px-5">
        <div className="flex items-center gap-2">
          {/* dsplay a back button when viewing a category's trend. */}
          {selectedCategory && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setSelectedCategory(null)}
              aria-label="Back to expense breakdown"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}

          <div>
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              {selectedCategory
                ? `${selectedCategory} Spending`
                : "Expense Breakdown"}
            </CardTitle>

            {selectedCategory && (
              <p className="text-xs text-muted-foreground mt-1">
                Last 6 months
              </p>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 min-h-0 p-2">
        {isDataLoading ? (
          // Keep the existing loading state while transactions are fetched.
          <div className="h-full w-full flex items-center justify-center">
            <Skeleton className="h-32 w-32 rounded-full" />
          </div>
        ) : selectedCategory ? (
          // Show the selected category's monthly spending trend.
          <div className="h-full w-full flex flex-col">
            <div className="px-3 pb-2">
              <p className="text-xs text-muted-foreground">Total spending</p>
              <p className="text-2xl font-bold tabular-nums">
                ₹{selectedCategoryTotal.toFixed(2)}
              </p>
            </div>

            {trendData.length > 0 ? (
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={trendData}
                    margin={{
                      top: 10,
                      right: 20,
                      left: 5,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid
                      stroke="var(--border)"
                      strokeDasharray="3 3"
                    />

                    <XAxis
                      dataKey="month"
                      tick={{
                        fill: "var(--muted-foreground)",
                        fontSize: 11,
                      }}
                      axisLine={{
                        stroke: "var(--border)",
                      }}
                      tickLine={false}
                    />

                    <YAxis
                      tick={{
                        fill: "var(--muted-foreground)",
                        fontSize: 11,
                      }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(value) => `₹${value}`}
                    />

                    <Tooltip
                      contentStyle={chartTooltipStyle}
                      formatter={(value) => [
                        `₹${Number(value).toFixed(2)}`,
                        "Spending",
                      ]}
                    />

                    <Line
                      type="monotone"
                      dataKey="amount"
                      stroke={CHART_COLORS[0]}
                      strokeWidth={2}
                      dot={{
                        r: 4,
                        fill: CHART_COLORS[0],
                      }}
                      activeDot={{
                        r: 6,
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
                No spending data available.
              </div>
            )}
          </div>
        ) : chartData.length > 0 ? (
          // display the category spending breakdown.
          <div className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                  // Clicking a category switches to its trend view.
                  onClick={(_, index) => {
                    setSelectedCategory(chartData[index]?.name);
                  }}
                  cursor="pointer"
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                    />
                  ))}
                </Pie>

                <Tooltip contentStyle={chartTooltipStyle} />

                <Legend
                  verticalAlign="middle"
                  align="right"
                  layout="vertical"
                  iconSize={8}
                  wrapperStyle={{
                    fontSize: "10px",
                    color: "var(--foreground)",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          // Display the existing empty state when there are no expenses.
          <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
            No expenses yet
          </div>
        )}
      </CardContent>
    </Card>
  );
};
