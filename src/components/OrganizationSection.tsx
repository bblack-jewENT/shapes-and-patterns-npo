import React, { useState } from 'react';
import {
  ArrowUpRight,
  BookOpenCheck,
  Building2,
  CalendarClock,
  CheckCircle2,
  Landmark,
  Scale,
  ShieldCheck,
  Users2,
} from 'lucide-react';
import {
  BOARD_OFFICE_BEARERS,
  BODY_CORPORATE_CLAUSES,
  CONSTITUTIONAL_OBJECTIVES,
  FINANCIAL_AND_CHARTER_SAFEGUARDS,
  GOVERNANCE_PROCEDURES,
  MEETING_CADENCE_RULES,
  ORGANIZATION_IDENTITY,
} from '../data/organizationCharter';
import { PILLAR_META } from '../lib/validation';
import type { Pillar, WorkspaceSection } from '../types/workspace';

interface OrganizationSectionProps {
  onNavigate: (section: WorkspaceSection) => void;
}

type CharterTab = 'objectives' | 'governance' | 'meetings_finances';

export function OrganizationSection({ onNavigate }: OrganizationSectionProps) {
  const [activeTab, setActiveTab] = useState<CharterTab>('objectives');
  const [pillarFilter, setPillarFilter] = useState<'all' | Pillar>('all');

  const visibleObjectives = CONSTITUTIONAL_OBJECTIVES.filter(
    (obj) => pillarFilter === 'all' || obj.pillar === pillarFilter
  );

  return (
    <div className="space-y-6">
      {/* Constitutional Identity Header */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-6 lg:p-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <p className="text-xs font-medium text-[#4B756E] dark:text-[#8FB9B1] uppercase tracking-wider">
              Constitutional Charter · {ORGANIZATION_IDENTITY.jurisdiction}
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#2B2F36] dark:text-slate-100">
              {ORGANIZATION_IDENTITY.displayName}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Constituted under the name{' '}
              <strong className="font-semibold text-[#2B2F36] dark:text-slate-100">
                {ORGANIZATION_IDENTITY.legalName}
              </strong>{' '}
              as a separate legal body corporate operating across education, women and youth
              development, economic empowerment, healthcare, accessibility, and sustainable
              community programmes.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => onNavigate('initiatives')}
              className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-[#2C3A57] hover:bg-[#222D45] dark:bg-[#3B4E73] dark:hover:bg-[#495F8B] hover:-translate-y-0.5 active:translate-y-0 rounded-lg transition-all duration-150 whitespace-nowrap shadow-xs"
            >
              <span>Align Initiatives</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate('team')}
              className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#2B2F36] dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:-translate-y-0.5 active:translate-y-0 rounded-lg transition-all duration-150 whitespace-nowrap"
            >
              <span>View Team Roster</span>
            </button>
          </div>
        </div>

        {/* Constitutional Key Facts Grid */}
        <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1">
              <Building2 className="w-3.5 h-3.5 text-[#2C3A57] dark:text-sky-300" />
              <span>Legal Status</span>
            </div>
            <p className="text-sm font-semibold text-[#2B2F36] dark:text-slate-100">
              {ORGANIZATION_IDENTITY.legalNature}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Perpetual succession · Owns property
            </p>
          </div>

          <div className="p-4 rounded-lg bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1">
              <BookOpenCheck className="w-3.5 h-3.5 text-[#68978F]" />
              <span>Constitution Adopted</span>
            </div>
            <p className="text-sm font-semibold font-mono-tabular text-[#2B2F36] dark:text-slate-100">
              {ORGANIZATION_IDENTITY.adoptedDate}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Signed by Chair {ORGANIZATION_IDENTITY.signatoryChairperson}
            </p>
          </div>

          <div className="p-4 rounded-lg bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1">
              <Users2 className="w-3.5 h-3.5 text-[#E8A735]" />
              <span>Board of Governance</span>
            </div>
            <p className="text-sm font-semibold font-mono-tabular text-[#2B2F36] dark:text-slate-100">
              {BOARD_OFFICE_BEARERS.length} Office Bearers · {ORGANIZATION_IDENTITY.boardTermYears}y Term
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Odd-numbered board (min {ORGANIZATION_IDENTITY.minBoardMembers})
            </p>
          </div>

          <div className="p-4 rounded-lg bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1">
              <Landmark className="w-3.5 h-3.5 text-[#C44D34]" />
              <span>Financial Year-End</span>
            </div>
            <p className="text-sm font-semibold font-mono-tabular text-[#2B2F36] dark:text-slate-100">
              {ORGANIZATION_IDENTITY.financialYearEnd}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Independent Accounting Officer review
            </p>
          </div>
        </div>
      </section>

      {/* Section Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-x-auto max-w-full">
          {(
            [
              { id: 'objectives', label: 'Objectives & Legal Body' },
              { id: 'governance', label: 'Board & Management' },
              { id: 'meetings_finances', label: 'Meetings, Finances & Rules' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`cursor-pointer px-3.5 py-1.5 text-xs font-medium rounded-md transition-all duration-150 whitespace-nowrap shrink-0 ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-slate-900 text-[#2B2F36] dark:text-slate-100 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-[#2B2F36] dark:hover:text-slate-100 hover:bg-white/60 dark:hover:bg-slate-700/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'objectives' && (
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-x-auto max-w-full">
            {(['all', 'learn', 'create', 'empower'] as const).map((pillar) => (
              <button
                key={pillar}
                type="button"
                onClick={() => setPillarFilter(pillar)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  pillarFilter === pillar
                    ? 'bg-white dark:bg-slate-900 text-[#2B2F36] dark:text-slate-100 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-[#2B2F36] dark:hover:text-slate-100'
                }`}
              >
                {pillar === 'all' ? 'All 10 Objectives' : PILLAR_META[pillar].label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tab 1: Constitutional Objectives & Body Corporate */}
      {activeTab === 'objectives' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <section className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 sm:gap-4">
              <div>
                <h2 className="font-display text-base font-bold text-[#2B2F36] dark:text-slate-100">
                  Constitutional Objectives (Clause 3)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Ten community development mandates mapped across Learn, Create, and Empower
                </p>
              </div>
              <span className="text-xs font-mono-tabular text-slate-500 dark:text-slate-400">
                {visibleObjectives.length} of {CONSTITUTIONAL_OBJECTIVES.length}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:gap-px bg-slate-100 dark:bg-slate-800">
              {visibleObjectives.map((obj) => {
                const pillarMeta = PILLAR_META[obj.pillar];
                return (
                  <div
                    key={obj.clause}
                    className="bg-white dark:bg-slate-900 p-4 sm:p-5 flex flex-col justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-xs font-mono-tabular text-slate-400 dark:text-slate-500">
                          Clause {obj.clause}
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                          <span
                            className="w-2 h-2 rounded-sm shrink-0"
                            style={{ backgroundColor: pillarMeta.hex }}
                            aria-hidden="true"
                          />
                          {pillarMeta.label}
                        </span>
                      </div>
                      <h3 className="font-display text-sm font-bold text-[#2B2F36] dark:text-slate-100">
                        {obj.title}
                      </h3>
                      <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        {obj.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <aside className="lg:col-span-4 space-y-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-[#2C3A57] dark:text-sky-300" />
                <h2 className="font-display text-base font-bold text-[#2B2F36] dark:text-slate-100">
                  Body Corporate (Clause 2)
                </h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Legal personality established independently of individual members and office bearers:
              </p>
              <ul className="space-y-2.5">
                {BODY_CORPORATE_CLAUSES.map((clause, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    <CheckCircle2 className="w-4 h-4 text-[#68978F] shrink-0 mt-0.5" />
                    <span>{clause}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-6 space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#C44D34]" />
                <h3 className="font-display text-sm font-bold text-[#2B2F36] dark:text-slate-100">
                  Constitution Adoption Record
                </h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {ORGANIZATION_IDENTITY.adoptedContext} on{' '}
                <strong className="font-mono-tabular text-[#2B2F36] dark:text-slate-100">
                  {ORGANIZATION_IDENTITY.adoptedDate}
                </strong>
                , attested by Chairperson{' '}
                <strong className="text-[#2B2F36] dark:text-slate-100">
                  {ORGANIZATION_IDENTITY.signatoryChairperson}
                </strong>
                .
              </p>
            </div>
          </aside>
        </div>
      )}

      {/* Tab 2: Board of Governance & Management Structure */}
      {activeTab === 'governance' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <section className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 sm:gap-4">
              <div>
                <h2 className="font-display text-base font-bold text-[#2B2F36] dark:text-slate-100">
                  Board of Governance & Elected Office Bearers
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Clause 3.1 portfolios · Personal identity numbers omitted from workspace views for privacy
                </p>
              </div>
              <span className="text-xs font-mono-tabular text-slate-500 dark:text-slate-400">
                3-year term
              </span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {BOARD_OFFICE_BEARERS.map((bearer) => (
                <div key={bearer.clause} className="p-4 sm:p-6 space-y-2.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div>
                      <span className="text-xs font-medium text-[#4B756E] dark:text-[#8FB9B1]">
                        {bearer.role}
                      </span>
                      <h3 className="font-display text-base font-bold text-[#2B2F36] dark:text-slate-100">
                        {bearer.name}
                      </h3>
                    </div>
                    <span className="text-xs font-mono-tabular text-slate-400 dark:text-slate-500">
                      Clause {bearer.clause}
                    </span>
                  </div>
                  <ul className="space-y-1.5">
                    {bearer.duties.map((duty, idx) => (
                      <li
                        key={idx}
                        className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed flex items-start gap-2"
                      >
                        <span className="text-slate-400 dark:text-slate-500 mt-0.5">•</span>
                        <span>{duty}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          <aside className="lg:col-span-4 space-y-4">
            {GOVERNANCE_PROCEDURES.map((rule) => (
              <div
                key={rule.title}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-1.5"
              >
                <span className="text-xs font-mono-tabular text-slate-400 dark:text-slate-500">
                  {rule.clause}
                </span>
                <h3 className="font-display text-sm font-bold text-[#2B2F36] dark:text-slate-100">
                  {rule.title}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {rule.summary}
                </p>
              </div>
            ))}
          </aside>
        </div>
      )}

      {/* Tab 3: Meetings, Quorums, Finances & Amendments */}
      {activeTab === 'meetings_finances' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2.5">
              <CalendarClock className="w-4 h-4 text-[#2C3A57] dark:text-sky-300 shrink-0" />
              <div>
                <h2 className="font-display text-base font-bold text-[#2B2F36] dark:text-slate-100">
                  Meetings, Quorums & Voting (Clause 8)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Notice windows, quorum thresholds, and minute confirmation rules
                </p>
              </div>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {MEETING_CADENCE_RULES.map((item) => (
                <div key={item.title} className="p-4 sm:p-5 space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-display text-sm font-bold text-[#2B2F36] dark:text-slate-100">
                      {item.title}
                    </h3>
                    <span className="text-xs font-mono-tabular text-slate-400 dark:text-slate-500 whitespace-nowrap">
                      {item.clause}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {item.summary}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2.5">
              <Landmark className="w-4 h-4 text-[#68978F] shrink-0" />
              <div>
                <h2 className="font-display text-base font-bold text-[#2B2F36] dark:text-slate-100">
                  Finances, Assets & Constitutional Integrity (Clauses 9–12)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Non-profit safeguards, signatory controls, and accounting oversight
                </p>
              </div>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {FINANCIAL_AND_CHARTER_SAFEGUARDS.map((item) => (
                <div key={item.title} className="p-4 sm:p-5 space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-display text-sm font-bold text-[#2B2F36] dark:text-slate-100">
                      {item.title}
                    </h3>
                    <span className="text-xs font-mono-tabular text-slate-400 dark:text-slate-500 whitespace-nowrap">
                      {item.clause}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {item.summary}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
