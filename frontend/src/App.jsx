import ErrorVisualizer from './components/ErrorVisualizer'

function App() {
  return (
    <div className="min-h-screen text-slate-200 selection:bg-indigo-500 selection:text-white">
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        <header className="mb-12 text-center space-y-4">
          <div className="inline-block px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm font-medium mb-2">
            Computer Networks Lab
          </div>
          <h1 className="text-5xl md:text-6xl font-black tracking-tight text-white mb-2">
            Error Detection
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400"> Platform</span>
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Interactive visualization of error detection algorithms including VRC, LRC, CRC, and Checksum.
            Analyze bit-level operations and transmission simulation.
          </p>
        </header>

        <main>
          <ErrorVisualizer />
        </main>

        <footer className="mt-20 text-center text-slate-600 text-sm">
          <p>© 2026 CN Visualization Lab. Built with Django & React.</p>
        </footer>
      </div>
    </div>
  )
}

export default App
