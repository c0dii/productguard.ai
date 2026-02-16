import type { Metadata } from 'next'
import AllSparklineCharts from './components/AllSparklineCharts'
import PageTitle from '@/components/PageTitle'

export const metadata: Metadata = { title: 'Sparkline' }

const SparkLineCharts = () => {
  return (
    <>
      <PageTitle title="Sparkline" />
      <AllSparklineCharts />
    </>
  )
}
export default SparkLineCharts
