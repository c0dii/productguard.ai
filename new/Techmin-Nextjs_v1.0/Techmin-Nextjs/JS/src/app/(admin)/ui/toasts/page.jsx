import AllToasts from './components/AllToasts';
import PageTitle from '@/components/PageTitle';
export const metadata = {
  title: 'Toasts'
};
const Toasts = () => {
  return <>
      <PageTitle title="Toasts" />
      <AllToasts />
    </>;
};
export default Toasts;