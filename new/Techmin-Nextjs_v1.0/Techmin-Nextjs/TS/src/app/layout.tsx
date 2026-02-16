import type { Metadata } from 'next'
import { Poppins } from 'next/font/google'
import { DEFAULT_PAGE_TITLE } from '@/context/constants'
import Image from 'next/image'

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['200', '300', '400', '500', '600', '700', '800'],
  display: 'swap',
})

import logoDarkFull from '@/assets/images/logo-dark.png'

import '@/assets/scss/app.scss'
import NextTopLoader from 'nextjs-toploader'
import AppProvidersWrapper from '@/components/wrappers/AppProvidersWrapper'

export const metadata: Metadata = {
  title: {
    template: '%s |Techmin - Bootstrap 5 Admin & Dashboard Template',
    default: DEFAULT_PAGE_TITLE,
  },
  description: 'A fully responsive admin theme which can be used to build CRM, CMS,ERP etc.',
}

const splashScreenStyles = `
#splash-screen {
  position: fixed;
  top: 50%;
  left: 50%;
  background: white;
  display: flex;
  height: 100%;
  width: 100%;
  transform: translate(-50%, -50%);
  align-items: center;
  justify-content: center;
  z-index: 9999;
  opacity: 1;
  transition: all 15s linear;
  overflow: hidden;
}

#splash-screen.remove {
  animation: fadeout 0.7s forwards;
  z-index: 0;
}

@keyframes fadeout {
  to {
    opacity: 0;
    visibility: hidden;
  }
}
`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <style suppressHydrationWarning>{splashScreenStyles}</style>
      </head>
      <body className={poppins.className}>
        <div id="splash-screen">
          <Image alt="logo-text" src={logoDarkFull} style={{ height: '8%', width: 'auto' }} priority />
        </div>
        <NextTopLoader color="#1e84c4" showSpinner={false} />
        <div id="__next_splash">
          <AppProvidersWrapper>{children}</AppProvidersWrapper>
        </div>
      </body>
    </html>
  )
}
