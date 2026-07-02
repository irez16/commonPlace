import { Routes, Route } from 'react-router-dom';
import QuickNav from './components/QuickNav';
import Dashboard from './components/Dashboard';
import ProfilePage from './components/ProfilePage';
import FollowingPage from './components/FollowingPage';
import FollowersPage from './components/FollowersPage';
import FeedPage from './components/FeedPage';

export default function App() {
  return (
    <>
      <QuickNav />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/feed" element={<FeedPage />} />
        <Route path="/following" element={<FollowingPage />} />
        <Route path="/followers" element={<FollowersPage />} />
        <Route path="/:handle" element={<ProfilePage />} />
      </Routes>
    </>
  );
}
