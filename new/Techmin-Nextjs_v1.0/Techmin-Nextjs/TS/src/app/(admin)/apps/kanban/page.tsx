import { Col, Row } from 'react-bootstrap'
import Board from './Components/Board'
import { KanbanProvider } from '@/context/useKanbanContext'
import KanbanModal from './Components/Modal'
import type { Metadata } from 'next'
import PageTitle from '@/components/PageTitle'

export const metadata: Metadata = { title: 'Kanban Board' }

const KanbanBoard = () => {
  return (
    <>
      <PageTitle title="Kanban" />
      <Row>
        <Col xs={12}>
          <KanbanProvider>
            <Board />
            <KanbanModal />
          </KanbanProvider>
        </Col>
      </Row>
    </>
  )
}
export default KanbanBoard
