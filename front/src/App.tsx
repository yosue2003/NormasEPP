import { useState } from 'react'
import { Header } from './components/Header'
import { Dashboard } from './components/Dashboard'
import { ConfigModal } from './components/ConfigModal'
import { CameraProvider } from './contexts/camera'

export function App() {
  const [isConfigOpen, setIsConfigOpen] = useState(false)
  return (
    <CameraProvider>
      <div className="min-h-screen w-full bg-slate-100">
        <Header />

        <main className="container mx-auto px-4 py-6 max-w-7xl">
          <Dashboard onOpenConfig={() => setIsConfigOpen(true)} />
        </main>

        <ConfigModal
          isOpen={isConfigOpen}
          onClose={() => setIsConfigOpen(false)}
        />
      </div>
    </CameraProvider>
  )
}
