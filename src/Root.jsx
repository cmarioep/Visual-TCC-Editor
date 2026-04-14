import { Routes, Route, Navigate } from 'react-router-dom';
import Home         from './components/Home/Home.jsx';
import ManualModule from './modules/manual/ManualModule.jsx';
import MCBModule    from './modules/mcb/MCBModule.jsx';

export default function Root() {
  return (
    <Routes>
      <Route path="/"       element={<Home />} />
      <Route path="/manual" element={<ManualModule />} />
      <Route path="/mcb"    element={<MCBModule />} />
      <Route path="*"       element={<Navigate to="/" replace />} />
    </Routes>
  );
}
