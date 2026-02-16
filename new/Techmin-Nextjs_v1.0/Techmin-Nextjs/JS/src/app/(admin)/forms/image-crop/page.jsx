import ImageCropper from './Components/ImageCropper';
import PageTitle from '@/components/PageTitle';
export const metadata = {
  title: 'Image Crop'
};
const ImageCrop = () => {
  return <>
      <PageTitle title="Image Crop" />
      <ImageCropper />
    </>;
};
export default ImageCrop;