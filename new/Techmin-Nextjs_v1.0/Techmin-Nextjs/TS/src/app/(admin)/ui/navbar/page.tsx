import PageTitle from '@/components/PageTitle'
import type { Metadata } from 'next'
import AllNavbars from './components/AllNavbars'

export const metadata: Metadata = { title: 'Navbar' }

const Navbars = () => {
  return (
    <>
      <PageTitle title="Navbar" />
      <AllNavbars />
    </>
  )
}
export default Navbars
