import { Routes, Route, Navigate } from 'react-router-dom';
import Home      from './components/Home/Home.jsx';
import App       from './App.jsx';
import MCBModule from './modules/mcb/MCBModule.jsx';

export default function Root() {
  return (
    <Routes>
      <Route path="/"       element={<Home />} />
      <Route path="/manual" element={<App />} />
      <Route path="/mcb"    element={<MCBModule />} />
      <Route path="*"       element={<Navigate to="/" replace />} />
    </Routes>
  );
}
