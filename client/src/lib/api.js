export const API_DEPLOYMENT_MESSAGE = 'This deployed frontend needs a separate API server. Set REACT_APP_API_BASE_URL to your backend URL.';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);

export function getApiBaseUrl() {
    return (process.env.REACT_APP_API_BASE_URL || '').replace(/\/$/, '');
}

export function isHostedRuntime() {
    if (typeof window === 'undefined') {
        return false;
    }

    return !LOCAL_HOSTS.has(window.location.hostname);
}

export function getApiErrorMessage(error, fallbackMessage) {
    if (error?.userMessage) {
        return error.userMessage;
    }

    const requestUrl = `${error?.config?.url || ''}`;
    const isApiRequest = requestUrl.startsWith('/api') || requestUrl.includes('/api/');

    if (isApiRequest && isHostedRuntime() && !getApiBaseUrl()) {
        return API_DEPLOYMENT_MESSAGE;
    }

    return error?.response?.data?.error || fallbackMessage;
}
