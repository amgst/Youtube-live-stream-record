
import React from 'react';

interface URLInputProps {
  url: string;
  setUrl: (url: string) => void;
  onStart: () => void;
  error: string | null;
  disabled: boolean;
}

const URLInput: React.FC<URLInputProps> = ({ url, setUrl, onStart, error, disabled }) => {
  return (
    <div className="flex flex-col gap-4 items-center">
      <div className="w-full">
        <label htmlFor="youtube-url" className="sr-only">YouTube URL</label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
             <svg className="w-5 h-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9A2.25 2.25 0 0 0 13.5 5.25h-9A2.25 2.25 0 0 0 2.25 7.5v9A2.25 2.25 0 0 0 4.5 18.75Z" />
             </svg>
          </div>
          <input
            type="text"
            id="youtube-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste YouTube live stream URL here..."
            className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-3 pl-10 focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
          />
        </div>
        {error && <p className="text-red-400 text-sm mt-2 text-center">{error}</p>}
      </div>
      <button
        onClick={onStart}
        disabled={disabled}
        className="w-full flex items-center justify-center gap-2 bg-red-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-300 transform active:scale-95 shadow-lg shadow-red-900/40"
      >
         <svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2a10 10 0 1 0 10 10A10.011 10.011 0 0 0 12 2Zm0 18a8 8 0 1 1 8-8 8.009 8.009 0 0 1-8 8Z"/>
            <path d="M12 7.5a4.5 4.5 0 1 0 4.5 4.5A4.505 4.505 0 0 0 12 7.5Z"/>
        </svg>
        <span>Start Recording</span>
      </button>
    </div>
  );
};

export default URLInput;
