import { type FC, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Brain, Clock3, MapPinned, ShieldAlert } from 'lucide-react';
import { predictionsApi } from '../lib/api';
import { notifyConnectionStatus } from '../lib/notifications';
import type { Prediction } from '../types';

const PredictionsPage: FC = () => {
  const previousAiStatus = useRef<'connected' | 'disconnected' | null>(null);
  const { data: predictions = [], isLoading, isError } = useQuery<Prediction[]>({
    queryKey: ['predictions-page'],
    queryFn: () => predictionsApi.list(0.4).then((r) => r.data),
  });

  useEffect(() => {
    if (isError) {
      if (previousAiStatus.current !== 'disconnected') {
        notifyConnectionStatus({
          service: 'AI',
          status: 'disconnected',
          message: 'AI prediction service is currently unavailable. Retry when the connection is restored.',
        });
        previousAiStatus.current = 'disconnected';
      }
      return;
    }

    if (!isLoading && predictions.length >= 0 && previousAiStatus.current === 'disconnected') {
      notifyConnectionStatus({
        service: 'AI',
        status: 'reconnected',
        message: 'AI prediction service restored. Forecasts are available again.',
      });
      previousAiStatus.current = 'connected';
    }

    if (!isLoading && previousAiStatus.current === null) {
      previousAiStatus.current = 'connected';
    }
  }, [isError, isLoading, predictions.length]);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-600">AI engine</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">AI Predictions</h1>
        </div>
        <div className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-sm font-medium text-violet-700">
          Estimates only
        </div>
      </div>

      {isLoading ? (
        <div className="card flex min-h-[240px] items-center justify-center">
          <div className="spinner" />
        </div>
      ) : isError ? (
        <div className="card border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          AI prediction service is currently unavailable. Please try again in a moment.
        </div>
      ) : predictions.length === 0 ? (
        <div className="card p-12 text-center">
          <Brain className="mx-auto h-10 w-10 text-slate-300" />
          <h3 className="mt-4 text-lg font-semibold text-slate-900">No reliable predictions yet</h3>
          <p className="mt-2 text-sm text-slate-500">The backend needs more recent sightings before the AI can estimate probable movement routes.</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {predictions.map((prediction) => (
            <article key={`${prediction.animal_id}-${prediction.generated_at}`} className="card p-5">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-500">Animal</p>
                  <h3 className="mt-2 text-xl font-bold text-slate-900">{prediction.animal_id}</h3>
                </div>
                <span className="badge-purple">{prediction.confidence_label}</span>
              </div>

              <div className="space-y-3 text-sm text-slate-600">
                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                  <span className="inline-flex items-center gap-2"><MapPinned className="h-4 w-4 text-violet-500" /> Zone</span>
                  <span className="font-semibold text-slate-900">{prediction.predicted_zone}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                  <span className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4 text-violet-500" /> Window</span>
                  <span className="font-semibold text-slate-900">{prediction.time_start}–{prediction.time_end}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                  <span className="inline-flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-violet-500" /> Confidence</span>
                  <span className="font-semibold text-slate-900">{prediction.confidence_percent}%</span>
                </div>
              </div>

              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                  <span>Confidence</span>
                  <span>{prediction.confidence_percent}%</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-blue-500"
                    style={{ width: `${Math.min(prediction.confidence_percent, 100)}%` }}
                  />
                </div>
              </div>

              <div className="mt-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Factors</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {prediction.factors.slice(0, 3).map((factor) => (
                    <span key={factor} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
                      {factor}
                    </span>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default PredictionsPage;
