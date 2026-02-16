import PageTitle from '@/components/PageTitle';
import AllEditors from './components/AllEditors';
export const metadata = {
  title: 'Editors'
};
const Editors = () => {
  return <>
      <PageTitle title="Editors" />
      <AllEditors />
    </>;
};
export default Editors;