import PageTitle from '@/components/PageTitle';
import AllDataTables from './components/AllDataTables/page';
export const metadata = {
  title: 'Data Tables'
};
const DataTables = () => {
  return <>
      <PageTitle title="Data Tables" />
      <AllDataTables />
    </>;
};
export default DataTables;