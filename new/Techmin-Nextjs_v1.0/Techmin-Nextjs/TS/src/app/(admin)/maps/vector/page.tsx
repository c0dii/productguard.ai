import type { Metadata } from 'next'
import AllVectorMaps from './components/AllVectorMaps'
import PageTitle from '@/components/PageTitle'

export const metadata: Metadata = { title: 'Vector Maps' }

const VectorPage = () => {
  return (
    <>
      <PageTitle title="Vector Maps" />
      <AllVectorMaps />
    </>
  )
}

export default VectorPage
