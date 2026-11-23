import React, { lazy, Suspense, useState } from 'react';
import Header from './components/Header';

const PracticeMode = lazy(() => import('./components/PracticeMode'));
const HiringMode = lazy(() => import('./components/HiringMode'));
const RecruiterDashboard = lazy(() => import('./components/RecruiterDashboard'));
const CallReplay = lazy(() => import('./components/CallReplay'));

export default function App() {
  const [activeTab, setActiveTab] = useState('practice');

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main style={{ flex: 1 }}>
        <Suspense fallback={<div className="app-loading" role="status">Loading…</div>}>
          {activeTab === 'practice' && <PracticeMode />}
          {activeTab === 'hiring' && <HiringMode />}
          {activeTab === 'recruiter' && <RecruiterDashboard />}
          {activeTab === 'replay' && <CallReplay />}
        </Suspense>
      </main>
    </div>
  );
}
