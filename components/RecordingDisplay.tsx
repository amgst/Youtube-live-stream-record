import React, { useRef, useEffect } from 'react';
import { RecordingStatus } from '../types';
import { formatTime } from '../utils/time';

interface RecordingDisplayProps {
  status: RecordingStatus;
  elapsedTime: number;
  videoId: string | null;
  mediaStream: MediaStream | null;
  onStop: () => void;
  warning: string | null;
  usingOpfs: boolean;
}

const BlinkingDot: React.FC = () => (
  <span className="relative flex h-3 w-3">
    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
  </span>
);

const RecordingDisplay: React.FC<RecordingDisplayProps> = ({ status, elapsedTime, videoId, mediaStream, onStop, warning, usingOpfs }) => {
  const isRecording = status === RecordingStatus.RECORDING;
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && mediaStream) {
      videoRef.current.srcObject = mediaStream;
    }
  }, [mediaStream]);

  return (
    <div className="flex flex-col items-center gap-4">
      {warning && (
        <div className="w-full p-3 bg-yellow-900/50 border border-yellow-700 text-yellow-300 rounded-lg text-sm text-center" role="alert">
          <strong>Warning:</strong> {warning}
        </div>
      )}
      <div className="w-full aspect-video bg-black rounded-lg overflow-hidden border-2 border-gray-700 flex items-center justify-center">
        {mediaStream ? (
          <video
            ref={videoRef}
            autoPlay
            muted
            className="w-full h-full object-contain bg-black"
          />
        ) : videoId ? (
          <img 
            src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`} 
            alt="YouTube Thumbnail"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-gray-500">Video preview unavailable</div>
        )}
      </div>
      
      <div className="w-full text-center p-4 bg-gray-700/50 rounded-lg">
        {isRecording ? (
          <div className="flex flex-col items-center justify-center gap-2">
            <div className="flex items-center justify-center gap-3 text-2xl font-mono text-red-400">
                <BlinkingDot />
                <span>REC</span>
                <span>{formatTime(elapsedTime)}</span>
            </div>
            {usingOpfs && (
                 <div className="relative group flex items-center justify-center" role="status">
                    <p className="text-xs text-green-400 flex items-center gap-1.5">
                        <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
                        </svg>
                        <span>On-disk storage enabled for long recordings.</span>
                        <svg className="w-4 h-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                           <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" clipRule="evenodd" />
                        </svg>
                    </p>
                    <div className="absolute bottom-full mb-2 w-max max-w-xs bg-gray-800 text-white text-xs rounded-lg p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-lg pointer-events-none" role="tooltip">
                       The recording is temporarily saved to a secure browser sandbox to prevent memory issues. After stopping, you will be prompted to download the final file to your computer.
                    </div>
                 </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center gap-3 text-2xl font-mono text-yellow-400">
             <svg className="w-6 h-6 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Processing...</span>
          </div>
        )}
      </div>

      <button
        onClick={onStop}
        disabled={!isRecording}
        className="w-full flex items-center justify-center gap-2 bg-gray-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform active:scale-95"
      >
        <svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2Zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8Z"/>
            <path d="M9 9h6v6H9z"/>
        </svg>
        <span>Stop Recording</span>
      </button>
    </div>
  );
};

export default RecordingDisplay;