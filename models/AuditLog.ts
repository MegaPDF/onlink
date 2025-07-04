import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
  _id: string;
  userId?: mongoose.Types.ObjectId;
  userEmail?: string;
  userName?: string;
  
  action: string;
  resource: string;
  resourceId?: string;
  
  details: {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    endpoint?: string;
    changes: {
      field: string;
      oldValue?: any;
      newValue?: any;
    }[];
    metadata?: Record<string, any>;
  };
  
  context: {
    ip: string;
    userAgent: string;
    sessionId?: string;
    requestId?: string;
    teamId?: mongoose.Types.ObjectId;
  };
  
  result: {
    success: boolean;
    statusCode?: number;
    error?: string;
    duration?: number;
  };
  
  risk: {
    level: 'low' | 'medium' | 'high' | 'critical';
    factors: string[];
    score: number;
  };
  
  timestamp: Date;
  expiresAt?: Date;
}

const AuditLogSchema = new Schema<IAuditLog>({
  userId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User'
  },
  userEmail: { type: String },
  userName: { type: String },
  
  action: { 
    type: String, 
    required: true
  },
  resource: { 
    type: String, 
    required: true
  },
  resourceId: { type: String },
  
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
    requestId: { type: String },
    teamId: { type: Schema.Types.ObjectId, ref: 'Team' }
  },
  
  result: {
    success: { type: Boolean, required: true },
    statusCode: { type: Number },
    error: { type: String },
    duration: { type: Number }
  },
  
  risk: {
    level: { 
      type: String, 
      enum: ['low', 'medium', 'high', 'critical'], 
      required: true
    },
    factors: [{ type: String }],
    score: { type: Number, min: 0, max: 100, required: true }
  },
  
  timestamp: { 
    type: Date, 
    default: Date.now
  },
  
  expiresAt: { type: Date }
}, {
  timestamps: false, // We use custom timestamp
  collection: 'auditlogs'
});

// Clean indexes for audit logs
AuditLogSchema.index({ timestamp: -1 });
AuditLogSchema.index({ userId: 1, timestamp: -1 });
AuditLogSchema.index({ action: 1, timestamp: -1 });
AuditLogSchema.index({ 'risk.level': 1, timestamp: -1 });
AuditLogSchema.index({ 'result.success': 1, timestamp: -1 });
AuditLogSchema.index({ resource: 1, action: 1, timestamp: -1 });
AuditLogSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const AuditLog = mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
