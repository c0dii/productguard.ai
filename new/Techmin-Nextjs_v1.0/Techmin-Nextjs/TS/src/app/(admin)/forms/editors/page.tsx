import PageTitle from '@/components/PageTitle'
import type { Metadata } from 'next'
import AllEditors from './components/AllEditors'

export const metadata: Metadata = { title: 'Editors' }

const Editors = () => {
  return (
    <>
      <PageTitle title="Editors" />
      <AllEditors />
    </>
  )
}
export default Editors
