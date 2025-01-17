"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = FilePreview;
const image_1 = __importDefault(require("next/image"));
const fi_1 = require("react-icons/fi");
function FilePreview({ fileUrl, fileName, fileType }) {
    const isImage = fileType.startsWith('image/');
    return (<div className="mt-2 max-w-xs">
      {isImage ? (<div className="relative w-full h-48">
          <image_1.default src={fileUrl} alt={fileName} fill className="object-contain rounded-md"/>
        </div>) : (<div className="flex items-center space-x-2 p-3 bg-gray-100 rounded-md">
          <fi_1.FiFile className="h-6 w-6"/>
          <span className="text-sm truncate flex-1">{fileName}</span>
        </div>)}
      <a href={fileUrl} download={fileName} className="flex items-center space-x-2 text-sm text-blue-500 hover:text-blue-600 mt-1">
        <fi_1.FiDownload className="h-4 w-4"/>
        <span>Download</span>
      </a>
    </div>);
}
