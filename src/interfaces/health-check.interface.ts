export interface HealthCheck {
  status?: string;
  details?: {
    [key: string]: {
      status: string;
      message?: string;
    };
  };
  requestTime?: number
}