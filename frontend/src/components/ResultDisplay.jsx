import { useState, useEffect, useRef } from 'react'

const BitBox = ({ bit, type = 'default', label }) => {
    let colorClass = ''
    if (type === 'error') colorClass = 'error'
    else if (type === 'parity') colorClass = 'parity'
    else if (type === 'valid') colorClass = 'valid'
    else if (type === 'highlight') colorClass = 'scanned'

    return (
        <div className="flex flex-col items-center gap-1">
            <div className={`bit-box ${colorClass}`}>
                {bit}
            </div>
            {label && <span className="text-[10px] uppercase tracking-wider text-slate-500">{label}</span>}
        </div>
    )
}

const DataVisualizer = ({ data, diffIndices = [], label, highlightIndices = [] }) => {
    return (
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{label}</h3>
            <div className="flex flex-wrap gap-2">
                {data.split('').map((bit, idx) => {
                    let type = 'default'
                    if (diffIndices.includes(idx)) type = 'error'
                    if (highlightIndices.includes(idx)) type = 'highlight'
                    return <BitBox key={idx} bit={bit} type={type} />
                })}
            </div>
        </div>
    )
}

export default function ResultDisplay({ result }) {
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
            interval = setInterval(() => {
                setCurrentStep(prev => prev + 1)
            }, 1500)
        } else if (currentStep >= result.steps.length - 1) {
            setIsPlaying(false)
        }
        return () => clearInterval(interval)
    }, [isPlaying, currentStep, result])

    // Auto-scroll to active step
    useEffect(() => {
        if (stepContainerRef.current) {
            // Simple scroll logic if needed, or stick to paginated view
        }
    }, [currentStep])

    const diffIndices = []
    if (result.transmitted_data && result.received_data) {
        for (let i = 0; i < Math.max(result.transmitted_data.length, result.received_data.length); i++) {
            if (result.transmitted_data[i] !== result.received_data[i]) {
                diffIndices.push(i)
            }
        }
    }

    const step = result.steps[currentStep] || {}

    return (
        <div className="space-y-6 fade-in animate-in slide-in-from-bottom-4 duration-500">

            {/* Summary Header */}
            <div className="grid grid-cols-1 gap-4">
                <DataVisualizer data={result.original_data} label="Original Data" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <DataVisualizer data={result.transmitted_data} label="Transmitted Data (Sender)" />
                    <DataVisualizer
                        data={result.received_data}
                        label="Received Data (Receiver)"
                        diffIndices={diffIndices}
                    />
                </div>
            </div>

            {/* Result Status */}
            <div className={`p-5 rounded-xl border-l-4 shadow-lg ${result.error_detected
                    ? 'bg-red-500/10 border-red-500 text-red-100'
                    : 'bg-emerald-500/10 border-emerald-500 text-emerald-100'
                }`}>
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${result.error_detected ? 'bg-red-500/20' : 'bg-emerald-500/20'}`}>
                        {result.error_detected
                            ? <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            : <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        }
                    </div>
                    <div>
                        <h3 className="text-lg font-bold">
                            {result.error_detected ? "Error Detected" : "Transmission Successful"}
                        </h3>
                        <p className="opacity-80 text-sm">{result.explanation}</p>
                    </div>
                </div>
            </div>

            {/* Step Replay Section */}
            <div className="glass-panel p-6 border-t-4 border-t-cyan-500 flex flex-col min-h-[400px]">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-white">Algorithm Walkthrough</h3>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsPlaying(!isPlaying)}
                            className={`p-2 rounded-lg transition-colors ${isPlaying ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-700 hover:bg-slate-600 text-white'}`}
                        >
                            {isPlaying ? (
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                            ) : (
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                            )}
                        </button>
                        <div className="flex bg-slate-800 rounded-lg p-1">
                            <button
                                onClick={() => { setIsPlaying(false); setCurrentStep(Math.max(0, currentStep - 1)) }}
                                disabled={currentStep === 0}
                                className="p-1 px-3 text-slate-400 hover:text-white disabled:opacity-30"
                            >←</button>
                            <span className="px-2 text-sm text-slate-400 font-mono py-1 min-w-[60px] text-center">
                                {currentStep + 1} / {result.steps.length}
                            </span>
                            <button
                                onClick={() => { setIsPlaying(false); setCurrentStep(Math.min(result.steps.length - 1, currentStep + 1)) }}
                                disabled={currentStep === result.steps.length - 1}
                                className="p-1 px-3 text-slate-400 hover:text-white disabled:opacity-30"
                            >→</button>
                        </div>
                    </div>
                </div>

                {/* Active Step Content */}
                <div className="flex-1 flex flex-col justify-center items-center bg-slate-900/30 rounded-xl p-8 border border-white/5 relative overflow-hidden">

                    <div className="absolute top-0 left-0 w-full h-1 bg-slate-800">
                        <div
                            className="h-full bg-cyan-500 transition-all duration-300"
                            style={{ width: `${((currentStep + 1) / result.steps.length) * 100}%` }}
                        />
                    </div>

                    <div className="text-center w-full max-w-2xl space-y-6">
                        <h4 className="text-2xl font-light text-cyan-300 mb-2">{step.title}</h4>
                        <p className="text-lg text-slate-300 leading-relaxed font-mono">
                            {step.description}
                        </p>

                        {/* State Visualization if Available */}
                        {step.state && Object.keys(step.state).length > 0 && (
                            <div className="mt-8 p-4 bg-slate-800/80 rounded-lg inline-block border border-slate-700">
                                <pre className="text-xs text-left text-slate-400 overflow-x-auto">
                                    {JSON.stringify(step.state, null, 2)}
                                </pre>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
