import React from 'react';
import { Trip } from '@/types';
import { CURRENCY_SYMBOLS } from '@/constants';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

interface BudgetBarProps {
  trip: Trip;
  totalCost: number;
  isCalculating: boolean;
}

const BudgetBar: React.FC<BudgetBarProps> = ({ trip, totalCost, isCalculating }) => {
  if (!trip.budget || trip.budget <= 0) return null;

  const percentage = Math.min((totalCost / trip.budget) * 100, 100);
  const isOver = totalCost > trip.budget;
  const isNear = percentage >= 80 && !isOver;
  const symbol = CURRENCY_SYMBOLS[trip.base_currency] || trip.base_currency;

  return (
    <div className="mt-4 p-3 rounded-lg bg-primary-foreground/10 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-primary-foreground/70 flex items-center gap-1">
          {isOver ? (
            <><AlertTriangle className="h-3.5 w-3.5 text-red-400" /> חריגה מהתקציב!</>
          ) : isNear ? (
            <><AlertTriangle className="h-3.5 w-3.5 text-yellow-400" /> מתקרבים לתקציב</>
          ) : (
            <><CheckCircle2 className="h-3.5 w-3.5 text-green-400" /> תקציב</>
          )}
        </span>
        <span className="text-xs text-primary-foreground/70">
          {isCalculating ? '...' : (
            <>{symbol}{totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })} / {symbol}{trip.budget.toLocaleString(undefined, { maximumFractionDigits: 0 })}</>
          )}
        </span>
      </div>
      <div className="w-full h-2 bg-primary-foreground/20 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isOver ? 'bg-red-400' : isNear ? 'bg-yellow-400' : 'bg-green-400'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export default BudgetBar;
