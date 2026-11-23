import { useCallback, useState } from 'react';
import type { FutureHeartRateResult, NativeScanStatus, NumericSignalSample } from '@/types/nativePulse';

export function useNativePulseProcessor() {
  const [status, setStatus] = useState<NativeScanStatus>('idle');
  const [result, setResult] = useState<FutureHeartRateResult | null>(null);

  const onFrame = useCallback((_frame: unknown) => {
    setStatus('tracking');
  }, []);

  const onSignalSample = useCallback((_sample: NumericSignalSample) => {
    setStatus('sampling');
  }, []);

  const onResult = useCallback((nextResult: FutureHeartRateResult | null) => {
    setResult(nextResult);
    setStatus(nextResult ? 'complete' : 'no_reliable_reading');
  }, []);

  return { status, result, onFrame, onSignalSample, onResult };
}
