import { Col, Row } from 'react-bootstrap'
import EditableForm from './components/EditableForm'
import type { Metadata } from 'next'
import PageTitle from '@/components/PageTitle'

export const metadata: Metadata = { title: 'X-Editable' }

const Editable = () => {
  return (
    <>
      <PageTitle title="X-Editable" />
      <Row>
        <Col xs={12}>
          <EditableForm />
        </Col>
      </Row>
    </>
  )
}
export default Editable
