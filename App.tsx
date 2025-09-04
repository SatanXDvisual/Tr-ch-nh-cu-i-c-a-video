
import React, { useState, useEffect, useCallback, useRef } from 'react';

// --- Type Definitions ---
type Status = 'idle' | 'processing' | 'success' | 'error';

// --- SVG Icons (as stateless components) ---
const UploadIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
);

const DownloadIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
);

const SpinnerIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);


// --- UI Components ---
const FileUploadZone: React.FC<{ onFileSelect: (file: File) => void }> = ({ onFileSelect }) => {
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            onFileSelect(e.target.files[0]);
        }
    };

    const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const droppedFile = e.dataTransfer.files[0];
            if (droppedFile.type.startsWith('video/')) {
                 onFileSelect(droppedFile);
            } else {
                alert("Please drop a valid video file.");
            }
        }
    };
    
    return (
        <div className="w-full max-w-2xl mx-auto">
            <label 
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className="flex justify-center w-full h-64 px-4 transition bg-gray-800 border-2 border-gray-600 border-dashed rounded-md appearance-none cursor-pointer hover:border-indigo-400 focus:outline-none">
                <span className="flex flex-col items-center justify-center space-y-4 text-center">
                    <UploadIcon className="w-16 h-16 text-gray-500"/>
                    <span className="font-medium text-gray-400">
                        Drop your video here, or <span className="text-indigo-400">browse</span>
                    </span>
                    <span className="text-sm text-gray-500">Supports all standard video formats</span>
                </span>
                <input type="file" name="file_upload" className="hidden" accept="video/*" onChange={handleFileChange} />
            </label>
        </div>
    );
};

const ProcessingIndicator: React.FC = () => (
    <div className="flex flex-col items-center justify-center text-center text-gray-300">
        <SpinnerIcon className="w-16 h-16 text-indigo-500 animate-spin" />
        <h2 className="mt-6 text-2xl font-semibold">Processing Video...</h2>
        <p className="mt-2 text-gray-400">Extracting the final frame. This might take a moment.</p>
    </div>
);

const ResultDisplay: React.FC<{ imageUrl: string; onDownload: () => void; onReset: () => void; }> = ({ imageUrl, onDownload, onReset }) => {
    return (
        <div className="flex flex-col items-center w-full max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center text-white mb-6">Extraction Complete!</h2>
            <div className="w-full bg-gray-800 p-4 rounded-lg shadow-2xl border border-gray-700">
                <img src={imageUrl} alt="Extracted final frame" className="w-full h-auto rounded-md object-contain" style={{maxHeight: '70vh'}}/>
            </div>
            <div className="flex items-center space-x-4 mt-8">
                <button onClick={onDownload} className="flex items-center justify-center px-6 py-3 font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors duration-200 shadow-lg">
                    <DownloadIcon className="w-5 h-5 mr-2" />
                    Download Frame (.jpg)
                </button>
                <button onClick={onReset} className="px-6 py-3 font-semibold text-gray-300 bg-gray-700 rounded-md hover:bg-gray-600 transition-colors duration-200">
                    Process Another Video
                </button>
            </div>
        </div>
    );
};

const ErrorDisplay: React.FC<{ message: string; onReset: () => void; }> = ({ message, onReset }) => (
    <div className="flex flex-col items-center text-center">
        <h2 className="text-3xl font-bold text-red-500">An Error Occurred</h2>
        <p className="mt-4 text-lg text-gray-400 max-w-lg">{message}</p>
        <button onClick={onReset} className="mt-8 px-6 py-3 font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors duration-200">
            Try Again
        </button>
    </div>
);


// --- Main App Component ---
export default function App() {
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [lastFrameUrl, setLastFrameUrl] = useState<string | null>(null);
    const [status, setStatus] = useState<Status>('idle');
    const [errorMessage, setErrorMessage] = useState<string>('');
    const videoRef = useRef<HTMLVideoElement | null>(null);

    useEffect(() => {
        if (!videoFile) {
            return;
        }

        const processVideo = () => {
            setStatus('processing');
            setLastFrameUrl(null);
            setErrorMessage('');

            const videoElement = document.createElement('video');
            videoRef.current = videoElement;
            videoElement.preload = 'metadata';

            const objectUrl = URL.createObjectURL(videoFile);
            
            const onLoadedMetadata = () => {
                videoElement.currentTime = videoElement.duration;
            };

            const onSeeked = () => {
                const canvas = document.createElement('canvas');
                canvas.width = videoElement.videoWidth;
                canvas.height = videoElement.videoHeight;
                const context = canvas.getContext('2d');
                if (context) {
                    context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
                    const dataUrl = canvas.toDataURL('image/jpeg', 1.0);
                    setLastFrameUrl(dataUrl);
                    setStatus('success');
                } else {
                    setErrorMessage('Could not get canvas context to extract frame.');
                    setStatus('error');
                }
                cleanup();
            };

            const onError = () => {
                setErrorMessage('Failed to load or process the video file. It might be corrupted or in an unsupported format.');
                setStatus('error');
                cleanup();
            };

            const cleanup = () => {
                if (videoRef.current) {
                    videoRef.current.removeEventListener('loadedmetadata', onLoadedMetadata);
                    videoRef.current.removeEventListener('seeked', onSeeked);
                    videoRef.current.removeEventListener('error', onError);
                    videoRef.current = null;
                }
                URL.revokeObjectURL(objectUrl);
            };

            videoElement.addEventListener('loadedmetadata', onLoadedMetadata);
            videoElement.addEventListener('seeked', onSeeked);
            videoElement.addEventListener('error', onError);

            videoElement.src = objectUrl;
        };

        processVideo();

        return () => {
            if (videoRef.current) {
                const objectUrl = videoRef.current.src;
                URL.revokeObjectURL(objectUrl);
                videoRef.current = null;
            }
        };
    }, [videoFile]);

    const handleFileSelect = useCallback((file: File) => {
        setVideoFile(file);
    }, []);

    const handleReset = useCallback(() => {
        setVideoFile(null);
        setLastFrameUrl(null);
        setStatus('idle');
        setErrorMessage('');
    }, []);

    const handleDownload = useCallback(() => {
        if (!lastFrameUrl) return;
        const link = document.createElement('a');
        link.href = lastFrameUrl;
        
        const originalFileName = videoFile?.name.split('.').slice(0, -1).join('.') || 'video';
        link.download = `${originalFileName}_last_frame.jpg`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, [lastFrameUrl, videoFile?.name]);
    
    const renderContent = () => {
        switch (status) {
            case 'processing':
                return <ProcessingIndicator />;
            case 'success':
                return lastFrameUrl ? <ResultDisplay imageUrl={lastFrameUrl} onDownload={handleDownload} onReset={handleReset} /> : <ProcessingIndicator/>;
            case 'error':
                return <ErrorDisplay message={errorMessage} onReset={handleReset} />;
            case 'idle':
            default:
                return <FileUploadZone onFileSelect={handleFileSelect} />;
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
            <header className="text-center mb-12">
                <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500">
                    Last Frame Extractor
                </h1>
                <p className="mt-3 max-w-2xl mx-auto text-lg text-gray-400">
                    Upload a video to instantly capture the final frame in high quality.
                </p>
            </header>
            <main className="w-full flex-grow flex items-center justify-center">
                {renderContent()}
            </main>
             <footer className="w-full text-center py-6 mt-12 text-gray-500 text-sm">
                <p>Built with React, TypeScript, and Tailwind CSS.</p>
            </footer>
        </div>
    );
}
