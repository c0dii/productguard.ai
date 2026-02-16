import PageTitle from '@/components/PageTitle';
import AllPlaceholders from './components/AllPlaceholders';
export const metadata = {
  title: 'Placeholders'
};
const Placeholders = () => {
  return <>
      <PageTitle title="Placeholders" />
      <AllPlaceholders />
    </>;
};
export default Placeholders;