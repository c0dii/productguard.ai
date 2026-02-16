import type { Metadata } from 'next'
import AllChartjsCharts from './components/AllChartjsCharts'
import PageTitle from '@/components/PageTitle'

export const metadata: Metadata = { title: 'Chartjs Charts' }

const ChartJs = () => {
  return (
    <>
      <PageTitle title="Chartjs" />
      <AllChartjsCharts />
    </>
  )
}
export default ChartJs
