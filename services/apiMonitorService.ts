
import { ApiCallLog } from '../types';

type Subscriber = (logs: ApiCallLog[]) => void;

class ApiMonitorService {
    private logs: ApiCallLog[] = [];
    private subscribers: Subscriber[] = [];
    private logLimit = 100; // Keep the log from growing indefinitely

    public addLog(log: Omit<ApiCallLog, 'id' | 'startTime' | 'status'>): string {
        const id = `api-call-${Date.now()}-${Math.random()}`;
        const newLog: ApiCallLog = {
            id,
            startTime: Date.now(),
            status: 'Pending',
            ...log,
        };
        
        // Add to the beginning of the array
        this.logs.unshift(newLog);

        // Trim the array if it exceeds the limit
        if (this.logs.length > this.logLimit) {
            this.logs.pop();
        }

        this.notifySubscribers();
        return id;
    }

    public updateLog(id: string, updates: Partial<ApiCallLog>) {
        const logIndex = this.logs.findIndex(log => log.id === id);
        if (logIndex !== -1) {
            const originalLog = this.logs[logIndex];
            const endTime = updates.status === 'Success' || updates.status === 'Failed' ? Date.now() : undefined;
            const duration = endTime ? endTime - originalLog.startTime : undefined;

            this.logs[logIndex] = { ...originalLog, ...updates, endTime, duration };
            this.notifySubscribers();
        }
    }

    public subscribe(callback: Subscriber): () => void {
        this.subscribers.push(callback);
        // Immediately notify with current logs
        callback(this.logs); 

        // Return an unsubscribe function
        return () => {
            this.subscribers = this.subscribers.filter(sub => sub !== callback);
        };
    }

    private notifySubscribers() {
        // Create a copy to prevent mutation issues
        const logsCopy = [...this.logs]; 
        this.subscribers.forEach(callback => callback(logsCopy));
    }
}

// Export a singleton instance
export const apiMonitorService = new ApiMonitorService();
