"use client"

import { formatCompactNumber, formatCurrency, formatPercent } from "@/lib/format"
import type { ChannelAggregate } from "@/lib/api/marketing-mix"

interface ChannelContributionTableProps {
  channels: ChannelAggregate[]
}

export function ChannelContributionTable({ channels }: ChannelContributionTableProps) {
  if (!channels.length) {
    return (
      <div className="rounded-2xl border border-white/10 bg-emerald-900/40 p-6 text-sm text-emerald-200/70">
        Channel contribution data is not available.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10">
      <table className="min-w-full divide-y divide-white/10 text-left text-sm text-emerald-100">
        <thead className="bg-emerald-950/70 text-[11px] uppercase tracking-[0.3em] text-emerald-200/70">
          <tr>
            <th scope="col" className="px-4 py-3 font-semibold">Channel</th>
            <th scope="col" className="px-4 py-3 font-semibold">Spend</th>
            <th scope="col" className="px-4 py-3 font-semibold">Share</th>
            <th scope="col" className="px-4 py-3 font-semibold">Est. Conversions</th>
            <th scope="col" className="px-4 py-3 font-semibold">ROAS</th>
            <th scope="col" className="px-4 py-3 font-semibold">CAC</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5 bg-emerald-950/50">
          {channels.map((channel) => (
            <tr key={channel.id} className="hover:bg-emerald-900/40">
              <td className="px-4 py-3 font-semibold text-emerald-50">{channel.name}</td>
              <td className="px-4 py-3 text-emerald-100/80">
                {formatCurrency(channel.total_spend, channel.total_spend < 1000 ? 2 : 0)}
              </td>
              <td className="px-4 py-3 text-emerald-100/80">
                {formatPercent(channel.spend_share)}
              </td>
              <td className="px-4 py-3 text-emerald-100/80">
                {formatCompactNumber(channel.estimated_conversions)}
              </td>
              <td className="px-4 py-3 text-emerald-100/80">
                {channel.roas.toFixed(2)}×
              </td>
              <td className="px-4 py-3 text-emerald-100/80">
                {channel.cac ? formatCurrency(channel.cac, channel.cac < 100 ? 2 : 0) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
