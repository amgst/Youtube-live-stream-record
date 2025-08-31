import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { RecordingStatus, AudioSource } from './types';
import URLInput from './components/URLInput';
import RecordingDisplay from './components/RecordingDisplay';
import DownloadCard from './components/DownloadCard';
import PreviewDisplay from './components/PreviewDisplay';
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
  const [audioSource, setAudioSource] = useState<AudioSource>('tab');
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
  
  useEffect(() => {
    const stream = mediaStream;
    if (stream) {
      const onStreamEnded = () => {
         setStatus(currentStatus => {
            if (currentStatus === RecordingStatus.RECORDING || currentStatus === RecordingStatus.PREVIEW) {
                handleStopRecording();
                // If we were just previewing, reset to idle
                if (currentStatus === RecordingStatus.PREVIEW) {
                    handleReset();
                }
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

  const handleSelectScreen = useCallback(async () => {
    setError(null);
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
      setMediaStream(null);
    }

    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
      setMediaStream(displayStream);
      setStatus(RecordingStatus.PREVIEW);
    } catch (err) {
      console.error("Error selecting screen:", err);
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setError("Screen sharing permission was denied. Please try again.");
      } else {
        setError("Failed to select a screen. Your browser may not support this feature.");
      }
      setStatus(RecordingStatus.IDLE);
    }
  }, [mediaStream]);


  const handleStartRecording = useCallback(async () => {
    if (!mediaStream) {
        setError("No screen selected to record.");
        setStatus(RecordingStatus.IDLE);
        return;
    }
    setError(null);
    setWarning(null);
    
    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl);
      setRecordedUrl(null);
    }
    recordedChunks.current = [];

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
    
    const opfsSupported = 'storage' in navigator && 'getDirectory' in navigator.storage;
    setUsingOpfs(opfsSupported);

    if (opfsSupported) {
      try {
        const root = await navigator.storage.getDirectory();
        opfsFileHandleRef.current = await root.getFileHandle(opfsFileName, { create: true });
        opfsWritableStreamRef.current = await opfsFileHandleRef.current.createWritable();
      } catch (opfsError) {
        console.warn("Could not initialize OPFS. Falling back to in-memory storage.", opfsError);
        setUsingOpfs(false);
      }
    }

    try {
      const displayStream = mediaStream;
      let userMicStream: MediaStream | null = null;
      
      if (audioSource === 'tab_and_mic') {
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
           if (micErr instanceof DOMException && (micErr.name === 'NotAllowedError' || micErr.name === 'PermissionDeniedError')) {
              setError("Microphone permission denied. The recording was cancelled. Please restart and grant permission to include microphone audio.");
              mediaStream.getTracks().forEach(track => track.stop());
              setMediaStream(null);
              setStatus(RecordingStatus.IDLE);
              return;
           } else {
             setWarning("Could not access microphone. Recording will continue without it.");
             userMicStream = null;
           }
        }
      }

      const hasDisplayAudio = displayStream.getAudioTracks().length > 0;
      const hasMicAudio = userMicStream && userMicStream.getAudioTracks().length > 0;
      const wantsAudio = audioSource === 'tab' || audioSource === 'tab_and_mic';
      const hasAnyAudio = hasDisplayAudio || (hasMicAudio && audioSource === 'tab_and_mic');

      if (wantsAudio && !hasAnyAudio) {
        displayStream.getTracks().forEach(track => track.stop());
        userMicStream?.getTracks().forEach(track => track.stop());
        setError("Recording failed: No audio source available for your selected option. Please share tab audio or ensure your microphone is working.");
        setStatus(RecordingStatus.IDLE);
        setMicStream(null);
        setMediaStream(null);
        return;
      }
      
      if (audioSource === 'tab' && !hasDisplayAudio) {
        setWarning("Tab audio not detected. Recording video without audio.");
      } else if (audioSource === 'tab_and_mic' && !hasDisplayAudio && hasMicAudio) {
        setWarning("Tab audio not detected. Recording with microphone audio only.");
      }


      let finalStream: MediaStream;

      if (wantsAudio && hasAnyAudio) {
        audioContextRef.current = new AudioContext();
        const audioContext = audioContextRef.current;
        const destination = audioContext.createMediaStreamDestination();

        if (hasDisplayAudio && (audioSource === 'tab' || audioSource === 'tab_and_mic')) {
          const displaySource = audioContext.createMediaStreamSource(displayStream);
          displaySource.connect(destination);
        }
        
        if (hasMicAudio && audioSource === 'tab_and_mic') {
          const micSource = audioContext.createMediaStreamSource(userMicStream!);
          micSource.connect(destination);
        }
        
        const audioTracks = destination.stream.getAudioTracks();
        const videoTracks = displayStream.getVideoTracks();
        finalStream = new MediaStream([...videoTracks, ...audioTracks]);
      } else {
        // No audio wanted or available.
        finalStream = new MediaStream(displayStream.getVideoTracks());
      }
      
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

      recorder.start(1000);
      setStatus(RecordingStatus.RECORDING);

    } catch (err) {
      console.error("Error starting screen recording:", err);
      setError("Failed to start recording. Please try selecting the screen again.");
      setStatus(RecordingStatus.IDLE);
    }
  }, [recordedUrl, audioSource, usingOpfs, mediaStream]);

  const handleReset = useCallback(async () => {
    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl);
    }
    
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
    setAudioSource('tab');
    recordedChunks.current = [];
  }, [recordedUrl, mediaStream, micStream]);

  const renderContent = () => {
    switch (status) {
      case RecordingStatus.PREVIEW:
        return (
           <PreviewDisplay
            mediaStream={mediaStream}
            onStartRecording={handleStartRecording}
            onCancel={handleReset}
            audioSource={audioSource}
            setAudioSource={setAudioSource}
            error={error}
          />
        );
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
            onSelectScreen={handleSelectScreen}
            error={error}
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