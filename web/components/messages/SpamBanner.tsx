'use client';

import { AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function SpamBanner({
    reason = "Why is this message in spam? You reported this message as spam from your inbox.",
    onMarkNotSpam,
    onBlockSender,
}: {
    reason?: string;
    onMarkNotSpam?: () => void;
    onBlockSender?: () => void;
}) {
    return (
        <div className="bg-yellow-100 dark:bg-yellow-900 border border-yellow-400 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200 px-6 py-4 rounded-xl shadow-sm mb-4 flex flex-col gap-4">
            <div className="flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-yellow-700 dark:text-yellow-200" />
                <p className="text-sm sm:text-base font-medium">{reason}</p>
            </div>

            <div className="flex flex-wrap gap-2">
                {onMarkNotSpam && (
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={onMarkNotSpam}
                        className="text-yellow-700"
                    >
                        Mark as Not Spam
                    </Button>
                )}

                {onBlockSender && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onBlockSender}
                        className="text-red-700 hover:underline"
                    >
                        Block Sender
                    </Button>
                )}
            </div>
        </div>
    );
}
