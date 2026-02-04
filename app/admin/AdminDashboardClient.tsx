"use client";

import { useMemo } from "react";
import { getKpis } from "@/lib/mock-members";
import type { MemberRecord } from "@/lib/mock-members";
import { NIGERIA_STATES } from "@/lib/nigeria-geo";
import { Users, UserCheck, TrendingUp, MapPin, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

const STATE_POPULATIONS: Record<string, number> = {
  abia: 4100000, adamawa: 4900000, "akwa-ibom": 5500000, anambra: 5500000,
  bauchi: 7500000, bayelsa: 2500000, benue: 5700000, borno: 5900000,
  "cross-river": 4400000, delta: 5700000, ebonyi: 3200000, edo: 4800000,
  ekiti: 3300000, enugu: 4400000, fct: 3800000, gombe: 3900000,
  imo: 5400000, jigawa: 7100000, kaduna: 9500000, kano: 16000000,
  katsina: 9300000, kebbi: 5300000, kogi: 4500000, kwara: 3600000,
  lagos: 16500000, nasarawa: 2900000, niger: 6800000, ogun: 6000000,
  ondo: 5300000, osun: 5400000, oyo: 9200000, plateau: 4700000,
  rivers: 7500000, sokoto: 5900000, taraba: 3600000, yobe: 3700000,
  zamfara: 5300000,
};

export function AdminDashboardClient({ members }: { members: MemberRecord[] }) {
  const kpis = useMemo(() => getKpis(members), [members]);

  const orgHierarchy = useMemo(() => {
    return NIGERIA_STATES.map((s) => {
      const stateId = s.id;
      const lgas = (s.lgas ?? []).slice(0, 3).map((lga) => {
        const count = members.filter((m) => m.state === stateId && m.lga === lga.id).length;
        const wards = (lga.wards ?? []).slice(0, 2).map((w) => ({
          id: w.id,
          name: w.name,
          count: members.filter((m) => m.state === stateId && m.lga === lga.id && m.ward === w.id).length,
        }));
        return { ...lga, count, wards };
      });
      const totalInState = members.filter((m) => m.state === stateId).length;
      return { ...s, lgas, totalInState };
    });
  }, [members]);

  const stateData = useMemo(() => {
    const byState = kpis.byState ?? {};
    return NIGERIA_STATES.map((s) => {
      const memberCount = byState[s.id] ?? 0;
      const citizenCount = STATE_POPULATIONS[s.id] ?? 0;
      const density = citizenCount > 0 ? (memberCount / citizenCount) * 100 : 0;
      return { id: s.id, name: s.name, memberCount, citizenCount, density };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [kpis.byState]);

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">North Star Dashboard</h1>
        <p className="mt-1 text-neutral-600">Membership overview across all 37 states</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Total Members" value={kpis.total.toLocaleString()} icon={<Users className="h-5 w-5" />} />
        <KpiCard title="Female / Male" value={`${kpis.female} / ${kpis.male}`} icon={<UserCheck className="h-5 w-5" />} />
        <KpiCard
          title="Top State"
          value={
            kpis.topState
              ? `${NIGERIA_STATES.find((s) => s.id === kpis.topState![0])?.name ?? kpis.topState[0]} (${kpis.topState[1]})`
              : "—"
          }
          icon={<MapPin className="h-5 w-5" />}
        />
        <KpiCard title="Growth This Week" value={`+${kpis.growthThisWeek}`} icon={<TrendingUp className="h-5 w-5" />} accent />
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-900">Member Density by State</h2>
          <div className="flex items-center gap-2 text-sm text-neutral-500">
            <Activity className="h-4 w-4" />
            <span>Sorted alphabetically</span>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {stateData.map((state) => (
            <StateDensityCard key={state.id} state={state} />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-neutral-900">
          Org & Chapter View — All 37 states
        </h2>
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm overflow-x-auto">
          <p className="text-sm text-neutral-600 mb-4">State → LGA → Ward hierarchy with member counts</p>
          <div className="space-y-4">
            {orgHierarchy.map((state) => (
              <div key={state.id} className="border-l-2 border-sdp-primary/30 pl-4">
                <p className="font-semibold text-neutral-900">{state.name} — {state.totalInState} members</p>
                <div className="mt-2 ml-4 space-y-2">
                  {state.lgas.map((lga) => (
                    <div key={lga.id}>
                      <p className="text-sm text-neutral-700">{lga.name} ({lga.count})</p>
                      {lga.wards.length > 0 && (
                        <div className="ml-4 text-xs text-neutral-600">
                          {lga.wards.map((w) => (
                            <span key={w.id} className="mr-2">{w.name}: {w.count}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function StateDensityCard({ state }: { state: { id: string; name: string; memberCount: number; citizenCount: number; density: number } }) {
  const isEmpty = state.memberCount === 0;
  return (
    <div className="min-h-[140] rounded-xl border border-neutral-200 bg-white p-4 shadow-sm transition-all hover:border-sdp-primary/30 hover:shadow-md">
      <div className="flex items-start justify-between">
        <h3 className="font-bold text-neutral-900 truncate" title={state.name}>{state.name}</h3>
        <span className="text-[10px] font-bold text-sdp-accent bg-sdp-accent/10 px-1.5 py-0.5 rounded uppercase">
          {state.density.toFixed(4)}%
        </span>
      </div>
      <div className="mt-4 space-y-3">
        {isEmpty ? (
          <div className="py-2 text-center">
            <p className="text-sm font-medium text-neutral-600">No members yet</p>
            <p className="text-xs text-neutral-500 mt-0.5">Enrollment will populate this state</p>
          </div>
        ) : (
          <>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-neutral-500">Members</span>
                <span className="font-semibold text-neutral-900">{state.memberCount.toLocaleString()}</span>
              </div>
              <div className="h-1.5 w-full bg-neutral-100 rounded-full overflow-hidden">
                <div className="h-full bg-sdp-primary" style={{ width: `${Math.min(state.density * 100, 100)}%` }} />
              </div>
            </div>
            <div className="flex justify-between text-xs border-t border-neutral-50 pt-2">
              <span className="text-neutral-500">Citizens</span>
              <span className="text-neutral-700">{(state.citizenCount / 1000000).toFixed(1)}M</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function KpiCard({ title, value, icon, accent }: { title: string; value: string; icon: React.ReactNode; accent?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-neutral-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md",
        accent && "border-sdp-accent/30 bg-sdp-accent/5"
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-neutral-600">{title}</p>
        <span
          className={cn(
            "rounded-lg p-2",
            accent ? "bg-sdp-accent/20 text-sdp-accent" : "bg-sdp-primary/10 text-sdp-primary"
          )}
        >
          {icon}
        </span>
      </div>
      <p className="mt-2 text-2xl font-bold text-neutral-900">{value}</p>
    </div>
  );
}
