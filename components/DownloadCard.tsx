import React, { useState } from 'react';
import { formatTime } from '../utils/time';

interface DownloadCardProps {
  videoId: string | null;
  duration: number;
  title: string;
  recordedUrl: string | null;
  onRecordAnother: () => void;
  fileExtension: string;
}

const DownloadCard: React.FC<DownloadCardProps> = ({ videoId, duration, title, recordedUrl, onRecordAnother, fileExtension }) => {
  const [fileName, setFileName] = useState<string>(title);
    
  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <h2 className="text-2xl font-bold text-green-400">Recording Complete!</h2>
      <div className="w-full bg-gray-700/50 rounded-lg p-4 flex flex-col gap-4 border border-gray-600">
        {recordedUrl && (
          <video 
            src={recordedUrl} 
            controls 
            preload="metadata"
            className="w-full max-h-64 bg-black rounded-md"
          />
        )}
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="w-32 h-20 md:w-48 md:h-28 flex-shrink-0 bg-black rounded-md overflow-hidden">
            {videoId ? (
              <img 
                src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`} 
                alt="Video Thumbnail"
                className="w-full h-full object-cover"
              />
            ) : (
               <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">No preview</div>
            )}
          </div>
        <div className="flex-grow text-left w-full flex flex-col gap-2">
           <div>
            <label htmlFor="file-name" className="text-xs text-gray-400">File Name</label>
            <input
              type="text"
              id="file-name"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              className="w-full bg-gray-600 border border-gray-500 text-white rounded-md p-2 text-base font-semibold focus:ring-1 focus:ring-red-500 focus:border-red-500 transition-colors"
            />
          </div>
          <p className="text-gray-400 text-sm">Duration: {formatTime(duration)}</p>
          <p className="text-gray-500 text-xs">File Type: {fileExtension.toUpperCase()} Video</p>
          </div>
        </div>
      </div>
      <div className="w-full flex flex-col sm:flex-row gap-4">
        <a
          href={recordedUrl || '#'}
          download={recordedUrl ? `${fileName.replace(/\s+/g, '_') || 'recording'}.${fileExtension}` : undefined}
          onClick={(e) => !recordedUrl && e.preventDefault()}
          className={`w-full flex-1 flex items-center justify-center gap-2 bg-green-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-green-700 transition-colors duration-300 transform active:scale-95 ${!recordedUrl && 'opacity-50 cursor-not-allowed'}`}
        >
          <svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m9 13.5 3 3m0 0 3-3m-3 3v-6m1.06-4.19-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
          </svg>
          <span>Download Video</span>
        </a>
        <button
          onClick={onRecordAnother}
          className="w-full flex-1 flex items-center justify-center gap-2 bg-gray-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-gray-500 transition-colors duration-300 transform active:scale-95"
        >
          <svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9A2.25 2.25 0 0 0 13.5 5.25h-9A2.25 2.25 0 0 0 2.25 7.5v9A2.25 2.25 0 0 0 4.5 18.75Z" />
          </svg>
          <span>Record Another</span>
        </button>
      </div>
    </div>
  );
};

export default DownloadCard;