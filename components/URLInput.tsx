import React from 'react';

interface URLInputProps {
  url: string;
  setUrl: (url: string) => void;
  onSelectScreen: () => void;
  error: string | null;
}

const URLInput: React.FC<URLInputProps> = ({ url, setUrl, onSelectScreen, error }) => {
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
            placeholder="Paste YouTube URL for thumbnail (optional)..."
            className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-3 pl-10 focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
          />
        </div>
         <p className="text-gray-400 text-xs text-center mt-2 w-full max-w-md">
          The app records your screen or a browser tab, not the URL directly.
        </p>
        {error && <p className="text-red-400 text-sm mt-2 text-center">{error}</p>}
      </div>
     
      <button
        onClick={onSelectScreen}
        className="w-full mt-2 flex items-center justify-center gap-2 bg-red-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-300 transform active:scale-95 shadow-lg shadow-red-900/40"
      >
         <svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25A2.25 2.25 0 0 1 5.25 3h13.5A2.25 2.25 0 0 1 21 5.25Z" />
         </svg>
        <span>Select Screen to Record</span>
      </button>
    </div>
  );
};

export default URLInput;