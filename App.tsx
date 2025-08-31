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
  const [warning, setWarning] = useState<string | null>(null);

  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [includeMic, setIncludeMic] = useState<boolean>(false);
  const [fileExtension, setFileExtension] = useState<string>('webm');
  const [usingOpfs, setUsingOpfs] = useState<boolean>(false);
  
  const recordedChunks = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const opfsFileHandleRef = useRef<FileSystemFileHandle | null>(null);
  const opfsWritableStreamRef = useRef<FileSystemWritableFileStream | null>(null);
  const opfsFileName = 'youtube-livestream-recording.tmp';


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

  const handleStopRecording = useCallback(async () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
    }
  }, [mediaRecorder]);
  
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
    setWarning(null);
    if (!videoId) {
      setError('Please enter a valid YouTube video URL.');
      return;
    }
    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl);
      setRecordedUrl(null);
    }
    recordedChunks.current = [];

    // Prioritize video/audio codecs for broad compatibility, avoiding Opus where possible.
    const MimeTypePriorities = [
      { mimeType: 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"', extension: 'mp4' },
      { mimeType: 'video/webm; codecs="vp9, vorbis"', extension: 'webm' },
      { mimeType: 'video/webm; codecs="vp8, vorbis"', extension: 'webm' },
      { mimeType: 'video/mp4', extension: 'mp4' },
      { mimeType: 'video/webm; codecs=vp9,opus', extension: 'webm' },
      { mimeType: 'video/webm; codecs=vp8,opus', extension: 'webm' },
      { mimeType: 'video/webm', extension: 'webm' }
    ];

    const supportedConfig = MimeTypePriorities.find(config => MediaRecorder.isTypeSupported(config.mimeType));

    if (!supportedConfig) {
      setError("Your browser does not support required video recording formats (MP4/WebM). Please try a different browser like Chrome or Firefox.");
      setStatus(RecordingStatus.IDLE);
      return;
    }

    const { mimeType, extension: ext } = supportedConfig;
    setFileExtension(ext);
    
    // Check for OPFS support for on-disk storage
    const opfsSupported = 'storage' in navigator && 'getDirectory' in navigator.storage;
    setUsingOpfs(opfsSupported);

    if (opfsSupported) {
      try {
        const root = await navigator.storage.getDirectory();
        opfsFileHandleRef.current = await root.getFileHandle(opfsFileName, { create: true });
        opfsWritableStreamRef.current = await opfsFileHandleRef.current.createWritable();
      } catch (opfsError) {
        console.warn("Could not initialize OPFS. Falling back to in-memory storage.", opfsError);
        setUsingOpfs(false); // Fallback if there's an issue
      }
    }

    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      const hasDisplayAudio = displayStream.getAudioTracks().length > 0;

      if (!hasDisplayAudio && !includeMic) {
        displayStream.getTracks().forEach(track => track.stop());
        setError("Recording failed. To record audio, please restart and check the 'Share tab audio' option in the browser prompt.");
        setStatus(RecordingStatus.IDLE);
        return;
      }

      if (!hasDisplayAudio && includeMic) {
        setWarning("Tab audio not detected. Recording with microphone audio only.");
      }

      let finalStream = displayStream;
      let userMicStream: MediaStream | null = null;

      if (includeMic) {
        try {
          userMicStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              sampleRate: 44100
            },
            video: false,
          });
          setMicStream(userMicStream);
        } catch (micErr) {
           console.warn("Could not get microphone audio:", micErr);
           setError("Could not access microphone. Recording system audio only if shared.");
        }
      }

      // Mix audio tracks if necessary
      const hasMicAudio = userMicStream && userMicStream.getAudioTracks().length > 0;
      if (hasDisplayAudio || hasMicAudio) {
        audioContextRef.current = new AudioContext();
        const audioContext = audioContextRef.current;
        const destination = audioContext.createMediaStreamDestination();

        if (hasDisplayAudio) {
          const displaySource = audioContext.createMediaStreamSource(displayStream);
          displaySource.connect(destination);
        }
        
        if (hasMicAudio) {
          const micSource = audioContext.createMediaStreamSource(userMicStream!);
          micSource.connect(destination);
        }
        
        const audioTracks = destination.stream.getAudioTracks();
        const videoTracks = displayStream.getVideoTracks();
        finalStream = new MediaStream([...videoTracks, ...audioTracks]);
      } else {
        finalStream = new MediaStream(displayStream.getVideoTracks());
      }
      
      setMediaStream(finalStream);
      const recorder = new MediaRecorder(finalStream, { mimeType });

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          if (usingOpfs && opfsWritableStreamRef.current) {
            opfsWritableStreamRef.current.write(event.data);
          } else {
            recordedChunks.current.push(event.data);
          }
        }
      };

      recorder.onstop = async () => {
        setStatus(RecordingStatus.PROCESSING);
        
        // Clean up all streams and the audio context
        displayStream?.getTracks().forEach(track => track.stop());
        userMicStream?.getTracks().forEach(track => track.stop());
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close();
        }
        audioContextRef.current = null;
        setMicStream(null);
        setMediaStream(null);

        let fileUrl: string | null = null;
        if (usingOpfs && opfsWritableStreamRef.current && opfsFileHandleRef.current) {
          await opfsWritableStreamRef.current.close();
          const file = await opfsFileHandleRef.current.getFile();
          fileUrl = URL.createObjectURL(file);
        } else {
          const blob = new Blob(recordedChunks.current, { type: mimeType });
          fileUrl = URL.createObjectURL(blob);
          recordedChunks.current = [];
        }

        setRecordedUrl(fileUrl);
        setStatus(RecordingStatus.FINISHED);
      };
      
      setElapsedTime(0);
      setMediaRecorder(recorder);

      recorder.start(1000); // Trigger ondataavailable every second
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
  }, [videoId, recordedUrl, includeMic, usingOpfs]);

  const handleReset = useCallback(async () => {
    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl);
    }
    
    // Clean up OPFS file if it exists
    if (opfsFileHandleRef.current) {
      try {
        const root = await navigator.storage.getDirectory();
        await root.removeEntry(opfsFileName);
      } catch (e) {
        console.warn("Could not remove temporary recording file.", e);
      }
    }

    setStatus(RecordingStatus.IDLE);
    setUrl('');
    setElapsedTime(0);
    setError(null);
    setWarning(null);
    mediaStream?.getTracks().forEach(track => track.stop());
    micStream?.getTracks().forEach(track => track.stop());
     if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
    }
    audioContextRef.current = null;
    opfsFileHandleRef.current = null;
    opfsWritableStreamRef.current = null;
    setMediaStream(null);
    setMicStream(null);
    setMediaRecorder(null);
    setRecordedUrl(null);
    setIncludeMic(false);
    recordedChunks.current = [];
  }, [recordedUrl, mediaStream, micStream]);

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
            warning={warning}
            usingOpfs={usingOpfs}
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
            fileExtension={fileExtension}
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
            includeMic={includeMic}
            setIncludeMic={setIncludeMic}
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
