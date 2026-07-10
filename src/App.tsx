import { Routes, Route } from 'react-router-dom';
import QuickNav from './components/QuickNav';
import Dashboard from './components/Dashboard';
import ProfilePage from './components/ProfilePage';
import LedgerEntryDetailPage from './components/LedgerEntryDetailPage';
import FollowingPage from './components/FollowingPage';
import FollowersPage from './components/FollowersPage';
import FeedPage from './components/FeedPage';
import JournalPage from './components/JournalPage';
import NotificationsPage from './components/NotificationsPage';

export default function App() {
  return (
    <>
      <QuickNav />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/feed" element={<FeedPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/following" element={<FollowingPage />} />
        <Route path="/followers" element={<FollowersPage />} />
        <Route path="/:handle/journal" element={<JournalPage />} />
        <Route path="/:handle/ledger/:entryId" element={<LedgerEntryDetailPage />} />
        <Route path="/:handle" element={<ProfilePage />} />
      </Routes>
    </>
  );
}
