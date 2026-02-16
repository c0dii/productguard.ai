import type { Metadata } from 'next'
import ImageCropper from './Components/ImageCropper'
import PageTitle from '@/components/PageTitle'

export const metadata: Metadata = { title: 'Image Crop' }

const ImageCrop = () => {
  return (
    <>
      <PageTitle title="Image Crop" />
      <ImageCropper />
    </>
  )
}
export default ImageCrop
