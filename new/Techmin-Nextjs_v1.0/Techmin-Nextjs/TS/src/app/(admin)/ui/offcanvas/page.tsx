import PageTitle from '@/components/PageTitle'
import AllOffcanvas from './AllOffcanvas'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Offcanvas' }

const Offcanvas = () => {
  return (
    <>
      <PageTitle title="Offcanvas" />
      <AllOffcanvas />
    </>
  )
}
export default Offcanvas
