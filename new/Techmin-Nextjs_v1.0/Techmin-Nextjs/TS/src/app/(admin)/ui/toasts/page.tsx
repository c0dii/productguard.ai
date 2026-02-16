import type { Metadata } from 'next'
import AllToasts from './components/AllToasts'
import PageTitle from '@/components/PageTitle'

export const metadata: Metadata = { title: 'Toasts' }

const Toasts = () => {
  return (
    <>
      <PageTitle title="Toasts" />
      <AllToasts />
    </>
  )
}
export default Toasts
