import { Routes, Route } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import ProfilePage from './components/ProfilePage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/:handle" element={<ProfilePage />} />
    </Routes>
  );
}
