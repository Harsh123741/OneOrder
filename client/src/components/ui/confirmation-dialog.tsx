import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ConfirmationDialogProps {
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  variant?: 'default' | 'destructive';
}

interface UseConfirmationDialogReturn {
  ConfirmationDialog: React.ComponentType<ConfirmationDialogProps>;
  showConfirmation: (props: Omit<ConfirmationDialogProps, 'onConfirm' | 'onCancel'>) => Promise<boolean>;
}

export function useConfirmationDialog(): UseConfirmationDialogReturn {
  const [dialogProps, setDialogProps] = useState<ConfirmationDialogProps | null>(null);
  const [resolvePromise, setResolvePromise] = useState<((value: boolean) => void) | null>(null);

  const showConfirmation = (props: Omit<ConfirmationDialogProps, 'onConfirm' | 'onCancel'>): Promise<boolean> => {
    return new Promise((resolve) => {
      setResolvePromise(() => resolve);
      setDialogProps({
        ...props,
        onConfirm: () => {
          resolve(true);
          setDialogProps(null);
          setResolvePromise(null);
        },
        onCancel: () => {
          resolve(false);
          setDialogProps(null);
          setResolvePromise(null);
        },
      });
    });
  };

  const ConfirmationDialog: React.ComponentType<ConfirmationDialogProps> = (props) => {
    return (
      <AlertDialog open={!!dialogProps}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dialogProps?.title}</AlertDialogTitle>
            <AlertDialogDescription>{dialogProps?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={dialogProps?.onCancel}>
              {dialogProps?.cancelText || 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={dialogProps?.onConfirm}
              className={
                dialogProps?.variant === 'destructive'
                  ? 'bg-red-600 hover:bg-red-700 focus:ring-red-600'
                  : ''
              }
            >
              {dialogProps?.confirmText || 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  };

  return { ConfirmationDialog, showConfirmation };
}