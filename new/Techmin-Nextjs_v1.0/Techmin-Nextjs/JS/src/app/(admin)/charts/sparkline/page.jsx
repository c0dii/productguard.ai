import AllSparklineCharts from './components/AllSparklineCharts';
import PageTitle from '@/components/PageTitle';
export const metadata = {
  title: 'Sparkline'
};
const SparkLineCharts = () => {
  return <>
      <PageTitle title="Sparkline" />
      <AllSparklineCharts />
    </>;
};
export default SparkLineCharts;