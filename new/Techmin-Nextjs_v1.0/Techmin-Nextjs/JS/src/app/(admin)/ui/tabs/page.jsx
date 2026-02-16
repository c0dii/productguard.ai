import PageTitle from '@/components/PageTitle';
import AllTabs from './components/AllTabs';
export const metadata = {
  title: 'Tabs'
};
const Tabs = () => {
  return <>
      <PageTitle title="Tabs" />
      <AllTabs />
    </>;
};
export default Tabs;