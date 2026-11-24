import { useCallback, useState } from 'react';
export function useNativePulseProcessor() {
    const [status, setStatus] = useState('idle');
    const [result, setResult] = useState(null);
    const onFrame = useCallback((_frame) => {
        setStatus('tracking');
    }, []);
    const onSignalSample = useCallback((_sample) => {
        setStatus('sampling');
    }, []);
    const onResult = useCallback((nextResult) => {
        setResult(nextResult);
        setStatus(nextResult ? 'complete' : 'no_reliable_reading');
    }, []);
    return { status, result, onFrame, onSignalSample, onResult };
}
