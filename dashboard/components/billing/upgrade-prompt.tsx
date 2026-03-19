'use client';

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PlanSelectionModal } from './plan-selection-modal';

interface UpgradePromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resource: string;
  current: number;
  limit: number;
}

const COLORS = {
  darkGreen: '#1A3C2E',
  gold: '#E8A838',
  cream: '#F9F6F0',
  brown: '#8B7355',
} as const;

export function UpgradePrompt({
  open,
  onOpenChange,
  resource,
  current,
  limit,
}: UpgradePromptProps) {
  const [showPlanModal, setShowPlanModal] = useState(false);

  const handleUpgradeClick = () => {
    onOpenChange(false);
    setShowPlanModal(true);
  };

  const pluralResource = limit === 1 ? resource : `${resource}s`;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="sm:max-w-[440px] p-0 gap-0 border-none"
          style={{ backgroundColor: COLORS.cream }}
        >
          <DialogHeader className="px-6 pt-6 pb-2">
            <div className="flex justify-center mb-3">
              <div
                className="rounded-full p-3"
                style={{ backgroundColor: `${COLORS.gold}20` }}
              >
                <AlertTriangle className="h-6 w-6" style={{ color: COLORS.gold }} />
              </div>
            </div>
            <DialogTitle
              className="text-xl font-bold text-center"
              style={{ color: COLORS.darkGreen }}
            >
              Plan Limit Reached
            </DialogTitle>
            <DialogDescription
              className="text-center text-sm mt-2"
              style={{ color: COLORS.brown }}
            >
              Free plan allows {limit} {pluralResource}. You currently have {current}.
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-4 text-center">
            <p className="text-sm" style={{ color: COLORS.brown }}>
              Upgrade to Pro for unlimited {resource}s and access to all features.
            </p>
          </div>

          <DialogFooter className="px-6 pb-6 flex flex-col gap-2 sm:flex-col">
            <Button
              className="w-full font-semibold"
              onClick={handleUpgradeClick}
              style={{
                backgroundColor: COLORS.gold,
                color: COLORS.darkGreen,
              }}
            >
              Upgrade to Pro
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => onOpenChange(false)}
              style={{
                borderColor: COLORS.brown,
                color: COLORS.darkGreen,
              }}
            >
              Maybe Later
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PlanSelectionModal open={showPlanModal} onOpenChange={setShowPlanModal} />
    </>
  );
}
