import React, { useState, useEffect } from 'react';
import { DistributedVotingService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { VotingResults, VotingStatistics } from '../../types';
import './VotingResultsPanel.css';

interface VotingResultsPanelProps {
  eventId: string;
}

const VotingResultsPanel: React.FC<VotingResultsPanelProps> = ({ eventId }) => {
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState<boolean>(true);
  const [results, setResults] = useState<VotingResults | null>(null);
  const [statistics, setStatistics] = useState<VotingStatistics | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const fetchResults = async (): Promise<{ resultsData: VotingResults; statsData: VotingStatistics }> => {
    const [resultsData, statsData] = await Promise.all([
      DistributedVotingService.getDistributedResults(eventId),
      DistributedVotingService.getVotingStatistics(eventId),
    ]);
    return { resultsData, statsData };
  };

  const loadResults = async (): Promise<void> => {
    setLoading(true);
    setError('');
    try {
      const { resultsData, statsData } = await fetchResults();
      setResults(resultsData);
      setStatistics(statsData);
    } catch (err: any) {
      // Events that entered the results stage before results were stored ask
      // an authenticated user to calculate them once, then retry. If there is
      // still nothing to show (nobody voted, or a visitor has no session) the
      // panel falls back to its empty state instead of an error.
      if (String(err?.message || '').includes('RESULTS_NOT_CALCULATED')) {
        // Recalculating requires a session: a visitor would get a 401, so it
        // goes straight to the empty state.
        if (!isAuthenticated) {
          setResults(null);
          return;
        }
        try {
          await DistributedVotingService.recalculateDistributedResults(eventId);
          const { resultsData, statsData } = await fetchResults();
          setResults(resultsData);
          setStatistics(statsData);
          return;
        } catch (retryErr: any) {
          if (String(retryErr?.message || '').includes('RESULTS_NOT_CALCULATED')) {
            setResults(null);
            return;
          }
          setError(`Failed to load voting results: ${retryErr?.message || 'Unknown error'}`);
          return;
        }
      }
      setError(`Failed to load voting results: ${err?.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="voting-results-panel">
      <div className="vrp-state">Loading results…</div>
    </div>
  );

  if (error) return (
    <div className="voting-results-panel">
      <div className="vrp-error">{error}</div>
    </div>
  );

  if (!results) return (
    <div className="voting-results-panel">
      <div className="vrp-state">No results available yet.</div>
    </div>
  );

  // Quality-adjusted ranking as the single unified result
  const ranking = results.adjusted_ranking?.length
    ? results.adjusted_ranking
    : results.global_ranking;

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="voting-results-panel">
      <h2>🏆 Final Results</h2>

      {statistics && (
        <div className="vrp-stats">
          <div className="vrp-stat">
            <span className="vrp-stat-value">{(statistics.completion_rate * 100).toFixed(0)}%</span>
            <span className="vrp-stat-label">Participation</span>
          </div>
          <div className="vrp-stat">
            <span className="vrp-stat-value">{statistics.total_votes}</span>
            <span className="vrp-stat-label">Rankings submitted</span>
          </div>
        </div>
      )}

      <div className="vrp-quality-note">
        <span className="vrp-quality-icon">⚖️</span>
        <p>
          The ranking takes <strong>reviewer quality</strong> into account. Participants who
          ranked consistently with the rest of the group carry more weight in the final result.
          This makes the outcome fairer when some reviewers may have ranked carelessly or inconsistently.
        </p>
      </div>

      <div className="vrp-table-wrap">
        <table className="vrp-table">
          <thead>
            <tr>
              <th className="vrp-th-rank">Rank</th>
              <th className="vrp-th-file">File / Author</th>
              <th className="vrp-th-score">Score</th>
            </tr>
          </thead>
          <tbody>
            {ranking.map((result, index) => (
              <tr
                key={result.attachment_id}
                className={index < 3 ? `vrp-top vrp-top-${index + 1}` : ''}
              >
                <td className="vrp-rank">
                  {index < 3 ? medals[index] : index + 1}
                </td>
                <td className="vrp-file">
                  <span className="vrp-filename">{result.filename}</span>
                  {result.participant_name && (
                    <span className="vrp-author">by {result.participant_name}</span>
                  )}
                </td>
                <td className="vrp-score">{result.mbc_score.toFixed(3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
};

export default VotingResultsPanel;
