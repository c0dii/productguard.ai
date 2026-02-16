import PageTitle from '@/components/PageTitle';
import AllApexCharts from './components/AllApexCharts';
export const metadata = {
  title: 'Apex Charts'
};
const ApexCharts = () => {
  return <>
      <PageTitle title="Apex Charts" />
      <AllApexCharts />
    </>;
};
export default ApexCharts;