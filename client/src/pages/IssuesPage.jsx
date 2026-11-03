import IssueList from '../components/IssueList.jsx';

export default function IssuesPage() {
  return (
    <>
      <div className="page-header">
        <div>
          <h1>Issues</h1>
          <p className="muted">Plan, prioritise, and move work forward across every project.</p>
        </div>
      </div>
      <IssueList />
    </>
  );
}
