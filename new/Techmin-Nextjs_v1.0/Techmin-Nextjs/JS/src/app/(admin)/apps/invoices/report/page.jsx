import PageTitle from '@/components/PageTitle';
import { Col, Row } from 'react-bootstrap';
import AllInvoiceReport from './components/AllInvoiceReport';
export const metadata = {
  title: 'Invoice Report'
};
const Reports = () => {
  return <>
      <PageTitle title="Invoice Report" />
      <Row>
        <Col xl={12}>
          <AllInvoiceReport />
        </Col>
      </Row>
    </>;
};
export default Reports;