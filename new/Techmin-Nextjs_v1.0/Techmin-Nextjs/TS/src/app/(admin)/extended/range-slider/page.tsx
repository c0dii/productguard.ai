import PageTitle from '@/components/PageTitle'
import type { Metadata } from 'next'
import AllRangeSliders from './components/AllRangeSliders'

export const metadata: Metadata = { title: 'RangeSlider' }

const RangeSlider = () => {
  return (
    <>
      <PageTitle title="RangeSlider" />
      <AllRangeSliders />
    </>
  )
}
export default RangeSlider
