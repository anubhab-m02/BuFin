import { SpendingComparisonWidget, TrendPredictionWidget } from '../components/InsightsWidgets';
import InsightsDashboard from '../components/InsightsDashboard';
import PageHeader from '../components/PageHeader';

const InsightsPage = () => {
    return (
        <div className="space-y-6">
            <PageHeader title="Insights" subtitle="Analyze your spending patterns and trends." />

            <div className="grid gap-4 md:grid-cols-2">
                <TrendPredictionWidget />
                <SpendingComparisonWidget />
            </div>

            <InsightsDashboard />
        </div>
    );
};

export default InsightsPage;
