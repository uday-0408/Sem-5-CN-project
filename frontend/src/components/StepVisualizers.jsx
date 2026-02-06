
import React from 'react';

const Mono = ({ children, className = "" }) => (
    <span className={`font-mono ${className}`}>{children}</span>
);

const BitGrid = ({ bits, highlightIdx = -1, colorMap = {} }) => {
    return (
        <div className="flex flex-wrap gap-1 justify-center">
            {bits.split('').map((b, i) => {
                let colorClass = "bg-slate-800 text-slate-400 border-slate-700";
                if (highlightIdx === i) colorClass = "bg-indigo-500/20 text-indigo-300 border-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.3)] scale-110 z-10";
                if (colorMap[i]) colorClass = colorMap[i];

                return (
                    <div key={i} className={`w-8 h-8 flex items-center justify-center rounded border text-sm transition-all duration-300 ${colorClass}`}>
                        {b}
                    </div>
                );
            })}
        </div>
    );
};

export const VRCLevel = ({ step }) => {
    const { state } = step;
    if (!state || Object.keys(state).length === 0) return null;

    // Expected State: { index, bit, count, action }
    // Or final: { parity }

    // Display the full data being processed if accessible? 
    // Ideally we should have the full data string context. 
    // State only has 'index'. We need to know the 'data' string to show context.
    // Solution: The parent should pass context or state should include full data?
    // Since we can't easily change backend again for full data every step (too big), 
    // we assume the parent 'ResultDisplay' provides the 'transmitted_data' or 'original_data' context.
    // However, the visualizer here receives 'step'. 

    // Actually, let's use what we have. 

    return (
        <div className="flex flex-col items-center gap-6">
            {state.action === 'increment' || state.action === 'skip' ? (
                <>
                    <div className="text-xl font-mono">
                        Current Bit: <span className="text-cyan-400 text-3xl font-bold">{state.bit}</span>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div className={`h-full transition-all duration-300 ${state.bit === '1' ? 'bg-indigo-500' : 'bg-slate-600'}`} style={{ width: '100%' }}></div>
                    </div>
                    <div className="grid grid-cols-2 gap-8 text-center">
                        <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                            <div className="text-xs text-slate-500 uppercase tracking-wider">Position</div>
                            <div className="text-2xl font-mono text-white">{state.index}</div>
                        </div>
                        <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                            <div className="text-xs text-slate-500 uppercase tracking-wider">Ones Count</div>
                            <div className="text-2xl font-mono text-white">{state.count}</div>
                            <div className="text-xs text-slate-400 mt-1">{state.count % 2 === 0 ? 'Even' : 'Odd'}</div>
                        </div>
                    </div>
                </>
            ) : null}

            {state.parity && (
                <div className="flex flex-col items-center animate-in zoom-in duration-500">
                    <div className="text-sm text-slate-400 mb-2">Calculated Parity Bit</div>
                    <div className="w-16 h-16 flex items-center justify-center rounded-xl bg-amber-500/20 text-amber-300 border-2 border-amber-500 text-3xl font-bold shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                        {state.parity}
                    </div>
                </div>
            )}
        </div>
    );
};

export const LRCLevel = ({ step }) => {
    const { state } = step;
    if (!state) return null;

    // State: blocks (list of strings), highlight_col, column_bits, count, parity_bit

    // If blocks are present, show the grid
    const blocks = state.blocks || [];

    return (
        <div className="flex flex-col items-center gap-6 w-full overflow-x-auto">
            {blocks.length > 0 && (
                <div className="flex flex-col gap-1">
                    {blocks.map((block, rIdx) => (
                        <div key={rIdx} className="flex gap-1">
                            {block.split('').map((bit, cIdx) => {
                                const isColActive = state.highlight_col === cIdx;
                                return (
                                    <div
                                        key={cIdx}
                                        className={`
                                            w-10 h-10 flex items-center justify-center rounded border font-mono transition-all duration-300
                                            ${isColActive
                                                ? 'bg-indigo-500/30 border-indigo-500 text-white scale-105 z-10 shadow-lg'
                                                : 'bg-slate-800/40 border-slate-700 text-slate-400'
                                            }
                                        `}
                                    >
                                        {bit}
                                    </div>
                                );
                            })}
                        </div>
                    ))}

                    {/* Parity Row Placeholder or Result */}
                    {state.parity_bit && (
                        <div className="flex gap-1 mt-2 pt-2 border-t border-slate-700/50">
                            {blocks[0].split('').map((_, cIdx) => {
                                const isTarget = state.highlight_col === cIdx;
                                return (
                                    <div
                                        key={cIdx}
                                        className={`
                                            w-10 h-10 flex items-center justify-center rounded border font-mono transition-all duration-500
                                            ${isTarget
                                                ? 'bg-amber-500/20 border-amber-500 text-amber-300 scale-110 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                                                : 'bg-transparent border-transparent text-transparent'
                                            }
                                        `}
                                    >
                                        {isTarget ? state.parity_bit : ''}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {state.count !== undefined && (
                <div className="flex items-center gap-4 text-sm bg-slate-800/80 px-4 py-2 rounded-full border border-slate-700">
                    <span className="text-slate-400">Column {state.highlight_col}</span>
                    <span className="text-slate-600">|</span>
                    <span className="text-slate-300">1s Count: <span className="text-white font-mono font-bold">{state.count}</span></span>
                    <span className="text-slate-600">|</span>
                    <span className={`${state.count % 2 !== 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {state.count % 2 !== 0 ? 'Odd (1)' : 'Even (0)'}
                    </span>
                </div>
            )}
        </div>
    );
};

export const CRCLevel = ({ step }) => {
    const { state } = step;
    if (!state) return null;

    // state: dividend, divisor, current_chunk, xor_result, remainder, action, next_bit, new_chunk

    const isXor = state.action === 'xor' || state.action === 'final_xor';

    return (
        <div className="flex flex-col items-center gap-6 w-full font-mono">
            {state.divisor && (
                <div className="w-full max-w-md bg-slate-900/50 p-6 rounded-xl border border-slate-700 flex flex-col gap-4">

                    {/* Operation Display */}
                    <div className="flex flex-col gap-2 items-center text-lg">

                        {/* Dividend / Current Chunk */}
                        <div className="relative">
                            <div className="tracking-[0.2em] text-white">{state.current_chunk}</div>
                            <div className="text-[10px] absolute -right-8 top-1 text-slate-500">Current</div>
                        </div>

                        {/* Divisor (only if XORing) */}
                        {isXor && (
                            <>
                                <div className="text-slate-600 my-[-5px]">XOR</div>
                                <div className="tracking-[0.2em] text-cyan-400 border-b border-slate-600 pb-2 mb-2 w-full text-center">
                                    {state.divisor}
                                </div>
                            </>
                        )}

                        {/* Result */}
                        {state.xor_result && (
                            <div className="tracking-[0.2em] text-emerald-400 animate-in slide-in-from-top-2 fade-in">
                                {state.xor_result}
                            </div>
                        )}

                        {/* Remainder (for final) */}
                        {state.remainder && !state.xor_result && (
                            <div className="tracking-[0.2em] text-amber-400 p-2 border-2 border-amber-500/30 rounded bg-amber-500/10">
                                Remainder: {state.remainder}
                            </div>
                        )}

                    </div>

                    {/* Meta info */}
                    <div className="flex justify-between text-xs text-slate-500 mt-4 border-t border-slate-800 pt-4">
                        <span>Action: <span className="text-slate-300 uppercase">{state.action}</span></span>
                        {state.next_bit && <span>Pull Down: <span className="text-white">{state.next_bit}</span></span>}
                    </div>
                </div>
            )}
        </div>
    );
};

export const ChecksumLevel = ({ step }) => {
    const { state } = step;
    if (!state) return null;

    // state: custom keys... operand1, operand2, result, carry, action, blocks, current_sum, sum, checksum

    if (state.action === 'init' || state.blocks) {
        return (
            <div className="flex flex-wrap gap-2 justify-center max-w-xl">
                {state.blocks && state.blocks.map((b, i) => (
                    <div key={i} className="px-3 py-1 bg-slate-800 rounded border border-slate-700 font-mono text-sm text-slate-300">
                        {b}
                    </div>
                ))}
            </div>
        );
    }

    if (state.action === 'add' || state.action === 'wrap') {
        return (
            <div className="flex flex-col items-center gap-2 font-mono text-xl">
                <div className="text-slate-400">{state.operand1}</div>
                <div className="flex items-center gap-2 w-full justify-center border-b border-slate-600 pb-2 mb-2">
                    <span className="text-slate-600">+</span>
                    <span className={state.action === 'wrap' ? 'text-amber-400' : 'text-slate-400'}>
                        {state.action === 'wrap' ? '1 (Carry)' : state.operand2}
                    </span>
                </div>
                <div className="text-emerald-400 font-bold">{state.result}</div>

                {state.carry == 1 && (
                    <div className="mt-2 text-xs text-amber-500 px-2 py-1 bg-amber-500/10 rounded border border-amber-500/30">
                        Carry Out Generated
                    </div>
                )}
            </div>
        );
    }

    if (state.action === 'complement') {
        return (
            <div className="flex flex-col items-center gap-4">
                <div className="p-4 bg-slate-800 rounded-xl flex flex-col items-center gap-2">
                    <span className="text-xs text-slate-500">Sum</span>
                    <span className="font-mono text-xl text-slate-300">{state.sum}</span>
                </div>
                <div className="text-slate-500">↓ 1s Complement ↓</div>
                <div className="p-4 bg-indigo-900/40 border border-indigo-500/50 rounded-xl flex flex-col items-center gap-2 shadow-[0_0_20px_rgba(99,102,241,0.2)]">
                    <span className="text-xs text-indigo-300 uppercase tracking-widest">Checksum</span>
                    <span className="font-mono text-2xl text-white font-bold tracking-widest">{state.checksum}</span>
                </div>
            </div>
        );
    }

    return null;
};
