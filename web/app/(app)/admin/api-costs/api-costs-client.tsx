"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  PROVIDERS,
  PROVIDER_COLORS,
  PROVIDER_LABELS,
  type DailyTrendPoint,
  type OperationSpend,
  type Provider,
  type ProviderSpend,
  type QuotaBurn,
  type TenantSpend,
} from "@/lib/api-costs/queries";

interface Props {
  monthlySpend: ProviderSpend[];
  topOperations: OperationSpend[];
  tenantSpend: TenantSpend[];
  quotaBurn: QuotaBurn;
  dailyTrend: DailyTrendPoint[];
}

const usd = (n: number): string =>
  n >= 1
    ? `$${n.toFixed(2)}`
    : n > 0
      ? `$${n.toFixed(4)}`
      : "$0.00";

const integer = (n: number): string => n.toLocaleString("en-US");

export function ApiCostsClient({
  monthlySpend,
  topOperations,
  tenantSpend,
  quotaBurn,
  dailyTrend,
}: Props) {
  const totalMtd = monthlySpend.reduce((sum, p) => sum + p.cost_usd, 0);

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">API Costs</h1>
        <p className="mt-1 text-sm text-slate-600">
          Infra spend across OpenAI, Searchapi, and Apify. Reads{" "}
          <code className="text-xs">api_usage_log</code>; visible to super
          admins only.
        </p>
      </header>

      {/* Top row: monthly spend by provider + total card */}
      <section className="mb-8 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card
          title="Monthly spend by provider"
          subtitle="Month-to-date"
          className="lg:col-span-2"
        >
          {totalMtd === 0 ? (
            <EmptyState>No spend recorded this month.</EmptyState>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={monthlySpend} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis
                  dataKey="provider"
                  tick={{ fontSize: 12, fill: "#475569" }}
                  tickFormatter={(p: Provider) => PROVIDER_LABELS[p]}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#6B7280" }}
                  tickFormatter={(v: number) => usd(v)}
                />
                <Tooltip
                  cursor={{ fill: "rgba(26,140,150,0.06)" }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.[0]) return null;
                    const row = payload[0].payload as ProviderSpend;
                    return (
                      <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
                        <p className="font-medium text-slate-900">
                          {PROVIDER_LABELS[row.provider]}
                        </p>
                        <p className="text-slate-600">{usd(row.cost_usd)}</p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="cost_usd" fill="#1A8C96" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card title="Total month-to-date" subtitle="All providers">
          <div className="flex h-full flex-col justify-center">
            <p className="text-3xl font-semibold text-slate-900">
              {usd(totalMtd)}
            </p>
            <ul className="mt-3 space-y-1 text-xs text-slate-600">
              {monthlySpend.map((p) => (
                <li key={p.provider} className="flex justify-between">
                  <span className="inline-flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: PROVIDER_COLORS[p.provider] }}
                    />
                    {PROVIDER_LABELS[p.provider]}
                  </span>
                  <span className="tabular-nums">{usd(p.cost_usd)}</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </section>

      {/* Searchapi quota burn-down */}
      <section className="mb-8">
        <Card title="Searchapi quota burn-down" subtitle="Month-to-date">
          <QuotaBurnPanel burn={quotaBurn} />
        </Card>
      </section>

      {/* 30-day trend */}
      <section className="mb-8">
        <Card title="Spend trend by provider" subtitle="Last 30 days">
          {dailyTrend.every(
            (d) => d.openai === 0 && d.searchapi === 0 && d.apify === 0
          ) ? (
            <EmptyState>No spend recorded in the last 30 days.</EmptyState>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={dailyTrend} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "#6B7280" }}
                  tickFormatter={(d: string) => d.slice(5)}
                  minTickGap={20}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#6B7280" }}
                  tickFormatter={(v: number) => usd(v)}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
                        <p className="mb-1 font-medium text-slate-900">{label}</p>
                        {payload.map((entry) => {
                          const key = entry.dataKey as Provider;
                          const value = Number(entry.value ?? 0);
                          return (
                            <p key={key} className="text-slate-600">
                              <span
                                aria-hidden="true"
                                className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle"
                                style={{ backgroundColor: PROVIDER_COLORS[key] }}
                              />
                              {PROVIDER_LABELS[key]}: {usd(value)}
                            </p>
                          );
                        })}
                      </div>
                    );
                  }}
                />
                <Legend
                  formatter={(value) =>
                    PROVIDER_LABELS[value as Provider] ?? value
                  }
                />
                {PROVIDERS.map((p) => (
                  <Line
                    key={p}
                    type="monotone"
                    dataKey={p}
                    stroke={PROVIDER_COLORS[p]}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>
      </section>

      {/* Bottom row: top operations + tenant attribution */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Top operations by cost" subtitle="Month-to-date · Top 10">
          {topOperations.length === 0 ? (
            <EmptyState>No spend recorded this month.</EmptyState>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 text-left font-medium">Operation</th>
                  <th className="py-2 text-right font-medium">Calls</th>
                  <th className="py-2 text-right font-medium">Cost</th>
                </tr>
              </thead>
              <tbody>
                {topOperations.map((op) => (
                  <tr
                    key={op.called_from}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td
                      className="py-2 text-slate-800"
                      title={op.called_from}
                    >
                      {op.display_label}
                    </td>
                    <td className="py-2 text-right tabular-nums text-slate-600">
                      {integer(op.call_count)}
                    </td>
                    <td className="py-2 text-right tabular-nums text-slate-900">
                      {usd(op.cost_usd)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card title="Cost by tenant" subtitle="Month-to-date">
          {tenantSpend.length === 0 ? (
            <EmptyState>No spend recorded this month.</EmptyState>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 text-left font-medium">Tenant</th>
                  <th className="py-2 text-right font-medium">Cost</th>
                </tr>
              </thead>
              <tbody>
                {tenantSpend.map((t) => (
                  <tr
                    key={t.tenant_id ?? "platform"}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="py-2 text-slate-800">{t.display_label}</td>
                    <td className="py-2 text-right tabular-nums text-slate-900">
                      {usd(t.cost_usd)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </section>
    </div>
  );
}

function Card({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-lg border border-slate-200 bg-white p-4 shadow-sm ${className ?? ""}`}
    >
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {subtitle && (
          <p className="text-xs text-slate-500">{subtitle}</p>
        )}
      </div>
      {children}
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-32 items-center justify-center text-sm text-slate-500">
      {children}
    </div>
  );
}

function QuotaBurnPanel({ burn }: { burn: QuotaBurn }) {
  const { searches_used, monthly_quota, percent_used, days_into_month, plan_name } =
    burn;

  const quotaLabel = monthly_quota ? integer(monthly_quota) : "—";
  const percentLabel = percent_used !== null ? `${percent_used.toFixed(1)}%` : "—";
  const barColor =
    percent_used !== null
      ? percent_used > 90
        ? "#DC2626" // red
        : percent_used > 80
          ? "#F59E0B" // amber
          : "#1A8C96" // teal
      : "#94A3B8";

  return (
    <div>
      <p className="text-sm text-slate-800">
        <span className="font-semibold tabular-nums">{integer(searches_used)}</span> of{" "}
        <span className="font-semibold tabular-nums">{quotaLabel}</span> searches (
        <span className="font-semibold tabular-nums">{percentLabel}</span>) — {days_into_month}{" "}
        {days_into_month === 1 ? "day" : "days"} into month
      </p>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full transition-all duration-300"
          style={{
            width: `${Math.min(100, percent_used ?? 0)}%`,
            backgroundColor: barColor,
          }}
        />
      </div>
      {plan_name && (
        <p className="mt-2 text-xs text-slate-500">
          Plan: {plan_name}
        </p>
      )}
    </div>
  );
}
