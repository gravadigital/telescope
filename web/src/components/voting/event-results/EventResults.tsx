import React from 'react';
import { Callout } from '../../ui';
import Podium from '../podium/Podium';
import RankingList from '../ranking-list/RankingList';
import { getErrorCode } from '../../../config/api';
import { splitResults } from '../../../domain/eventDetail';
import { useT } from '../../../i18n';
import { DistributedVotingService } from '../../../services/api';
import type { VotingResults } from '../../../types';
import './EventResults.css';

export interface EventResultsProps {
  eventId: string;
  currentUserId: string | null;
  onLoaded?: (results: VotingResults) => void;
}

type State =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'empty' }
  | { status: 'ready'; results: VotingResults };

/**
 * Resultados públicos: podio + ranking desde la 4.ª + nota del puntaje.
 * Solo lee: nunca recalcula (el cálculo ocurre al pasar a Resultados).
 */
const EventResults: React.FC<EventResultsProps> = ({ eventId, currentUserId, onLoaded }) => {
  const { t } = useT();
  const [state, setState] = React.useState<State>({ status: 'loading' });
  const [attempt, setAttempt] = React.useState(0);
  const onLoadedRef = React.useRef(onLoaded);
  onLoadedRef.current = onLoaded;

  React.useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    DistributedVotingService.getDistributedResults(eventId)
      .then((results) => {
        if (cancelled) return;
        if (!results.adjusted_ranking || results.adjusted_ranking.length === 0) {
          setState({ status: 'empty' });
          return;
        }
        setState({ status: 'ready', results });
        onLoadedRef.current?.(results);
      })
      .catch((err) => {
        if (cancelled) return;
        setState({ status: getErrorCode(err) === 'RESULTS_NOT_CALCULATED' ? 'empty' : 'error' });
      });
    return () => {
      cancelled = true;
    };
  }, [eventId, attempt]);

  if (state.status === 'loading') {
    return (
      <p role="status" className="vt-event-results__message">
        {t('results.loading')}
      </p>
    );
  }

  if (state.status === 'error') {
    return (
      <Callout tone="error" action={{ label: t('common.retry'), onClick: () => setAttempt((n) => n + 1) }}>
        {t('results.error')}
      </Callout>
    );
  }

  if (state.status === 'empty') {
    return <p className="vt-event-results__message">{t('errors.RESULTS_NOT_CALCULATED')}</p>;
  }

  const { podium, rest } = splitResults(state.results.adjusted_ranking);
  return (
    <div className="vt-event-results">
      <Podium entries={podium} currentUserId={currentUserId} />
      {rest.length > 0 && <RankingList entries={rest} currentUserId={currentUserId} />}
      <p className="vt-event-results__note">{t('results.note')}</p>
    </div>
  );
};

export default EventResults;
