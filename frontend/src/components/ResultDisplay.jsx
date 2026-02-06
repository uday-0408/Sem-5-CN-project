
import { useState, useEffect, useRef } from 'react'
import { VRCLevel, LRCLevel, CRCLevel, ChecksumLevel } from './StepVisualizers'

const BitBox = ({ bit, type = 'default', label }) => {
    let colorClass = 'bg-slate-800/40 border-slate-700 text-slate-400'
    let glow = ''

    if (type === 'error') {
        colorClass = 'bg-red-500/20 border-red-500 text-red-200 animate-pulse'
        glow = 'shadow-[0_0_10px_rgba(239,68,68,0.4)]'
    }
    else if (type === 'parity') {
        colorClass = 'bg-amber-500/20 border-amber-500 text-amber-200'
        glow = 'shadow-[0_0_10px_rgba(245,158,11,0.3)]'
    }
    else if (type === 'valid') {
        colorClass = 'bg-emerald-500/20 border-emerald-500 text-emerald-200'
        glow = 'shadow-[0_0_10px_rgba(16,185,129,0.3)]'
    }
    else if (type === 'highlight') {
        colorClass = 'bg-cyan-500/20 border-cyan-500 text-cyan-200 scale-110 z-10'
        glow = 'shadow-[0_0_15px_rgba(6,182,212,0.4)]'
    }

    return (
        <div className="flex flex-col items-center gap-1 group">
            <div className={`
                w-10 h-10 flex items-center justify-center rounded-lg border-2 
                font-mono text-xl font-bold transition-all duration-300
                ${colorClass} ${glow}
            `}>
                {bit}
            </div>
            {label && <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold group-hover:text-slate-300 transition-colors">{label}</span>}
        </div>
    )
}

const DataVisualizer = ({ data, diffIndices = [], label, highlightIndices = [] }) => {
    // Ensure data is string
    const safeData = String(data || "");

    return (
        <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-700/50 backdrop-blur-sm hover:border-slate-500/50 transition-all duration-300">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                {label}
            </h3>
            <div className="flex flex-wrap gap-3">
                {safeData.split('').map((bit, idx) => {
                    let type = 'default'
                    if (diffIndices.includes(idx)) type = 'error'
                    if (highlightIndices.includes(idx)) type = 'highlight'

                    // Simple logic to identify parity/checksum bits if needed, but diffIndices is primary for errors

                    return <BitBox key={idx} bit={bit} type={type} label={idx} />
                })}
            </div>
        </div>
    )
}

export default function ResultDisplay({ result, technique }) {
    const [currentStep, setCurrentStep] = useState(0)
    const [isPlaying, setIsPlaying] = useState(false)
    const stepContainerRef = useRef(null)

    useEffect(() => {
        setCurrentStep(0)
        setIsPlaying(false)
    }, [result])

    useEffect(() => {
        let interval
        if (isPlaying && currentStep < result.steps.length - 1) {
            // Slower animation: 2000ms
            interval = setInterval(() => {
                setCurrentStep(prev => prev + 1)
            }, 2000)
        } else if (currentStep >= result.steps.length - 1) {
            setIsPlaying(false)
        }
        return () => clearInterval(interval)
    }, [isPlaying, currentStep, result])

    const diffIndices = []
    if (result.transmitted_data && result.received_data) {
        const len = Math.max(result.transmitted_data.length, result.received_data.length)
        for (let i = 0; i < len; i++) {
            if (result.transmitted_data[i] !== result.received_data[i]) {
                diffIndices.push(i)
            }
        }
    }

    const step = result.steps[currentStep] || {}

    // Function to render specific visualizer based on technique
    const renderVisualizer = () => {
        if (!step.state) return null;

        switch (technique) {
            case 'vrc':
                return <VRCLevel step={step} />;
            case 'lrc':
                return <LRCLevel step={step} />;
            case 'crc':
                return <CRCLevel step={step} />;
            case 'checksum':
                return <ChecksumLevel step={step} />;
            default:
                // Fallback for generic state dump (or if technique not matched)
                if (Object.keys(step.state).length > 0) {
                    return (
                        <div className="mt-8 p-4 bg-slate-800/80 rounded-lg inline-block border border-slate-700">
                            <pre className="text-xs text-left text-slate-400 overflow-x-auto font-mono">
                                {JSON.stringify(step.state, null, 2)}
                            </pre>
                        </div>
                    );
                }
                return null;
        }
    }

    return (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500 fade-in">

            {/* Transmitted/Received Sections */}
            <div className="grid grid-cols-1 gap-6">
                <DataVisualizer data={result.original_data} label="Original Data payload" />
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <DataVisualizer data={result.transmitted_data} label="Transmitted (Sender)" />
                    <DataVisualizer
                        data={result.received_data}
                        label="Received (Receiver)"
                        diffIndices={diffIndices}
                    />
                </div>
            </div>

            {/* Status Banner */}
            <div className={`
                p-6 rounded-2xl border-l-4 shadow-xl transition-all duration-500
                ${result.error_detected
                    ? 'bg-gradient-to-r from-red-500/10 to-red-900/5 border-red-500'
                    : 'bg-gradient-to-r from-emerald-500/10 to-emerald-900/5 border-emerald-500'
                }
            `}>
                <div className="flex items-center gap-4">
                    <div className={`
                        p-3 rounded-full shadow-lg
                        ${result.error_detected ? 'bg-red-500/20 text-red-100' : 'bg-emerald-500/20 text-emerald-100'}
                    `}>
                        {result.error_detected
                            ? <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            : <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        }
                    </div>
                    <div>
                        <h3 className={`text-xl font-bold ${result.error_detected ? 'text-red-100' : 'text-emerald-100'}`}>
                            {result.error_detected ? "Transmission Error Detected" : "Data Integrity Verified"}
                        </h3>
                        <p className={`opacity-90 mt-1 font-medium ${result.error_detected ? 'text-red-200' : 'text-emerald-200'}`}>
                            {result.explanation}
                        </p>
                    </div>
                </div>
            </div>

            {/* Interactive Walkthrough */}
            <div className="glass-panel overflow-hidden border-t-0 flex flex-col shadow-2xl ring-1 ring-white/10">

                {/* Header / Controls */}
                <div className="bg-slate-900/60 p-4 border-b border-slate-700/50 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-300">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                        </div>
                        <h3 className="text-lg font-bold text-white tracking-wide">Algorithm Processor</h3>
                    </div>

                    <div className="flex items-center gap-3 bg-slate-950/50 p-1 rounded-xl border border-slate-800">
                        <button
                            onClick={() => { setIsPlaying(false); setCurrentStep(Math.max(0, currentStep - 1)) }}
                            disabled={currentStep === 0}
                            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>

                        <div className="flex flex-col items-center min-w-[100px] px-2">
                            <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Step</span>
                            <span className="font-mono text-white font-bold">{currentStep + 1} <span className="text-slate-600">/</span> {result.steps.length}</span>
                        </div>

                        <button
                            onClick={() => { setIsPlaying(false); setCurrentStep(Math.min(result.steps.length - 1, currentStep + 1)) }}
                            disabled={currentStep === result.steps.length - 1}
                            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>

                        <div className="w-px h-6 bg-slate-800 mx-1"></div>

                        <button
                            onClick={() => setIsPlaying(!isPlaying)}
                            className={`
                                flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-bold transition-all
                                ${isPlaying
                                    ? 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/50'
                                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                                }
                            `}
                        >
                            {isPlaying ? (
                                <>
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                                    <span>Pause</span>
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                    <span>Play</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Main Stage */}
                <div className="relative min-h-[400px] bg-slate-900/30 flex flex-col">
                    {/* Progress Bar */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-slate-800">
                        <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-cyan-500 transition-all duration-300 shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                            style={{ width: `${((currentStep + 1) / result.steps.length) * 100}%` }}
                        />
                    </div>

                    <div className="flex-1 p-8 flex flex-col items-center justify-center text-center">
                        <div className="max-w-4xl w-full space-y-8 animate-in fade-in zoom-in-95 duration-300 key={currentStep}">
                            {/* Key prop ensures re-animation on step change */}

                            <div className="space-y-4">
                                <h4 className="text-3xl md:text-4xl font-light text-white tracking-tight">
                                    {step.title}
                                </h4>
                                <p className="text-lg md:text-xl text-slate-400 leading-relaxed max-w-2xl mx-auto font-light border-b border-slate-800 pb-6">
                                    {step.description}
                                </p>
                            </div>

                            {/* Visualization Container */}
                            <div className="flex justify-center items-center min-h-[200px] py-4">
                                {renderVisualizer()}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
