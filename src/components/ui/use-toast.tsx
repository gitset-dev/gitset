import { useState, useEffect } from 'react';

type ToastProps = {
    title?: string;
    description?: string;
    variant?: 'default' | 'destructive';
};

export function useToast() {
    const [toasts, setToasts] = useState<ToastProps[]>([]);

    const toast = ({ title, description, variant = 'default' }: ToastProps) => {
        console.log(`Toast: ${title} - ${description} (${variant})`);
        if (variant === 'destructive') {
        }
    };

    return { toast };
}
