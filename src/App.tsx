import { Routes, Route } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import ProfilePage from './components/ProfilePage';
import FollowingPage from './components/FollowingPage';
import FollowersPage from './components/FollowersPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/following" element={<FollowingPage />} />
      <Route path="/followers" element={<FollowersPage />} />
      <Route path="/:handle" element={<ProfilePage />} />
    </Routes>
  );
}
