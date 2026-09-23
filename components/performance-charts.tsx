"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { CategoryPerformance } from '@/lib/dashboard-utils';
import { Loader2 } from 'lucide-react';

interface PerformanceChartsProps {
  categoryPerformance?: CategoryPerformance[];
  examTrends?: Array<{ date: string; score: number; attempts: number }>;
  scoreDistribution?: Array<{ range: string; count: number }>;
  loading?: boolean;
}

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export function PerformanceCharts({
  categoryPerformance = [],
  examTrends = [],
  scoreDistribution = [],
  loading = false,
}: PerformanceChartsProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 gap-5">
      {/* Category Performance Bar Chart */}
      {categoryPerformance.length > 0 && (
        <Card className="rounded-2xl border border-border/60 bg-card shadow-sm">
          <CardHeader className="p-5 pb-2">
            <CardTitle className="text-base font-bold tracking-tight">Average Score by Category</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">Performance across topic areas</CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-2">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={categoryPerformance.slice(0, 6)}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis
                  dataKey="categoryName"
                  angle={-30}
                  textAnchor="end"
                  height={70}
                  tick={{ fontSize: 11 }}
                />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value) => `${value}%`}
                  contentStyle={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '12px' }}
                />
                <Bar dataKey="averageScore" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Exam Trends Line Chart */}
      {examTrends.length > 0 && (
        <Card className="rounded-2xl border border-border/60 bg-card shadow-sm">
          <CardHeader className="p-5 pb-2">
            <CardTitle className="text-base font-bold tracking-tight">Score Progression</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">Trend over recent exam attempts</CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-2">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={examTrends}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value) => `${value}%`}
                  contentStyle={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ fill: '#10b981', r: 4 }}
                  name="Score %"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Score Distribution Pie Chart */}
      {scoreDistribution.length > 0 && (
        <Card className="rounded-2xl border border-border/60 bg-card shadow-sm">
          <CardHeader className="p-5 pb-2">
            <CardTitle className="text-base font-bold tracking-tight">Score Distribution</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">Breakdown of passed and failed simulations</CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-2">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={scoreDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {scoreDistribution.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Category Attempts */}
      {categoryPerformance.length > 0 && (
        <Card className="rounded-2xl border border-border/60 bg-card shadow-sm">
          <CardHeader className="p-5 pb-2">
            <CardTitle className="text-base font-bold tracking-tight">Attempts by Category</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">Volume of practice tests completed</CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-2">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={categoryPerformance.slice(0, 6)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="categoryName" type="category" width={110} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '12px' }}
                />
                <Bar dataKey="attempts" fill="#f59e0b" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
