import PageTitle from '@/components/PageTitle'
import type { Metadata } from 'next'
import AllAdvancedElements from './components/AllAdvancedElements'

export const metadata: Metadata = { title: 'Form Advanced' }

const FormAdvanced = () => {
  return (
    <>
      <PageTitle title="Form Advanced" />
      <AllAdvancedElements />
    </>
  )
}
export default FormAdvanced
