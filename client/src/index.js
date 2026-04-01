import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import './styles/index.css';
import App from './App';
import { API_DEPLOYMENT_MESSAGE, getApiBaseUrl, isHostedRuntime } from './lib/api';

const apiBaseUrl = getApiBaseUrl();

if (apiBaseUrl) {
    axios.defaults.baseURL = apiBaseUrl;
}

axios.interceptors.response.use(
    (response) => {
        const requestUrl = `${response.config?.url || ''}`;
        const contentType = `${response.headers?.['content-type'] || ''}`.toLowerCase();
        const isApiRequest = requestUrl.startsWith('/api') || requestUrl.includes('/api/');

        if (isApiRequest && contentType.includes('text/html')) {
            const apiError = new Error(API_DEPLOYMENT_MESSAGE);
            apiError.code = 'API_HTML_RESPONSE';
            apiError.userMessage = isHostedRuntime() && !apiBaseUrl
                ? API_DEPLOYMENT_MESSAGE
                : 'API returned HTML instead of JSON.';
            apiError.config = response.config;
            apiError.response = response;
            throw apiError;
        }

        return response;
    },
    (error) => Promise.reject(error)
);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
