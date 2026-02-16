import AllPaginations from './components/AllPaginations';
import PageTitle from '@/components/PageTitle';
export const metadata = {
  title: 'Pagination'
};
const Pagination = () => {
  return <>
      <PageTitle title="Pagination" />
      <AllPaginations />
    </>;
};
export default Pagination;