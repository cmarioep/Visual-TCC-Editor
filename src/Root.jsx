import { useState } from 'react';
import Home from './components/Home/Home.jsx';
import App from './App.jsx';
import MCBModule from './modules/mcb/MCBModule.jsx';

export default function Root() {
  const [activeModule, setActiveModule] = useState(null);

  if (activeModule === 'manual') {
    return <App onHome={() => setActiveModule(null)} />;
  }

  if (activeModule === 'mcb') {
    return <MCBModule onHome={() => setActiveModule(null)} />;
  }

  return <Home onSelectModule={setActiveModule} />;
}
