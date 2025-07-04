import mongoose, { Schema, Document } from 'mongoose';

export interface IFolder extends Document {
  _id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  
  userId: mongoose.Types.ObjectId;
  teamId?: mongoose.Types.ObjectId;
  
  parentId?: mongoose.Types.ObjectId;
  path: string;
  level: number;
  
  isShared: boolean;
  shareSettings?: {
    type: 'public' | 'team' | 'private';
    permissions: {
      view: boolean;
      edit: boolean;
      delete: boolean;
    };
    sharedWith: {
      userId: mongoose.Types.ObjectId;
      role: 'viewer' | 'editor';
      sharedAt: Date;
    }[];
  };
  
  stats: {
    urlCount: number;
    totalClicks: number;
    lastUpdated: Date;
  };
  
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
  deletedAt?: Date;
}

const FolderSchema = new Schema<IFolder>({
  name: { 
    type: String, 
    required: true,
    maxlength: 100,
    trim: true
  },
  description: { 
    type: String, 
    maxlength: 500,
    trim: true
  },
  color: { 
    type: String, 
    default: '#3B82F6',
    match: /^#[0-9A-F]{6}$/i
  },
  icon: { 
    type: String, 
    maxlength: 50 
  },
  
  userId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true
  },
  teamId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Team'
  },
  
  parentId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Folder'
  },
  path: { 
    type: String, 
    required: true
  },
  level: { 
    type: Number, 
    required: true, 
    min: 0, 
    max: 10
  },
  
  isShared: { type: Boolean, default: false },
  shareSettings: {
    type: { type: String, enum: ['public', 'team', 'private'], default: 'private' },
    permissions: {
      view: { type: Boolean, default: true },
      edit: { type: Boolean, default: false },
      delete: { type: Boolean, default: false }
    },
    sharedWith: [{
      userId: { type: Schema.Types.ObjectId, ref: 'User' },
      role: { type: String, enum: ['viewer', 'editor'] },
      sharedAt: { type: Date, default: Date.now }
    }]
  },
  
  stats: {
    urlCount: { type: Number, default: 0, min: 0 },
    totalClicks: { type: Number, default: 0, min: 0 },
    lastUpdated: { type: Date, default: Date.now }
  },
  
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date }
}, {
  timestamps: true
});

// Clean indexes
FolderSchema.index({ userId: 1, isDeleted: 1 });
FolderSchema.index({ teamId: 1, isDeleted: 1 });
FolderSchema.index({ parentId: 1, isDeleted: 1 });
FolderSchema.index({ path: 1 });

export const Folder = mongoose.models.Folder || mongoose.model<IFolder>('Folder', FolderSchema);
