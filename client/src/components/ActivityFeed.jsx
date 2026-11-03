import { timeAgo } from '../utils/format.js';
import { EmptyState } from './ui.jsx';

export default function ActivityFeed({ activities }) {
  if (!activities.length) {
    return <EmptyState title="No activity yet">Create or update an issue and it will show up here.</EmptyState>;
  }

  return (
    <ul className="activity">
      {activities.map((activity) => (
        <li key={activity._id}>
          <span className={`activity-dot activity-${activity.type}`} aria-hidden="true" />
          <div>
            <p>{activity.action}</p>
            <time dateTime={activity.createdAt} title={new Date(activity.createdAt).toLocaleString()}>
              {timeAgo(activity.createdAt)}
            </time>
          </div>
        </li>
      ))}
    </ul>
  );
}
