import { apiMonitorService } from './apiMonitorService';
import { calculateCost } from '../utils/pricing';
import { auditLogService } from './auditLogService';
import { ApiCallLog } from '../types';

const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;
const MAX_CONCURRENT_REQUESTS = 1;
const GOVERNOR_INTERVAL_MS = 250; // Check the queue every 250ms

const MODEL_FALLBACK_HIERARCHY: Record<string, string | null> = {
  'gemini-2.5-pro': 'gemini-2.5-flash',
  'gemini-2.5-flash': 'gemini-flash-latest',
  'gemini-flash-latest': null,
  'gemini-2.5-flash-image': null, // No fallback for image models
};

type ApiCallFunction<T> = (payload: any) => Promise<T>;

interface EnqueueOptions {
    agentName: string;
    model: string;
    requestPayload: any;
}

const requestQueue: {
    apiCallFn: ApiCallFunction<any>;
    initialPayload: any;
    resolve: (value: any) => void;
    reject: (reason?: any) => void;
    options: EnqueueOptions;
}[] = [];

let activeRequests = 0;
let governorInterval: number | null = null;

const processRequest = async (
    apiCallFn: ApiCallFunction<any>,
    initialPayload: any,
    resolve: (value: any) => void,
    reject: (reason?: any) => void,
    options: EnqueueOptions
) => {
    let currentPayload = { ...initialPayload };
    
    activeRequests++;
    const logId = apiMonitorService.addLog({
        agentName: options.agentName,
        model: options.model,
        requestPayload: options.requestPayload,
    });

    try {
        apiMonitorService.updateLog(logId, { status: 'Processing' });
        
        const auditLogData: Omit<ApiCallLog, 'id'> = {
            startTime: Date.now(),
            status: 'Processing',
            ...options,
        };
        auditLogService.logEvent('API_CALL', { ...auditLogData, id: logId });

        let attempts = 0;
        while (attempts < MAX_RETRIES) {
            try {
                const result = await apiCallFn(currentPayload);
                
                const endTime = Date.now();
                const duration = endTime - auditLogData.startTime;

                const usage = (result as any).usageMetadata;
                let usageData: Partial<ApiCallLog> = {};
                if (usage) {
                    const promptTokens = usage.promptTokenCount;
                    const candidateTokens = usage.candidatesTokenCount;
                    const totalTokens = usage.totalTokenCount;

                    if (typeof promptTokens === 'number' && typeof candidateTokens === 'number') {
                        const estimatedCost = calculateCost(options.model, promptTokens, candidateTokens);
                        usageData = { 
                            promptTokens, 
                            candidateTokens, 
                            totalTokens: typeof totalTokens === 'number' ? totalTokens : promptTokens + candidateTokens, 
                            estimatedCost 
                        };
                    }
                }
                
                const successLog: ApiCallLog = { ...auditLogData, id: logId, status: 'Success', responsePayload: result, endTime, duration, ...usageData };
                apiMonitorService.updateLog(logId, successLog);
                auditLogService.logEvent('API_CALL', successLog);

                resolve(result);
                return;
            } catch (error: any) {
                 let parsedMessage;
                 try {
                     parsedMessage = JSON.parse(error.message);
                 } catch (e) { /* not a JSON message */ }

                 const status = error.status || parsedMessage?.error?.status;
                 const isQuotaError = status === 'RESOURCE_EXHAUSTED';

                 // Handle quota error by falling back to another model
                 if (isQuotaError) {
                     const currentModel = currentPayload.model;
                     const fallbackModel = MODEL_FALLBACK_HIERARCHY[currentModel as keyof typeof MODEL_FALLBACK_HIERARCHY];
                     
                     if (fallbackModel) {
                         console.warn(`Quota exceeded for model ${currentModel}. Falling back to ${fallbackModel}.`);
                         const newErrorMsg = `Quota exceeded. Falling back to ${fallbackModel}.`;
                         apiMonitorService.updateLog(logId, { status: 'Retrying', error: newErrorMsg });
                         auditLogService.logEvent('API_CALL', { ...auditLogData, id: logId, status: 'Retrying', error: newErrorMsg });

                         currentPayload = { ...currentPayload, model: fallbackModel };
                         options.model = fallbackModel; // Update options for logging consistency
                         // Reset attempts for the new model and continue the loop
                         attempts = 0;
                         continue;
                     }
                 }

                // If not a quota error, or no fallback is available, proceed with normal retry logic
                attempts++;
                const isRetryable = (error?.code >= 500 && error?.code < 600);
                
                let detailedError = new Error(error.message || 'An unexpected API error occurred.');
                
                if (isRetryable && attempts < MAX_RETRIES) {
                    const backoffTime = INITIAL_BACKOFF_MS * Math.pow(2, attempts - 1);
                    console.warn(`API call failed. Retrying in ${backoffTime}ms... (Attempt ${attempts}/${MAX_RETRIES})`);
                    
                    const retryLog: Partial<ApiCallLog> = { status: 'Retrying', error: detailedError.message };
                    apiMonitorService.updateLog(logId, retryLog);
                    auditLogService.logEvent('API_CALL', { ...auditLogData, id: logId, ...retryLog });

                    await new Promise(res => setTimeout(res, backoffTime));
                } else {
                    console.error(`API call failed after ${attempts} attempts.`, error);
                    
                    const endTime = Date.now();
                    const duration = endTime - auditLogData.startTime;
                    const failureLog: ApiCallLog = { ...auditLogData, id: logId, status: 'Failed', error: detailedError.message, responsePayload: error, endTime, duration };
                    apiMonitorService.updateLog(logId, failureLog);
                    auditLogService.logEvent('API_CALL', failureLog);

                    reject(detailedError);
                    return;
                }
            }
        }
    } finally {
        activeRequests--;
    }
};

const startGovernor = () => {
    if (governorInterval !== null) return; // Governor already running

    governorInterval = window.setInterval(() => {
        // If there are requests to process and we have available slots
        if (requestQueue.length > 0 && activeRequests < MAX_CONCURRENT_REQUESTS) {
            const { apiCallFn, initialPayload, resolve, reject, options } = requestQueue.shift()!;
            processRequest(apiCallFn, initialPayload, resolve, reject, options);
        }
        
        // If the queue is empty and no requests are active, we can stop the governor
        // to save resources. It will be restarted when a new request is enqueued.
        if (requestQueue.length === 0 && activeRequests === 0 && governorInterval) {
            clearInterval(governorInterval);
            governorInterval = null;
        }
    }, GOVERNOR_INTERVAL_MS);
};


export const enqueueGeminiRequest = <T>(
    apiCallFn: ApiCallFunction<T>,
    initialPayload: any,
    options: EnqueueOptions,
): Promise<T> => {
    return new Promise<T>((resolve, reject) => {
        requestQueue.push({ apiCallFn, initialPayload, resolve, reject, options });
        // Ensure the governor is running whenever a request is added.
        startGovernor();
    });
};