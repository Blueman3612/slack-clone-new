import Image from 'next/image';
import { FiFile, FiDownload } from 'react-icons/fi';

interface FilePreviewProps {
  fileUrl: string;
  fileName: string;
  fileType: string;
}

export default function FilePreview({ fileUrl, fileName, fileType }: FilePreviewProps) {
  const isImage = fileType.startsWith('image/');
  
  return (
    <div className="mt-2 max-w-xs">
      {isImage ? (
        <div className="relative w-full h-48">
          <Image
            src={fileUrl}
            alt={fileName}
            fill
            className="object-contain rounded-md"
          />
        </div>
      ) : (
        <div className="flex items-center space-x-2 p-3 bg-gray-100 rounded-md">
          <FiFile className="h-6 w-6" />
          <span className="text-sm truncate flex-1">{fileName}</span>
        </div>
      )}
      <a
        href={fileUrl}
        download={fileName}
        className="flex items-center space-x-2 text-sm text-blue-500 hover:text-blue-600 mt-1"
      >
        <FiDownload className="h-4 w-4" />
        <span>Download</span>
      </a>
    </div>
  );
} 