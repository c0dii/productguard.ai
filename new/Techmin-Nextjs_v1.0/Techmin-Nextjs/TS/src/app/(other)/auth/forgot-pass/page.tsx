import AuthLogo from '@/components/AuthLogo'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Card, Col, Container, Row } from 'react-bootstrap'

import authImg from '@/assets/images/auth-img.jpg'
import ForgotPasswordForm from './components/ForgotPasswordForm'

export const metadata: Metadata = { title: 'Forgot Password' }

const ForgotPassword = () => {
  return (
    <div className="account-pages p-sm-5  position-relative">
      <Container>
        <Row className="justify-content-center">
          <Col xxl={9} lg={11}>
            <Card className="overflow-hidden">
              <Row className="g-0">
                <Col lg={6}>
                  <div className="d-flex flex-column h-100">
                    <AuthLogo />
                    <div className="p-4 my-auto text-center">
                      <div>
                        <h4 className="fs-20">Forgot Password?</h4>
                        <p className="text-muted mb-3">
                          Enter your email address and we&apos;ll send you an email with instructions to reset your password.
                        </p>
                      </div>
                      <ForgotPasswordForm />
                    </div>
                  </div>
                </Col>
                <Col lg={6} className="d-none d-lg-block">
                  <Image src={authImg} alt="image" className="img-fluid rounded h-100" />
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>
        <Row>
          <Col xs={12} className="text-center">
            <p className="text-dark-emphasis">
              Don&apos;t have an account?
              <Link href="/auth/register" className="text-dark fw-bold ms-1 link-offset-3 text-decoration-underline">
                <b>Sign up</b>
              </Link>
            </p>
          </Col>
        </Row>
      </Container>
    </div>
  )
}
export default ForgotPassword
