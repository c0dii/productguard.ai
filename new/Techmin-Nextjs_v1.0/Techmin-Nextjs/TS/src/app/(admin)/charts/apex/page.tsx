import PageTitle from '@/components/PageTitle'
import type { Metadata } from 'next'
import AllApexCharts from './components/AllApexCharts'

export const metadata: Metadata = { title: 'Apex Charts' }

const ApexCharts = () => {
  return (
    <>
      <PageTitle title="Apex Charts" />
      <AllApexCharts />
    </>
  )
}
export default ApexCharts
