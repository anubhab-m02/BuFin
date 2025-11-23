import { SpendingComparisonWidget, TrendPredictionWidget } from '../components/InsightsWidgets';
import InsightsDashboard from '../components/InsightsDashboard';

const InsightsPage = () => {
    return (
        <div className="space-y-6">
            <div className="pb-2">
                <h1 className="text-3xl font-bold tracking-tight text-primary">Insights</h1>
                <p className="text-muted-foreground mt-1">Analyze your spending patterns and trends.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <TrendPredictionWidget />
                <SpendingComparisonWidget />
            </div>

            <InsightsDashboard />
        </div>
    );
};

export default InsightsPage;
