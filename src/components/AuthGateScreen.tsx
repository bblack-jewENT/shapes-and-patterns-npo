import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  BookOpenCheck,
  Building2,
  CalendarClock,
  CheckCircle2,
  Landmark,
  Layers,
  Scale,
  Shapes,
  Users,
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
import { BrandEmblemImage, ShapesPatternsSvgMark } from './BrandMark';
import { CalculatorButton } from './CalculatorWidget';
import { GamesSection } from './GamesSection';
import { ThemeToggleButton } from './ThemeSwitcher';

type PublicPageId = 'welcome' | 'about' | 'programmes' | 'governance' | 'games';

const PUBLIC_PAGES: Array<{ id: PublicPageId; label: string }> = [
  { id: 'welcome', label: 'Home' },
  { id: 'about', label: 'Constitution & Charter' },
  { id: 'programmes', label: 'Programmes' },
  { id: 'governance', label: 'Governance & Board' },
  { id: 'games', label: 'Games' },
];

function getInitialPublicPage(): PublicPageId {
  if (typeof window === 'undefined') return 'welcome';
  const hash = window.location.hash.replace(/^#\/?/, '').toLowerCase();
  if (
    hash === 'about' ||
    hash === 'programmes' ||
    hash === 'governance' ||
    hash === 'games'
  ) {
    return hash;
  }
  return 'welcome';
}

interface AuthGateScreenProps {
  onSignIn: () => void;
  isSigningIn: boolean;
  authError: string | null;
  resolvedTheme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export function AuthGateScreen({
  onSignIn,
  isSigningIn,
  authError,
  resolvedTheme,
  onToggleTheme,
}: AuthGateScreenProps) {
  const [activePage, setActivePage] = useState<PublicPageId>(getInitialPublicPage);

  useEffect(() => {
    function handleHashChange() {
      setActivePage(getInitialPublicPage());
    }
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  function navigatePage(page: PublicPageId) {
    setActivePage(page);
    if (typeof window !== 'undefined') {
      window.location.hash = `#/${page}`;
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-slate-950 flex flex-col justify-between">
      <header className="w-full border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4">
          <button
            type="button"
            onClick={() => navigatePage('welcome')}
            className="cursor-pointer flex items-center gap-2 sm:gap-3 min-w-0 hover:opacity-85 transition-opacity"
          >
            <ShapesPatternsSvgMark className="w-7 h-7 shrink-0" />
            <span className="font-display text-sm sm:text-base font-bold tracking-tight text-[#2B2F36] dark:text-slate-100 truncate">
              <span className="sm:hidden">Shapes &amp; Patterns</span>
              <span className="hidden sm:inline">Shapes and Patterns</span>
            </span>
          </button>

          <nav
            aria-label="Public organization pages"
            className="hidden md:flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800"
          >
            {PUBLIC_PAGES.map((page) => {
              const isActive = activePage === page.id;
              return (
                <button
                  key={page.id}
                  type="button"
                  onClick={() => navigatePage(page.id)}
                  className={`cursor-pointer px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150 whitespace-nowrap ${
                    isActive
                      ? 'bg-white dark:bg-slate-900 text-[#2B2F36] dark:text-slate-100 shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-[#2B2F36] dark:hover:text-slate-100 hover:bg-white/60 dark:hover:bg-slate-700/60'
                  }`}
                >
                  {page.label}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <CalculatorButton />
            <ThemeToggleButton
              resolvedTheme={resolvedTheme}
              onToggle={onToggleTheme}
            />
            <button
              type="button"
              onClick={onSignIn}
              disabled={isSigningIn}
              className="cursor-pointer px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-white bg-[#2C3A57] hover:bg-[#222D45] dark:bg-[#3B4E73] dark:hover:bg-[#495F8B] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 rounded-lg transition-all duration-150 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2C3A57] shadow-xs"
            >
              {isSigningIn ? (
                'Signing in...'
              ) : (
                <>
                  <span className="sm:hidden">Sign in</span>
                  <span className="hidden sm:inline">Sign in with Google</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Mobile/Tablet Page Navigation Strip */}
        <div className="md:hidden border-t border-slate-100 dark:border-slate-800 px-4 py-2 flex items-center gap-1.5 overflow-x-auto bg-slate-50/70 dark:bg-slate-900">
          {PUBLIC_PAGES.map((page) => {
            const isActive = activePage === page.id;
            return (
              <button
                key={page.id}
                type="button"
                onClick={() => navigatePage(page.id)}
                className={`cursor-pointer px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-[#2C3A57] dark:bg-[#3B4E73] text-white'
                    : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {page.label}
              </button>
            );
          })}
        </div>
      </header>

      <main className="flex-1 flex items-center">
        {activePage === 'welcome' && (
          <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12 lg:py-16 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
            <div className="lg:col-span-7 flex flex-col justify-center">
              <p className="text-xs sm:text-sm font-medium text-[#4B756E] dark:text-[#8FB9B1] mb-3">
                Learn · Create · Empower · Republic of South Africa
              </p>
              <h1 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-[#2B2F36] dark:text-slate-100 leading-[1.12] text-balance max-w-2xl">
                Collaborative workspace for educators, creators, and community builders.
              </h1>
              <p className="mt-5 text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl">
                Coordinate training and education, women and youth development, economic
                empowerment, healthcare, accessibility programmes, sustainable livelihoods, and
                community events across every Shapes and Patterns NPO hub.
              </p>

              {authError && (
                <div
                  role="alert"
                  className="mt-6 p-3.5 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-lg text-sm text-[#A83C25] dark:text-red-300 max-w-xl"
                >
                  {authError}
                </div>
              )}

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={onSignIn}
                  disabled={isSigningIn}
                  className="cursor-pointer inline-flex items-center gap-2.5 px-6 py-3 text-sm font-semibold text-white bg-[#2C3A57] hover:bg-[#222D45] dark:bg-[#3B4E73] dark:hover:bg-[#495F8B] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 rounded-lg transition-all duration-150 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2C3A57] shadow-xs"
                >
                  <span>{isSigningIn ? 'Connecting Account...' : 'Sign in with Google'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => navigatePage('about')}
                  className="cursor-pointer inline-flex items-center gap-2 px-5 py-3 text-sm font-medium text-[#2B2F36] dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 hover:-translate-y-0.5 active:translate-y-0 rounded-lg transition-all duration-150 whitespace-nowrap shrink-0"
                >
                  <Landmark className="w-4 h-4 text-[#2C3A57] dark:text-sky-300" />
                  <span>Read Constitution & Charter</span>
                </button>
              </div>

              <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#2B2F36] dark:text-slate-100">
                    <Layers className="w-4 h-4 text-[#68978F]" />
                    <span>Initiatives & Tasks</span>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Track Learn, Create, and Empower programs from planning through classroom delivery.
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#2B2F36] dark:text-slate-100">
                    <Shapes className="w-4 h-4 text-[#E8A735]" />
                    <span>Pattern Studio</span>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Co-author modular geometric templates and export print-ready SVG workshop sheets.
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#2B2F36] dark:text-slate-100">
                    <Users className="w-4 h-4 text-[#C44D34]" />
                    <span>Channels & Roster</span>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Align program leads, educators, and volunteers across live discussion channels.
                  </p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 flex">
              <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden flex flex-col justify-between">
                <div className="aspect-square w-full bg-white overflow-hidden">
                  <BrandEmblemImage className="w-full h-full object-cover" />
                </div>
                <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-4">
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    Official NPO Collaboration Hub
                  </span>
                  <span className="text-xs font-mono-tabular text-slate-500 dark:text-slate-400">
                    Learn · Create · Empower
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activePage === 'about' && (
          <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-10 space-y-6 sm:space-y-8">
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-6 lg:p-8 space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2 max-w-3xl">
                  <p className="text-xs font-medium uppercase tracking-wider text-[#4B756E] dark:text-[#8FB9B1]">
                    Official Constitution · {ORGANIZATION_IDENTITY.jurisdiction}
                  </p>
                  <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#2B2F36] dark:text-slate-100">
                    {ORGANIZATION_IDENTITY.displayName} Charter
                  </h1>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    Constituted as <strong className="text-[#2B2F36] dark:text-slate-100">{ORGANIZATION_IDENTITY.legalName}</strong>, a separate legal body corporate operating in the {ORGANIZATION_IDENTITY.jurisdiction}. Approved on {ORGANIZATION_IDENTITY.adoptedDate} and attested by Chairperson {ORGANIZATION_IDENTITY.signatoryChairperson}.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigatePage('governance')}
                  className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-[#2C3A57] hover:bg-[#222D45] dark:bg-[#3B4E73] dark:hover:bg-[#495F8B] hover:-translate-y-0.5 rounded-lg transition-all duration-150"
                >
                  <span>View Board & Governance</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1">
                    <Building2 className="w-3.5 h-3.5 text-[#2C3A57] dark:text-sky-300" />
                    <span>Legal Structure</span>
                  </div>
                  <p className="text-sm font-semibold text-[#2B2F36] dark:text-slate-100">
                    {ORGANIZATION_IDENTITY.legalNature}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1">
                    <BookOpenCheck className="w-3.5 h-3.5 text-[#68978F]" />
                    <span>Constitution Adopted</span>
                  </div>
                  <p className="text-sm font-semibold font-mono-tabular text-[#2B2F36] dark:text-slate-100">
                    {ORGANIZATION_IDENTITY.adoptedDate}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1">
                    <CalendarClock className="w-3.5 h-3.5 text-[#E8A735]" />
                    <span>Financial Year-End</span>
                  </div>
                  <p className="text-sm font-semibold font-mono-tabular text-[#2B2F36] dark:text-slate-100">
                    {ORGANIZATION_IDENTITY.financialYearEnd}
                  </p>
                </div>
              </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <section className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-6 space-y-4">
                <h2 className="font-display text-lg font-bold text-[#2B2F36] dark:text-slate-100">
                  10 Constitutional Objectives (Clause 3)
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {CONSTITUTIONAL_OBJECTIVES.map((obj) => (
                    <div
                      key={obj.clause}
                      className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[11px] font-mono-tabular text-slate-400">
                          Clause {obj.clause}
                        </span>
                        <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                          {PILLAR_META[obj.pillar].label}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-[#2B2F36] dark:text-slate-100">
                        {obj.title}
                      </p>
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        {obj.description}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="lg:col-span-5 space-y-6">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-6 space-y-3">
                  <div className="flex items-center gap-2">
                    <Scale className="w-4 h-4 text-[#2C3A57] dark:text-sky-300" />
                    <h2 className="font-display text-base font-bold text-[#2B2F36] dark:text-slate-100">
                      Body Corporate Powers (Clause 2)
                    </h2>
                  </div>
                  <ul className="space-y-2">
                    {BODY_CORPORATE_CLAUSES.map((clause, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed"
                      >
                        <CheckCircle2 className="w-4 h-4 text-[#68978F] shrink-0 mt-0.5" />
                        <span>{clause}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-6 space-y-3">
                  <h2 className="font-display text-base font-bold text-[#2B2F36] dark:text-slate-100">
                    Financial Controls & Asset Lock (Clauses 9–12)
                  </h2>
                  <div className="space-y-3">
                    {FINANCIAL_AND_CHARTER_SAFEGUARDS.map((item) => (
                      <div key={item.title} className="space-y-1">
                        <p className="text-xs font-semibold text-[#2B2F36] dark:text-slate-100">
                          {item.title}{' '}
                          <span className="font-mono-tabular font-normal text-slate-400">
                            ({item.clause})
                          </span>
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                          {item.summary}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </div>
          </div>
        )}

        {activePage === 'programmes' && (
          <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-10 space-y-6 sm:space-y-8">
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-6 lg:p-8 flex flex-wrap items-center justify-between gap-6">
              <div className="space-y-2 max-w-2xl">
                <p className="text-xs font-medium uppercase tracking-wider text-[#4B756E] dark:text-[#8FB9B1]">
                  Mission Pillars · Learn · Create · Empower
                </p>
                <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#2B2F36] dark:text-slate-100">
                  Community Programmes & Impact Areas
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Every workshop kit, pattern curriculum, mentorship hub, and community event aligns directly with our three strategic pillars and ten constitutional mandates.
                </p>
              </div>
              <button
                type="button"
                onClick={onSignIn}
                disabled={isSigningIn}
                className="cursor-pointer inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-[#2C3A57] hover:bg-[#222D45] dark:bg-[#3B4E73] dark:hover:bg-[#495F8B] hover:-translate-y-0.5 rounded-lg transition-all duration-150"
              >
                <span>Collaborate in Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </section>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {(['learn', 'create', 'empower'] as const).map((pillar) => {
                const meta = PILLAR_META[pillar];
                const matching = CONSTITUTIONAL_OBJECTIVES.filter(
                  (o) => o.pillar === pillar
                );
                return (
                  <section
                    key={pillar}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4"
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-3 h-3 rounded-sm shrink-0"
                        style={{ backgroundColor: meta.hex }}
                        aria-hidden="true"
                      />
                      <div>
                        <h2 className="font-display text-lg font-bold text-[#2B2F36] dark:text-slate-100">
                          {meta.label}
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {meta.subtitle}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                      {matching.map((obj) => (
                        <div key={obj.clause} className="space-y-1">
                          <p className="text-sm font-semibold text-[#2B2F36] dark:text-slate-100">
                            {obj.title}
                          </p>
                          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                            {obj.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        )}

        {activePage === 'governance' && (
          <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-10 space-y-6 sm:space-y-8">
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-6 lg:p-8 flex flex-wrap items-center justify-between gap-6">
              <div className="space-y-2 max-w-2xl">
                <p className="text-xs font-medium uppercase tracking-wider text-[#4B756E] dark:text-[#8FB9B1]">
                  Clauses 3–8 · Elected Leadership & Procedures
                </p>
                <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#2B2F36] dark:text-slate-100">
                  Board of Governance & Office Bearers
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Governed by an odd-numbered Board of at least 5 members serving 3-year renewable terms, supported by a Management Committee meeting monthly.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigatePage('about')}
                className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-[#2B2F36] dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <span>View Constitutional Objectives</span>
              </button>
            </section>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {BOARD_OFFICE_BEARERS.map((bearer) => (
                <article
                  key={bearer.clause}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs font-medium text-[#4B756E] dark:text-[#8FB9B1]">
                      {bearer.role}
                    </span>
                    <span className="text-[11px] font-mono-tabular text-slate-400">
                      Clause {bearer.clause}
                    </span>
                  </div>
                  <h2 className="font-display text-base font-bold text-[#2B2F36] dark:text-slate-100">
                    {bearer.name}
                  </h2>
                  <ul className="space-y-1.5">
                    {bearer.duties.map((duty, i) => (
                      <li
                        key={i}
                        className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed flex items-start gap-2"
                      >
                        <span className="text-slate-400 mt-0.5">•</span>
                        <span>{duty}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
                <h2 className="font-display text-base font-bold text-[#2B2F36] dark:text-slate-100">
                  Governance & Membership Rules
                </h2>
                <div className="space-y-3">
                  {GOVERNANCE_PROCEDURES.map((rule) => (
                    <div key={rule.title} className="space-y-1">
                      <p className="text-xs font-semibold text-[#2B2F36] dark:text-slate-100">
                        {rule.title}{' '}
                        <span className="font-mono-tabular font-normal text-slate-400">
                          ({rule.clause})
                        </span>
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        {rule.summary}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
                <h2 className="font-display text-base font-bold text-[#2B2F36] dark:text-slate-100">
                  Meetings, Quorums & Decision-Making
                </h2>
                <div className="space-y-3">
                  {MEETING_CADENCE_RULES.map((rule) => (
                    <div key={rule.title} className="space-y-1">
                      <p className="text-xs font-semibold text-[#2B2F36] dark:text-slate-100">
                        {rule.title}{' '}
                        <span className="font-mono-tabular font-normal text-slate-400">
                          ({rule.clause})
                        </span>
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        {rule.summary}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        )}

        {activePage === 'games' && (
          <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-10">
            <GamesSection />
          </div>
        )}
      </main>

      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-2 sm:gap-4 text-xs text-slate-500 dark:text-slate-400">
          <span>Shapes and Patterns NPO · Body Corporate (Republic of South Africa)</span>
          <span>Constitution Adopted 12 October 2026</span>
        </div>
      </footer>
    </div>
  );
}
