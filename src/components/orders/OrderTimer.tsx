import React, { useState, useEffect, FC } from 'react';
import { Box, Tooltip } from '@mui/material';
import { TimerRounded } from '@mui/icons-material';
import { TypographyCustom } from '../custom';
import { red, green, orange } from '@mui/material/colors';

interface OrderTimerProps {
    receivedAt: string | null;
    deliveredAt?: string | null;
    status: string;
}

export const OrderTimer: FC<OrderTimerProps> = ({ receivedAt, deliveredAt, status }) => {
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const [isOverdue, setIsOverdue] = useState(false);

    useEffect(() => {
        if (!receivedAt) return;

        const timer = setInterval(() => {
            // Fix Timezone: assume server string 'YYYY-MM-DD HH:MM:SS' is UTC if no TZ info
            let startT = new Date(receivedAt).getTime();
            // Simple heuristic: if simple SQL string, treat as UTC
            if (receivedAt.length === 19 && !receivedAt.includes('T')) {
                startT = new Date(receivedAt + 'Z').getTime(); // Force UTC check
                // Fallback: if that makes it waaaay in past/future, might be local. 
                // But typically fixes "future" dates issue.
            } else {
                startT = new Date(receivedAt).getTime();
            }

            const now = deliveredAt ? new Date(deliveredAt).getTime() : new Date().getTime();

            const diffInSeconds = Math.floor((now - startT) / 1000);
            const fortyFiveMinutesInSeconds = 45 * 60;

            const remaining = fortyFiveMinutesInSeconds - diffInSeconds;
            setTimeLeft(remaining);
            setIsOverdue(remaining <= 0);

            if (deliveredAt || status === 'Entregado') {
                clearInterval(timer);
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [receivedAt, deliveredAt, status]);

    if (!receivedAt) return null;

    const formatTime = (seconds: number) => {
        const absSeconds = Math.abs(seconds);
        const mins = Math.floor(absSeconds / 60);
        const secs = absSeconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getColor = () => {
        if (status === 'Entregado') return green[600];
        if (isOverdue) return red[600];
        if (timeLeft && timeLeft < 600) return orange[600]; // Less than 10 mins
        return 'info.main';
    };

    return (
        <Tooltip title={isOverdue ? "Tiempo excedido (Límite 45 min)" : "Tiempo para entrega (45 min)"}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <TimerRounded sx={{ fontSize: '1rem', color: getColor() }} />
                <TypographyCustom variant="caption" sx={{ color: getColor(), fontWeight: 'bold' }}>
                    {timeLeft !== null ? (isOverdue ? `-${formatTime(timeLeft)}` : formatTime(timeLeft)) : '--:--'}
                </TypographyCustom>
            </Box>
        </Tooltip>
    );
};
