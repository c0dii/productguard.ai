import PageTitle from '@/components/PageTitle';
import AllValidations from './components/AllValidations';
export const metadata = {
  title: 'Validation'
};
const Validation = () => {
  return <>
      <PageTitle title="validation" />
      <AllValidations />
    </>;
};
export default Validation;