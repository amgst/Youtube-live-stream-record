import React, { useRef, useEffect } from 'react';
import { AudioSource } from '../types';

interface PreviewDisplayProps {
  mediaStream: MediaStream | null;
  onStartRecording: () => void;
  onCancel: () => void;
  audioSource: AudioSource;
  setAudioSource: (source: AudioSource) => void;
  error: string | null;
}

const RadioOption: React.FC<{
  id: string;
  value: AudioSource;
  label: string;
  description: string;
  checked: boolean;
  onChange: (source: AudioSource) => void;
}> = ({ id, value, label, description, checked, onChange }) => (
  <label
    htmlFor={id}
    className={`flex items-center p-3 rounded-md cursor-pointer transition-colors ${
      checked ? 'bg-red-900/50 border border-red-700' : 'hover:bg-gray-600/50 border border-transparent'
    }`}
  >
    <input
      type="radio"
      id={id}
      name="audioSource"
      value={value}
      checked={checked}
      onChange={(e) => onChange(e.target.value as AudioSource)}
      className="w-4 h-4 text-red-600 bg-gray-700 border-gray-600 focus:ring-red-500 focus:ring-offset-gray-800"
    />
    <div className="ml-3 text-sm">
      <span className="font-medium text-gray-200">{label}</span>
      <p className="text-gray-400">{description}</p>
    </div>
  </label>
);


const PreviewDisplay: React.FC<PreviewDisplayProps> = ({ mediaStream, onStartRecording, onCancel, audioSource, setAudioSource, error }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && mediaStream) {
      videoRef.current.srcObject = mediaStream;
    }
  }, [mediaStream]);

  return (
    <div className="flex flex-col items-center gap-4">
      <h2 className="text-xl font-bold text-gray-200">Screen Preview</h2>
      <p className="text-gray-400 text-sm text-center -mt-2">This is what will be recorded. Adjust your window if needed.</p>

      <div className="w-full aspect-video bg-black rounded-lg overflow-hidden border-2 border-gray-700 flex items-center justify-center">
        {mediaStream ? (
          <video
            ref={videoRef}
            autoPlay
            muted
            className="w-full h-full object-contain bg-black"
          />
        ) : (
          <div className="text-gray-500">Preview loading...</div>
        )}
      </div>

      {error && <p className="text-red-400 text-sm text-center">{error}</p>}

      <fieldset className="w-full">
        <legend className="text-gray-300 font-semibold mb-2">Audio Source</legend>
        <div className="flex flex-col gap-2 rounded-lg bg-gray-700/50 p-3">
          <RadioOption
            id="audio-tab"
            value="tab"
            label="Tab Audio"
            description="Record audio from the selected screen or tab."
            checked={audioSource === 'tab'}
            onChange={setAudioSource}
          />
          <RadioOption
            id="audio-tab-mic"
            value="tab_and_mic"
            label="Tab Audio + Microphone"
            description="Mix tab audio with your microphone."
            checked={audioSource === 'tab_and_mic'}
            onChange={setAudioSource}
          />
          <RadioOption
            id="audio-none"
            value="none"
            label="No Audio"
            description="Record video only."
            checked={audioSource === 'none'}
            onChange={setAudioSource}
          />
        </div>
      </fieldset>
      
      <div className="w-full flex flex-col sm:flex-row gap-4 mt-2">
         <button
          onClick={onCancel}
          className="w-full flex-1 flex items-center justify-center gap-2 bg-gray-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-gray-500 transition-colors duration-300 transform active:scale-95"
        >
           <svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          <span>Cancel</span>
        </button>
        <button
          onClick={onStartRecording}
          className="w-full flex-1 flex items-center justify-center gap-2 bg-red-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-red-700 transition-all duration-300 transform active:scale-95 shadow-lg shadow-red-900/40"
        >
          <svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2a10 10 0 1 0 10 10A10.011 10.011 0 0 0 12 2Zm0 18a8 8 0 1 1 8-8 8.009 8.009 0 0 1-8 8Z"/>
            <path d="M12 7.5a4.5 4.5 0 1 0 4.5 4.5A4.505 4.505 0 0 0 12 7.5Z"/>
          </svg>
          <span>Start Recording</span>
        </button>
      </div>
    </div>
  );
};

export default PreviewDisplay;