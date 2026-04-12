import { useState } from 'react';
import Home from './components/Home/Home.jsx';
import App from './App.jsx';

export default function Root() {
  const [activeModule, setActiveModule] = useState(null);

  if (activeModule === 'manual') {
    return <App onHome={() => setActiveModule(null)} />;
  }

  return <Home onSelectModule={setActiveModule} />;
}
