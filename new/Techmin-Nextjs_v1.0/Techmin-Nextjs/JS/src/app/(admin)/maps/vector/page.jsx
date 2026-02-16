import AllVectorMaps from './components/AllVectorMaps';
import PageTitle from '@/components/PageTitle';
export const metadata = {
  title: 'Vector Maps'
};
const VectorPage = () => {
  return <>
      <PageTitle title="Vector Maps" />
      <AllVectorMaps />
    </>;
};
export default VectorPage;