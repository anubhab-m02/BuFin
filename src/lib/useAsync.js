import { useCallback, useState } from 'react';

// Generalizes the loading/error/data pattern already used ad hoc across the app
// (e.g. NaturalLanguageInput, CoachPage) into one reusable hook, so new async
// call sites don't have to hand-roll isLoading/error state again.
export function useAsync() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [data, setData] = useState(null);

    const execute = useCallback(async (asyncFn) => {
        setLoading(true);
        setError(null);
        try {
            const result = await asyncFn();
            setData(result);
            return result;
        } catch (err) {
            setError(err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    return { execute, loading, error, data, setError };
}
