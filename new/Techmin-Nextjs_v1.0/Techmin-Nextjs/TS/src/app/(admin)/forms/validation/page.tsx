import PageTitle from '@/components/PageTitle'
import AllValidations from './components/AllValidations'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Validation' }

const Validation = () => {
  return (
    <>
      <PageTitle title="validation" />
      <AllValidations />
    </>
  )
}
export default Validation
