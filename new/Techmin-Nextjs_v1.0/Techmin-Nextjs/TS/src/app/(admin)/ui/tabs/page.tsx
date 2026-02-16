import PageTitle from '@/components/PageTitle'
import AllTabs from './components/AllTabs'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Tabs' }

const Tabs = () => {
  return (
    <>
      <PageTitle title="Tabs" />
      <AllTabs />
    </>
  )
}
export default Tabs
