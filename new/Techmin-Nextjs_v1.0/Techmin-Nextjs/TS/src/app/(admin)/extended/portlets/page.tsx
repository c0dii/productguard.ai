import IconifyIcon from '@/components/wrappers/IconifyIcon'
import type { Metadata } from 'next'
import { Col, Row } from 'react-bootstrap'
import CustomPortlet from './components/CustomPortlet'
import { colorVariants } from '@/context/constants'
import { toSentenceCase } from '@/utils/change-casing'
import clsx from 'clsx'
import PageTitle from '@/components/PageTitle'

export const metadata: Metadata = { title: 'Portlets' }

const Portlets = () => {
  return (
    <>
      <PageTitle title="Portlets" />
      <Row>
        <Col xl={4} sm={6}>
          <CustomPortlet cardTitle="Default Heading">
            Some quick example text to build on the card title and make up the bulk of the card&apos;s content. Some quick example text to build on
            the card title and make up.
          </CustomPortlet>
        </Col>
        {[...colorVariants.slice(0, 8), 'dark'].map((color, idx) => (
          <Col xl={4} sm={6} key={idx}>
            <CustomPortlet className={clsx(`bg-${color} text-white`)} cardTitle={`${toSentenceCase(color)} Heading`}>
              Some quick example text to build on the card title and make up the bulk of the card&apos;s content. Some quick example text to build on
              the card title and make up.
            </CustomPortlet>
          </Col>
        ))}
      </Row>
    </>
  )
}
export default Portlets
