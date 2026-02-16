import AllModals from './components/AllModals';
import PageTitle from '@/components/PageTitle';
export const metadata = {
  title: 'Modals'
};
const Modals = () => {
  return <>
      <PageTitle title="Modals" />
      <AllModals />
    </>;
};
export default Modals;