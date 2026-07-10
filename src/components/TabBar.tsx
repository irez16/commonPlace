import { NavLink } from 'react-router-dom';
import { useProfileStatus } from '../hooks/useProfileStatus';
import './TabBar.css';

interface TabBarItem {
  to: string;
  label: string;
  iconOutline: string;
  iconSolid: string;
  // Exact-match only — otherwise the Ledger tab (/@username) would also
  // show active on the Journal and entry-detail routes, since those are
  // nested under the same path.
  end?: boolean;
}

// Bottom tab bar: Feed / Journal / Ledger. Only rendered once we know the
// signed-in user's username (same gate QuickNav uses) — there's nothing
// to navigate to yet if they haven't finished onboarding.
export default function TabBar() {
  const { username } = useProfileStatus();

  if (!username) return null;

  const items: TabBarItem[] = [
    { to: '/feed', label: 'Feed', iconOutline: 'tab-feed-outline', iconSolid: 'tab-feed-solid' },
    {
      to: `/@${username}/journal`,
      label: 'Journal',
      iconOutline: 'tab-journal-outline',
      iconSolid: 'tab-journal-solid',
    },
    {
      to: `/@${username}`,
      label: 'Ledger',
      iconOutline: 'tab-ledger-outline',
      iconSolid: 'tab-ledger-solid',
      end: true,
    },
  ];

  return (
    <nav className="tab-bar">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) => `tab-bar-item${isActive ? ' is-active' : ''}`}
        >
          {({ isActive }) => (
            <>
              <svg width="22" height="22">
                <use href={`/icons.svg#${isActive ? item.iconSolid : item.iconOutline}`} />
              </svg>
              <span className="tab-bar-item-label">{item.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
