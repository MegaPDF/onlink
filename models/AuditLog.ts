// ============= models/AuditLog.ts =============
import mongoose, { Schema, Document } from 'mongoose';
export interface IAuditLog extends Document {
  _id: string;
  
  // Who performed the action
  userId?: mongoose.Types.ObjectId;
  userEmail?: string;
  userName?: string;
  
  // What action was performed
  action: string; // e.g., 'create_url', 'delete_user', 'update_settings'
  resource: string; // e.g., 'url', 'user', 'team', 'settings'
  resourceId?: string;
  
  // Action details
  details: {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    endpoint?: string;
    changes?: {
      field: string;
      oldValue?: any;
      newValue?: any;
    }[];
    metadata?: Record<string, any>;
  };
  
  // Context
  context: {
    ip: string;
    userAgent: string;
    sessionId?: string;
    requestId?: string;
    teamId?: mongoose.Types.ObjectId;
  };
  
  // Result
  result: {
    success: boolean;
    statusCode?: number;
    error?: string;
    duration?: number; // in milliseconds
  };
  
  // Risk assessment
  risk: {
    level: 'low' | 'medium' | 'high' | 'critical';
    factors: string[]; // e.g., ['unusual_time', 'new_location', 'admin_action']
    score: number; // 0-100
  };
  
  // Timestamp
  timestamp: Date;
  
  // Retention
  expiresAt?: Date;
}

const AuditLogSchema = new Schema<IAuditLog>({
  userId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User',
    index: true
  },
  userEmail: { type: String, index: true },
  userName: { type: String },
  
  action: { 
    type: String, 
    required: true,
    index: true
  },
  resource: { 
    type: String, 
    required: true,
    index: true
  },
  resourceId: { type: String, index: true },
  
  details: {
    method: { 
      type: String, 
      enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], 
      required: true 
    },
    endpoint: { type: String },
    changes: [{
      field: { type: String, required: true },
      oldValue: { type: Schema.Types.Mixed },
      newValue: { type: Schema.Types.Mixed }
    }],
    metadata: { type: Schema.Types.Mixed }
  },
  
  context: {
    ip: { type: String, required: true },
    userAgent: { type: String, required: true },
    sessionId: { type: String },
    requestId: { type: String, index: true },
    teamId: { type: Schema.Types.ObjectId, ref: 'Team' }
  },
  
  result: {
    success: { type: Boolean, required: true, index: true },
    statusCode: { type: Number },
    error: { type: String },
    duration: { type: Number }
  },
  
  risk: {
    level: { 
      type: String, 
      enum: ['low', 'medium', 'high', 'critical'], 
      required: true,
      index: true
    },
    factors: [{ type: String }],
    score: { type: Number, min: 0, max: 100, required: true }
  },
  
  timestamp: { 
    type: Date, 
    default: Date.now, 
    index: true 
  },
  
  expiresAt: { type: Date, index: true }
}, {
  timestamps: false, // We use custom timestamp
  collection: 'auditlogs'
});

// Indexes for efficient querying
AuditLogSchema.index({ timestamp: -1 });
AuditLogSchema.index({ userId: 1, timestamp: -1 });
AuditLogSchema.index({ action: 1, timestamp: -1 });
AuditLogSchema.index({ 'risk.level': 1, timestamp: -1 });
AuditLogSchema.index({ 'result.success': 1, timestamp: -1 });

// Compound indexes
AuditLogSchema.index({ resource: 1, action: 1, timestamp: -1 });
AuditLogSchema.index({ userId: 1, action: 1, timestamp: -1 });

// TTL index for automatic cleanup (if expiresAt is set)
AuditLogSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const AuditLog = mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
