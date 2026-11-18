import type { Pillar } from '../types/workspace';

export interface ConstitutionalObjective {
  clause: string;
  title: string;
  pillar: Pillar;
  description: string;
}

export interface GovernanceBearer {
  clause: string;
  role: string;
  name: string;
  duties: string[];
}

export interface GovernanceRule {
  title: string;
  clause: string;
  summary: string;
}

export const ORGANIZATION_IDENTITY = {
  legalName: 'SHAPES AND PATTERNS',
  displayName: 'Shapes and Patterns NPO',
  tagline: 'Learn. Create. Empower.',
  jurisdiction: 'Republic of South Africa',
  legalNature: 'Body Corporate (Non-Profit Organisation)',
  adoptedDate: '12 October 2026',
  adoptedContext: 'Approved and accepted by members at a Special General Meeting',
  signatoryChairperson: 'K.A. Tlale',
  financialYearEnd: '31 March',
  boardTermYears: 3,
  minBoardMembers: 5,
  minManagementMembers: 3,
} as const;

export const BODY_CORPORATE_CLAUSES: string[] = [
  'Exists in its own legal right, independently and separately from its members.',
  'Maintains perpetual succession even when membership or office bearers change.',
  'Holds legal capacity to acquire, hold, and manage property in its own name.',
  'Can institute and defend legal proceedings in its own corporate name.',
];

export const CONSTITUTIONAL_OBJECTIVES: ConstitutionalObjective[] = [
  {
    clause: '3.1',
    title: 'Women Development',
    pillar: 'empower',
    description:
      'Advancing leadership, skills, and community support programmes tailored for women.',
  },
  {
    clause: '3.2',
    title: 'Youth Development',
    pillar: 'learn',
    description:
      'Equipping young people with foundational learning, mentorship, and constructive pathways.',
  },
  {
    clause: '3.3',
    title: 'Economic Empowerment',
    pillar: 'empower',
    description:
      'Expanding practical opportunities for financial inclusion, enterprise readiness, and local resilience.',
  },
  {
    clause: '3.4',
    title: 'Training and Education',
    pillar: 'learn',
    description:
      'Delivering structured workshops, geometric thinking curricula, and community skills training.',
  },
  {
    clause: '3.5',
    title: 'Healthcare Services',
    pillar: 'empower',
    description:
      'Facilitating access to community health initiatives, wellness education, and care support.',
  },
  {
    clause: '3.6',
    title: 'Programmes for Persons with Disabilities',
    pillar: 'empower',
    description:
      'Ensuring inclusive community participation, accessibility, and dedicated support programmes.',
  },
  {
    clause: '3.7',
    title: 'Programmes for the Elderly',
    pillar: 'empower',
    description:
      'Supporting dignity, social connection, and community care services for older adults.',
  },
  {
    clause: '3.8',
    title: 'Workplace Programmes',
    pillar: 'create',
    description:
      'Building practical vocational readiness, team capability, and supportive workplace initiatives.',
  },
  {
    clause: '3.9',
    title: 'Sustainable Livelihoods',
    pillar: 'create',
    description:
      'Fostering durable community-led projects and creative skills that sustain household wellbeing.',
  },
  {
    clause: '3.10',
    title: 'Events for Communities',
    pillar: 'create',
    description:
      'Hosting inclusive public workshops, showcases, and civic gatherings that unite neighbourhoods.',
  },
];

export const BOARD_OFFICE_BEARERS: GovernanceBearer[] = [
  {
    clause: '3.1.1.1',
    role: 'Chairperson',
    name: 'Kgothatso Tlale (K.A. Tlale)',
    duties: [
      'Convenes and presides over Board, Management Committee, and general meetings.',
      'Leads the committee and serves as official signatory of the organisation.',
      'Exercises a casting vote in the event of voting deadlocks.',
    ],
  },
  {
    clause: '3.1.1.2',
    role: 'Vice Chairperson',
    name: 'Jonas Nkwana',
    duties: [
      'Deputises for the Chairperson during their absence.',
      'Carries out governance and operational duties delegated by the Chairperson.',
    ],
  },
  {
    clause: '3.1.1.3',
    role: 'Secretary',
    name: 'Mahlatse Motau',
    duties: [
      'Maintains custody of all committee records, attendance registers, and confirmed minutes.',
      'Handles official correspondence and distributes meeting notices with agendas.',
    ],
  },
  {
    clause: '3.1.1.4',
    role: 'Assistant Secretary',
    name: 'Relebohile Jocobinah Thoko',
    duties: [
      'Assists the Secretary with record-keeping and correspondence tasks.',
      'Deputises for the Secretary during absence whenever required.',
    ],
  },
  {
    clause: '3.1.1.5',
    role: 'Treasurer',
    name: 'Prince Thulani Mabuza',
    duties: [
      'Safeguards organisational funds and ensures full financial accountability.',
      'Delivers regular Board financial reports covering incomes, expenditures, and balances.',
    ],
  },
  {
    clause: '3.1.1.6',
    role: 'Vice Treasurer',
    name: 'Nkululeko Nokeri',
    duties: [
      'Supports the Board across financial oversight and operational portfolios.',
      'Deputises across treasury and governance portfolios where necessary.',
    ],
  },
];

export const GOVERNANCE_PROCEDURES: GovernanceRule[] = [
  {
    clause: 'Clause 3.1 & 4.2',
    title: 'Board Composition & 3-Year Term',
    summary:
      'The Board of Governance comprises at least 5 members in an odd-numbered composition to prevent ties. Both Board members and Office Bearers serve 3-year terms and may stand for re-election.',
  },
  {
    clause: 'Clause 5',
    title: 'Membership Admission & AGM Participation',
    summary:
      'Prospective members apply through the Management Committee, which interviews candidates before admission. Members must attend Annual General Meetings to scrutinise organisational policy.',
  },
  {
    clause: 'Clause 6',
    title: 'Management Committee & Sub-Committees',
    summary:
      'A Management Committee of at least 3 office bearers meets monthly (simple majority quorum). Missing 3 consecutive meetings without leave triggers replacement. Sub-committees require at least 3 people including 1 Board member, with prior Board expenditure approval.',
  },
  {
    clause: 'Clause 7',
    title: 'Powers of the Organisation',
    summary:
      'Guided by General Meeting resolutions and South African law, the Board may raise funds, acquire or hire property, adopt by-laws, and delegate scoped tasks to sub-committees.',
  },
];

export const MEETING_CADENCE_RULES: GovernanceRule[] = [
  {
    clause: 'Clause 8.1 & 8.4',
    title: 'Annual General Meeting (AGM)',
    summary:
      'Held once annually near the 31 March financial year-end with at least 14 days written notice. Covers the Chairperson and Treasurer reports, previous minutes, policy review, constitutional amendments, and Board elections.',
  },
  {
    clause: 'Clause 8.2 & 8.4',
    title: 'Special General Meeting (SGM)',
    summary:
      'Convened with 14 days notice by the Board or at least one-third of members whenever urgent matters require a general membership mandate.',
  },
  {
    clause: 'Clause 8.3 & 8.4',
    title: 'Ordinary Quarterly Meetings',
    summary:
      'Ordinary member meetings and Board business meetings convene at least once per quarter, with Board notices issued at least 7 days in advance.',
  },
  {
    clause: 'Clause 8.5 – 8.8',
    title: 'Quorums, Consensus & Record-Keeping',
    summary:
      'Standard meetings require a 50% + 1 quorum (reconvened within 14 days if unmet after 15 minutes). Decisions prioritise consensus, then majority vote. Signed minutes are circulated 2–3 weeks before the next meeting and kept accessible to members.',
  },
];

export const FINANCIAL_AND_CHARTER_SAFEGUARDS: GovernanceRule[] = [
  {
    clause: 'Clause 9',
    title: 'Non-Profit Asset Lock',
    summary:
      'Income and property are strictly preserved for organisational objectives and may not be distributed to members or Board members, except reasonable payment for work performed or authorised expense reimbursement.',
  },
  {
    clause: 'Clause 10.1 – 10.2',
    title: 'Dual-Signatory Banking Controls',
    summary:
      'Funds are held in a registered bank account in the name of Shapes and Patterns. Withdrawals and financial instruments require at least two authorised signatures (Chairperson plus Treasurer and/or Secretary).',
  },
  {
    clause: 'Clause 10.3 – 10.7',
    title: '31 March Year-End & Independent Reporting',
    summary:
      'The financial year ends on 31 March. Within 6 months of year-end, an independent registered Accounting Officer compiles a financial compliance report. Surplus funds may only be invested with registered South African financial institutions.',
  },
  {
    clause: 'Clause 11 & 12',
    title: 'Two-Thirds Protection on Amendments & Dissolution',
    summary:
      'Amending the constitution or dissolving the organisation requires a two-thirds (67%) member quorum and two-thirds resolution with 14 days notice. Upon dissolution after settling debts, remaining assets transfer strictly to another non-profit organisation with similar objectives.',
  },
];
