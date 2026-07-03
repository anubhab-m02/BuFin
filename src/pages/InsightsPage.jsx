import { SpendingComparisonWidget, TrendPredictionWidget } from '../components/InsightsWidgets';
import InsightsDashboard from '../components/InsightsDashboard';
import PageHeader from '../components/PageHeader';

const InsightsPage = () => {
    return (
        <div className="space-y-6">
            <PageHeader title="Insights" subtitle="Analyze your spending patterns and trends." />

            {/* Actionable first: leaks/subscriptions need a decision, trends are informational */}
            <div>
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Needs Attention</h2>
                <InsightsDashboard />
            </div>

            <div>
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Trends</h2>
                <div className="grid gap-4 md:grid-cols-2">
                    <TrendPredictionWidget />
                    <SpendingComparisonWidget />
                </div>
            </div>
        </div>
    );
};

export default InsightsPage;
