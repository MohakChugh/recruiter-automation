import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { Dashboard } from './pages/Dashboard'
import { CreateJob } from './pages/CreateJob'
import { JobDetail } from './pages/JobDetail'
import { Upload } from './pages/Upload'
import { Ranking } from './pages/Ranking'
import { CandidateDetail } from './pages/CandidateDetail'
import { Chat } from './pages/Chat'
import { Settings } from './pages/Settings'

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/jobs/new" element={<CreateJob />} />
        <Route path="/jobs/:jobId" element={<JobDetail />} />
        <Route path="/jobs/:jobId/upload" element={<Upload />} />
        <Route path="/jobs/:jobId/ranking" element={<Ranking />} />
        <Route path="/jobs/:jobId/candidates/:candidateId" element={<CandidateDetail />} />
        <Route path="/jobs/:jobId/chat" element={<Chat />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}

export default App
