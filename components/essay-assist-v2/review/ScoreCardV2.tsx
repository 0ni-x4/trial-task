'use client';

import { Card } from '@/components/ui/card';
import { FC } from 'react';

type Metric = { label: string; value: number };
type SubGrade = { label: string; grade: string };

interface ScoreCardProps {
  overallScore: number;
  metrics: Metric[];
  subGrades: SubGrade[];
}

export const ScoreCardV2: FC<ScoreCardProps> = ({ overallScore, metrics, subGrades }) => {
  return (
    <Card className="p-3 rounded-[20px] mb-2">
      <div className="flex items-start gap-6">
        {/* Donut */}
        <div className="flex flex-col items-center mt-3">
          <div className="relative w-20 h-20">
            <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 80 80">
              {/* Background circle */}
              <circle
                cx="40"
                cy="40"
                r="32"
                stroke="hsl(var(--muted))"
                strokeWidth="8"
                fill="transparent"
              />
              {/* Progress circle */}
              <circle
                cx="40"
                cy="40"
                r="32"
                stroke="#9db4ff"
                strokeWidth="8"
                fill="transparent"
                strokeDasharray={`${(overallScore / 100) * 201.06} 201.06`}
                strokeLinecap="round"
                className="transition-all duration-500 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xl font-bold text-foreground">{overallScore}%</span>
            </div>
          </div>
          <span className="uppercase text-xs text-muted-foreground mt-1">Overall</span>
        </div>

        {/* Metrics */}
        <div className="flex-1 flex flex-col justify-between h-20 space-y-1">
          {metrics?.map(m => {
            const colorMap: Record<string, string> = {
              Clarity: '#c084fc',
              Delivery: '#fb923c',
              Quality: '#34d399',
            };
            const barColor = colorMap[m.label] || '#6366f1';
            return (
              <div key={m.label} className="w-full">
                <div className="flex justify-between items-baseline text-xs mb-1 font-medium">
                  <span className="text-foreground">{m.label}</span>
                  <span className="text-foreground text-sm font-semibold">{m.value}%</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full">
                  <div
                    className="h-2 rounded-full"
                    style={{ width: `${m.value}%`, backgroundColor: barColor }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex justify-around w-full mt-6 gap-6">
                  {subGrades?.map(s => {
          const gradeColorMap: Record<string, string> = {
            'A+': 'bg-emerald-200 dark:bg-emerald-800', // Highest excellence
            A: 'bg-emerald-300 dark:bg-emerald-700', // Excellence
            'A-': 'bg-emerald-400 dark:bg-emerald-600', // Near excellence
            'B+': 'bg-blue-200 dark:bg-blue-800', // Very good
            B: 'bg-blue-300 dark:bg-blue-700', // Good
            'B-': 'bg-blue-400 dark:bg-blue-600', // Above average
            'C+': 'bg-amber-200 dark:bg-amber-800', // Average plus
            C: 'bg-amber-300 dark:bg-amber-700', // Average
            'C-': 'bg-amber-400 dark:bg-amber-600', // Below average
            'D+': 'bg-red-200 dark:bg-red-800', // Poor
            D: 'bg-red-300 dark:bg-red-700', // Very poor
            'D-': 'bg-red-400 dark:bg-red-600', // Near failing
            F: 'bg-red-500 dark:bg-red-500', // Failing
            'F-': 'bg-red-600 dark:bg-red-400', // Complete failing
          };
          const bgClass = gradeColorMap[s.grade] || 'bg-muted';
          return (
            <div key={s.label} className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${bgClass}`}
              >
                <span className="text-sm font-bold text-foreground">{s.grade}</span>
              </div>
              <span className="text-sm text-muted-foreground">{s.label}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
