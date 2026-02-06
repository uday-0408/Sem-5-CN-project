import { useState } from 'react'
import ResultDisplay from './ResultDisplay'

const TECHNIQUES = [
    { id: 'vrc', name: 'VRC', fullName: 'Vertical Redundancy Check' },
    { id: 'lrc', name: 'LRC', fullName: 'Longitudinal Redundancy Check' },
    { id: 'crc', name: 'CRC', fullName: 'Cyclic Redundancy Check' },
    { id: 'checksum', name: 'Checksum', fullName: 'Checksum' },
]

export default function ErrorVisualizer() {
    const [technique, setTechnique] = useState('vrc')
    const [data, setData] = useState('11010110')
    const [generator, setGenerator] = useState('1001')
    const [introduceError, setIntroduceError] = useState(false)
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState(null)
    const [error, setError] = useState(null)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        setResult(null)

        try {
            const payload = {
                technique,
                data,
                introduce_error: introduceError,
                generator: technique === 'crc' ? generator : undefined
            }

            const response = await fetch('http://127.0.0.1:8000/api/detect-error/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            const resData = await response.json()

            if (!response.ok) {
                // Safe access to error message
                const msg = resData.detail || JSON.stringify(resData)
                throw new Error(msg)
            }

            setResult(resData)
        } catch (err) {
            setError(err.message || "Failed to communicate with server.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="grid lg:grid-cols-12 gap-8 items-start">
            {/* Controls Section */}
            <div className="lg:col-span-4 space-y-6 sticky top-8">
                <div className="glass-panel p-6 border-t-4 border-t-indigo-500">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-white">Configuration</h2>
                        <div className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-3">
                            <label className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Detection Technique</label>
                            <div className="grid grid-cols-2 gap-3">
                                {TECHNIQUES.map(t => (
                                    <button
                                        key={t.id}
                                        type="button"
                                        onClick={() => setTechnique(t.id)}
                                        className={`relative group px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 border ${technique === t.id
                                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/25 translate-y-[-1px]'
                                            : 'bg-slate-800/30 border-slate-700/50 text-slate-400 hover:bg-slate-800 hover:border-slate-600 hover:text-slate-200'
                                            }`}
                                    >
                                        <div className="flex flex-col items-center gap-1">
                                            <span>{t.name}</span>
                                            {technique === t.id && (
                                                <span className="absolute -bottom-2 w-1/3 h-1 bg-indigo-300 rounded-full opacity-50 blur-sm"></span>
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                            <p className="text-xs text-center text-slate-500 h-4">
                                {TECHNIQUES.find(t => t.id === technique)?.fullName}
                            </p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Input Data (Binary)</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <span className="text-slate-500 font-mono">0b</span>
                                </div>
                                <input
                                    type="text"
                                    value={data}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/[^01]/g, '');
                                        setData(val);
                                    }}
                                    className="input-field pl-10 font-mono tracking-widest text-lg"
                                    placeholder="1010..."
                                    required
                                />
                                <div className="absolute inset-0 rounded-xl bg-indigo-500/5 opacity-0 group-focus-within:opacity-100 pointer-events-none transition-opacity duration-300"></div>
                            </div>
                        </div>

                        {technique === 'crc' && (
                            <div className="space-y-2 animate-in slide-in-from-top-2 fade-in duration-300">
                                <label className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Generator (Divisor)</label>
                                <input
                                    type="text"
                                    value={generator}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/[^01]/g, '');
                                        setGenerator(val);
                                    }}
                                    className="input-field font-mono tracking-widest text-lg"
                                    placeholder="1001"
                                    required
                                />
                            </div>
                        )}

                        <div className="py-2">
                            <label className="flex items-center justify-between p-4 bg-slate-800/30 border border-slate-700/50 rounded-xl cursor-pointer group hover:bg-slate-800/50 transition-colors">
                                <span className="flex flex-col">
                                    <span className="text-sm font-semibold text-slate-300 group-hover:text-white transition-colors">Simulate Error</span>
                                    <span className="text-xs text-slate-500">Injects a bit flip during transmission</span>
                                </span>
                                <div className="relative">
                                    <input
                                        type="checkbox"
                                        checked={introduceError}
                                        onChange={(e) => setIntroduceError(e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                </div>
                            </label>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !data}
                            className="w-full btn-primary flex justify-center items-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span>Processing...</span>
                                </>
                            ) : (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
                                    </svg>
                                    <span>Simulate Transmission</span>
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-200 rounded-xl text-sm animate-pulse">
                        <strong>Error:</strong> {error}
                    </div>
                )}
            </div>

            {/* Right: Visualization */}
            <div className="lg:col-span-8">
                {result ? (
                    <ResultDisplay result={result} technique={technique} />
                ) : (
                    <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-slate-700/50 rounded-xl text-slate-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p>Enter data and click simulate to see the error detection process.</p>
                    </div>
                )}
            </div>
        </div>
    )
}
