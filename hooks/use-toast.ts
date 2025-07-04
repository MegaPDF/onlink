// ============= hooks/use-toast.ts =============
import { toast } from 'sonner';

export interface ToastOptions {
  id?: string | number;
  duration?: number;
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  dismissible?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
  cancel?: {
    label: string;
    onClick?: () => void;
  };
  onDismiss?: () => void;
  onAutoClose?: () => void;
}

export function useToast() {
  const success = (message: string, options?: ToastOptions) => {
    return toast.success(message, {
      duration: options?.duration || 4000,
      position: options?.position,
      id: options?.id,
      dismissible: options?.dismissible !== false,
      action: options?.action,
      onDismiss: options?.onDismiss,
      onAutoClose: options?.onAutoClose
    });
  };

  const error = (message: string, options?: ToastOptions) => {
    return toast.error(message, {
      duration: options?.duration || 6000,
      position: options?.position,
      id: options?.id,
      dismissible: options?.dismissible !== false,
      action: options?.action,
      onDismiss: options?.onDismiss,
      onAutoClose: options?.onAutoClose
    });
  };

  const warning = (message: string, options?: ToastOptions) => {
    return toast.warning(message, {
      duration: options?.duration || 5000,
      position: options?.position,
      id: options?.id,
      dismissible: options?.dismissible !== false,
      action: options?.action,
      onDismiss: options?.onDismiss,
      onAutoClose: options?.onAutoClose
    });
  };

  const info = (message: string, options?: ToastOptions) => {
    return toast.info(message, {
      duration: options?.duration || 4000,
      position: options?.position,
      id: options?.id,
      dismissible: options?.dismissible !== false,
      action: options?.action,
      onDismiss: options?.onDismiss,
      onAutoClose: options?.onAutoClose
    });
  };

  const loading = (message: string, options?: ToastOptions) => {
    return toast.loading(message, {
      duration: options?.duration || Infinity,
      position: options?.position,
      id: options?.id,
      dismissible: options?.dismissible !== false,
      onDismiss: options?.onDismiss
    });
  };

  const promise = <T>(
    promise: Promise<T>,
    options: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: any) => string);
      duration?: number;
      position?: ToastOptions['position'];
      id?: string | number;
    }
  ) => {
    return toast.promise(promise, {
      loading: options.loading,
      success: options.success,
      error: options.error,
      duration: options.duration,
      position: options.position,
      id: options.id
    });
  };

  const dismiss = (id?: string | number) => {
    return toast.dismiss(id);
  };

  const custom = (jsx: (id: string | number) => React.ReactElement, options?: ToastOptions) => {
    return toast.custom(jsx, {
      duration: options?.duration || 4000,
      position: options?.position,
      id: options?.id,
      dismissible: options?.dismissible !== false,
      onDismiss: options?.onDismiss,
      onAutoClose: options?.onAutoClose
    });
  };

  return {
    success,
    error,
    warning,
    info,
    loading,
    promise,
    dismiss,
    custom,
    // Utility methods
    copySuccess: (text: string = 'Copied to clipboard!') => success(text, { duration: 2000 }),
    saveSuccess: (text: string = 'Saved successfully!') => success(text),
    deleteSuccess: (text: string = 'Deleted successfully!') => success(text),
    updateSuccess: (text: string = 'Updated successfully!') => success(text),
    
    // Error shortcuts
    networkError: () => error('Network error. Please check your connection.'),
    serverError: () => error('Server error. Please try again later.'),
    unauthorized: () => error('You are not authorized to perform this action.'),
    validationError: (message: string = 'Please check your input.') => error(message),
    
    // Loading shortcuts
    saving: () => loading('Saving...'),
    deleting: () => loading('Deleting...'),
    uploading: () => loading('Uploading...'),
    processing: () => loading('Processing...')
  };
}
