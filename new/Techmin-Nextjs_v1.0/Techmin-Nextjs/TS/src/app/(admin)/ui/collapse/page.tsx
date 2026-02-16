import PageTitle from '@/components/PageTitle'
import type { Metadata } from 'next'
import AllCollapse from './components/AllCollapse'

export const metadata: Metadata = { title: 'Collapse' }

const Collapse = () => {
  return (
    <>
      <PageTitle title="Collapse" />
      <AllCollapse />
    </>
  )
}
export default Collapse
