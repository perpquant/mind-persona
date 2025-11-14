
import { AuditLogEntry, AuditEventType, AuditLogPayload } from '../types';

type Subscriber = (logs: AuditLogEntry[]) => void;

const AUDIT_LOG_STORAGE_KEY = 'personaAuditLog';
const LOG_LIMIT = 500; // Limit the number of logs to prevent storage overflow

// Debounce function
const debounce = <F extends (...args: any[]) => any>(func: F, waitFor: number) => {
  let timeout: number | null = null;

  const debounced = (...args: Parameters<F>) => {
    if (timeout !== null) {
      clearTimeout(timeout);
      timeout = null;
    }
    timeout = window.setTimeout(() => func(...args), waitFor);
  };

  return debounced as (...args: Parameters<F>) => void;
};


class AuditLogService {
    private logs: AuditLogEntry[] = [];
    private subscribers: Subscriber[] = [];
    private downloadThresholdBytes: number = 52428800; // Default to 50MB
    private chunkCounter: number = 0;

    constructor() {
        this.loadFromStorage();
    }

    private loadFromStorage() {
        try {
            const savedLogs = localStorage.getItem(AUDIT_LOG_STORAGE_KEY);
            if (savedLogs) {
                const parsedLogs: AuditLogEntry[] = JSON.parse(savedLogs);
                 if (Array.isArray(parsedLogs)) {
                    this.logs = parsedLogs;
                }
            }
        } catch (error) {
            console.error("Failed to load audit log from local storage:", error);
            this.logs = [];
        }
    }
    
    // Use debounce to avoid writing to localStorage on every single log event.
    private saveToStorage = debounce(() => {
        try {
            localStorage.setItem(AUDIT_LOG_STORAGE_KEY, JSON.stringify(this.logs));
        } catch (error) {
            console.error("Failed to save audit log to local storage:", error);
        }
    }, 1000); // Save at most once per second
    
    private triggerAutoDownload() {
        this.chunkCounter++;
        console.log(`Audit log size exceeds ${this.downloadThresholdBytes} bytes. Triggering auto-download for chunk #${this.chunkCounter}.`);
        const logsToDownload = [...this.logs];
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(logsToDownload, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `persona_audit_log_chunk_${this.chunkCounter}_${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();

        // Clear the log after downloading to start a new chunk
        const downloadedCount = this.logs.length;
        this.clear(false); // Clear without resetting chunk counter
        this.logEvent('SYSTEM_EVENT', { event: 'AUDIT_LOG_AUTOSAVED_AND_CLEARED', details: { downloadedEntries: downloadedCount, chunkNumber: this.chunkCounter } });
    }

    public setDownloadThreshold(kb: number): void {
        this.downloadThresholdBytes = kb * 1024;
    }

    public logEvent(type: AuditEventType, payloadData: AuditLogPayload['data']): void {
        const newLogEntry: AuditLogEntry = {
            id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            timestamp: new Date().toISOString(),
            type,
            payload: payloadData,
        };

        this.logs.unshift(newLogEntry);

        // Trim old logs if the limit is exceeded
        if (this.logs.length > LOG_LIMIT) {
            this.logs.pop();
        }
        
        this.notifySubscribers();
        this.saveToStorage();

        // Check for auto-download, if enabled (threshold > 0)
        if (this.downloadThresholdBytes > 0 && JSON.stringify(this.logs).length > this.downloadThresholdBytes) {
            this.triggerAutoDownload();
        }
    }

    public getLogs(): AuditLogEntry[] {
        return [...this.logs];
    }

    public clear(resetChunkCounter = true): void {
        this.logs = [];
        if (resetChunkCounter) {
            this.chunkCounter = 0;
        }
        this.notifySubscribers();
        // Clear storage immediately
        try {
            localStorage.removeItem(AUDIT_LOG_STORAGE_KEY);
        } catch (error) {
            console.error("Failed to clear audit log from local storage:", error);
        }
    }

    public subscribe(callback: Subscriber): () => void {
        this.subscribers.push(callback);
        // Immediately notify with current logs
        callback([...this.logs]);

        // Return an unsubscribe function
        return () => {
            this.subscribers = this.subscribers.filter(sub => sub !== callback);
        };
    }

    private notifySubscribers() {
        const logsCopy = [...this.logs];
        this.subscribers.forEach(callback => callback(logsCopy));
    }
}

// Export a singleton instance
export const auditLogService = new AuditLogService();
