export interface AuditLog {
  id: string;
  userId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  timestamp: Date;
  details?: string;
}

export interface CreateAuditLogCommand {
  userId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  timestamp: Date;
  details?: string;
}
