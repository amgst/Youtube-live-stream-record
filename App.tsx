import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { RecordingStatus } from './types';
import URLInput from './components/URLInput';
import RecordingDisplay from './components/RecordingDisplay';
import DownloadCard from './components/DownloadCard';
import { extractYouTubeID } from './utils/youtube';

const App: React.FC = () => {
  const [url, setUrl] = useState<string>('');
  const [videoTitle, setVideoTitle] = useState<string>('Recorded Live Stream');
  const [status, setStatus] = useState<RecordingStatus>(RecordingStatus.IDLE);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const recordedChunks = useRef<Blob[]>([]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (status === RecordingStatus.RECORDING) {
      interval = setInterval(() => {
        setElapsedTime(prevTime => prevTime + 1);
      }, 1000);
    }
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [status]);

  const videoId = useMemo(() => extractYouTubeID(url), [url]);

  const handleStopRecording = useCallback(() => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      mediaStream?.getTracks().forEach(track => track.stop());
      setStatus(RecordingStatus.PROCESSING);
      setTimeout(() => {
        setStatus(RecordingStatus.FINISHED);
      }, 2500); // Simulate processing time
    }
  }, [mediaRecorder, mediaStream]);
  
  // Effect to handle user stopping sharing from the browser's native UI
  useEffect(() => {
    const stream = mediaStream;
    if (stream) {
      const onStreamEnded = () => {
         // Check status via a callback to ensure we have the latest state
         setStatus(currentStatus => {
            if (currentStatus === RecordingStatus.RECORDING) {
                handleStopRecording();
            }
            return currentStatus;
         });
      };
      
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.addEventListener('ended', onStreamEnded);
      }
      
      return () => {
        if (videoTrack) {
          videoTrack.removeEventListener('ended', onStreamEnded);
        }
      };
    }
  }, [mediaStream, handleStopRecording]);


  const handleStartRecording = useCallback(async () => {
    setError(null);
    if (!videoId) {
      setError('Please enter a valid YouTube video URL.');
      return;
    }
    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl);
      setRecordedUrl(null);
    }
    recordedChunks.current = [];

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunks.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunks.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setRecordedUrl(url);
        recordedChunks.current = [];
      };
      
      setElapsedTime(0);
      setMediaStream(stream);
      setMediaRecorder(recorder);

      recorder.start();
      setStatus(RecordingStatus.RECORDING);

    } catch (err) {
      console.error("Error starting screen recording:", err);
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setError("Screen recording permission was denied. Please try again.");
      } else {
        setError("Failed to start recording. Your browser may not support this feature.");
      }
      setStatus(RecordingStatus.IDLE);
    }
  }, [videoId, recordedUrl]);

  const handleReset = useCallback(() => {
    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl);
    }
    setStatus(RecordingStatus.IDLE);
    setUrl('');
    setElapsedTime(0);
    setError(null);
    setMediaStream(null);
    setMediaRecorder(null);
    setRecordedUrl(null);
    recordedChunks.current = [];
  }, [recordedUrl]);

  const renderContent = () => {
    switch (status) {
      case RecordingStatus.RECORDING:
      case RecordingStatus.PROCESSING:
        return (
          <RecordingDisplay
            status={status}
            elapsedTime={elapsedTime}
            videoId={videoId}
            mediaStream={mediaStream}
            onStop={handleStopRecording}
          />
        );
      case RecordingStatus.FINISHED:
        return (
          <DownloadCard
            videoId={videoId}
            duration={elapsedTime}
            title={videoTitle}
            recordedUrl={recordedUrl}
            onRecordAnother={handleReset}
          />
        );
      case RecordingStatus.IDLE:
      default:
        return (
          <URLInput
            url={url}
            setUrl={setUrl}
            onStart={handleStartRecording}
            error={error}
            disabled={!url}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4 font-sans">
      <header className="text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-red-500 to-red-700">
          YouTube Live Stream Recorder
        </h1>
        <p className="text-gray-400 mt-2 max-w-2xl">
          Record any YouTube live stream (or anything on your screen). Paste a YouTube URL to use as a thumbnail, then start recording. Your video is processed entirely in your browser.
        </p>
      </header>
      
      <main className="w-full max-w-2xl bg-gray-800 rounded-xl shadow-2xl p-6 md:p-8 border border-gray-700">
        <div className="transition-all duration-500">
          {renderContent()}
        </div>
      </main>
      
      <footer className="mt-8 text-center text-gray-500 text-sm">
        <p>Built with React & Tailwind CSS</p>
      </footer>
    </div>
  );
};

export default App;