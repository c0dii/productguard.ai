import type { Metadata } from 'next'
import AllWizard from './components/AllWizard'
import PageTitle from '@/components/PageTitle'

export const metadata: Metadata = { title: 'Wizard' }

const FormWizard = () => {
  return (
    <>
      <PageTitle title="Wizard" />
      <AllWizard />
    </>
  )
}
export default FormWizard
