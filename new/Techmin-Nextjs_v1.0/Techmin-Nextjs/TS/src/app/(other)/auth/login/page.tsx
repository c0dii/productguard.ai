import { Card, Col, Container, Row } from 'react-bootstrap'
import Image from 'next/image'
import Link from 'next/link'
import AuthLogo from '@/components/AuthLogo'
import LoginForm from './components/LoginForm'
import type { Metadata } from 'next'

import authImg from '@/assets/images/auth-img.jpg'

export const metadata: Metadata = { title: 'Login' }

const Login = () => {
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
                      <h4 className="fs-20">Sign In</h4>
                      <p className="text-muted mb-4">
                        Enter your email address and password to <br /> access account.
                      </p>
                      <LoginForm />
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
export default Login
