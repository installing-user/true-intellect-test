'use client';

import { useState } from 'react';
import { type Counter, counters, counterUnits, isCounter, useAnalytics } from '@/entities/analytics';
import { type Branch, useBranches } from '@/entities/branch';
import { useCompanies } from '@/entities/company';
import { useSession } from '@/entities/session';
import { CompanyField, CompanyOptions } from '@/features/select-company';
import { plural, pluralForm, shiftDate, useUrlFilters } from '@/shared/lib';
import type { PluralForms } from '@/shared/lib';
import { LineChart } from '@/shared/ui/chart';
import { DataState, StateMessage } from '@/shared/ui/data-state';
import { DatePicker } from '@/shared/ui/date-picker';
import { Icon } from '@/shared/ui/icon';
import { Panel, PanelHead } from '@/shared/ui/panel';
import { Select } from '@/shared/ui/select';
import { BranchesSkeleton, ChartSkeleton, MetricsSkeleton } from './DashboardSkeleton';
import './dashboard.css';

const companyForms: PluralForms = ['компания', 'компании', 'компаний'];
const branchForms: PluralForms = ['филиал', 'филиала', 'филиалов'];
const presets = [7, 30, 90];
const MIN_DAY = '2000-01-01';
const MAX_DAY = '2100-12-31';

export function Dashboard() {
  const user = useSession();
  const { params, update } = useUrlFilters();
  const [companyOpen, setCompanyOpen] = useState(false);
  const companyId = params.get('companyId');
  const branchId = params.get('branchId');
  const from = params.get('from');
  const to = params.get('to');
  const metricParam = params.get('metric');
  const metric: Counter = isCounter(metricParam) ? metricParam : 'views';
  const isAdmin = user.role === 'admin';

  const companies = useCompanies(isAdmin);
  const allBranches = useBranches({ companyId: null, enabled: isAdmin });
  const scopedBranches = useBranches({ companyId, enabled: !isAdmin || companyId !== null });
  const branches = isAdmin && companyId === null ? allBranches : scopedBranches;
  const analytics = useAnalytics({ companyId, branchId, from, to });

  const period = analytics.data?.period;
  const today = new Date().toISOString().slice(0, 10);
  const activeFrom = from ?? period?.from;
  const activeTo = to ?? period?.to;
  const selectedCompany = companies.data?.find((c) => String(c.id) === companyId);

  function choosePreset(days: number) {
    const end = to ?? period?.to ?? today;
    update({ from: shiftDate(end, 1 - days), to: end });
  }

  function resetFilters() {
    update({ companyId: null, branchId: null, from: null, to: null });
  }

  function chooseCompany(id: string | null) {
    update({ companyId: id, branchId: null });
    setCompanyOpen(false);
  }

  function branchRow(b: Branch) {
    const selected = String(b.id) === branchId;
    return (
      <li key={b.id}>
        <button type="button" className="dash-row" aria-pressed={selected} onClick={() => update({ branchId: String(b.id) })}>
          <span className="dash-row-text">
            <span className="dash-row-name">{b.name}</span>
            <span className="dash-row-sub">{b.address}</span>
          </span>
          {selected && <Icon name="check" size={20} />}
        </button>
      </li>
    );
  }

  const grouped = isAdmin && !companyId && companies.data;

  return (
    <div className="dash stagger">
      <Panel as="section" aria-label="Фильтры">
        <PanelHead>
          <h2>Фильтры</h2>
        </PanelHead>
        <div className="dash-fields">
          {isAdmin && (
            <div className="field dash-field-company">
              <CompanyField
                label={selectedCompany?.name ?? 'Все компании'}
                open={companyOpen}
                disabled={!companies.data}
                onToggle={() => setCompanyOpen((open) => !open)}
              >
                {companies.data && (
                  <CompanyOptions
                    open={companyOpen}
                    companies={companies.data}
                    selectedId={companyId}
                    allHint={
                      allBranches.data && `${plural(companies.data.length, companyForms)} · ${plural(allBranches.data.length, branchForms)}`
                    }
                    hint={(c) => {
                      const count = allBranches.data?.filter((b) => b.companyId === c.id).length;
                      return count === undefined ? undefined : plural(count, branchForms);
                    }}
                    onSelect={chooseCompany}
                    onClose={() => setCompanyOpen(false)}
                  />
                )}
              </CompanyField>
            </div>
          )}
          <Select
            className="dash-field-branch"
            label="Филиал"
            value={branchId ?? ''}
            onChange={(value) => update({ branchId: value })}
            disabled={!branches.data}
            options={[{ value: '', label: 'Все филиалы' }, ...(branches.data ?? []).map((b) => ({ value: String(b.id), label: b.name }))]}
          />
          <DatePicker
            className="dash-field-date"
            label="С"
            value={activeFrom ?? ''}
            min={MIN_DAY}
            max={activeTo ?? MAX_DAY}
            anchor={activeTo}
            loading={!activeFrom && analytics.loading}
            onCommit={(value) => update({ from: value })}
          />
          <DatePicker
            className="dash-field-date"
            label="По"
            value={activeTo ?? ''}
            min={activeFrom ?? MIN_DAY}
            max={MAX_DAY}
            anchor={activeFrom}
            loading={!activeTo && analytics.loading}
            onCommit={(value) => update({ to: value })}
          />
          <div className="dash-presets" role="group" aria-label="Готовый период">
            {presets.map((days) => (
              <button
                key={days}
                type="button"
                aria-pressed={activeFrom !== undefined && activeTo !== undefined && shiftDate(activeTo, 1 - days) === activeFrom}
                onClick={() => choosePreset(days)}
              >
                {days} дней
              </button>
            ))}
          </div>
        </div>
      </Panel>

      <section className="dash-summary" aria-labelledby="summary-title">
        <h2 id="summary-title" className="sr-only">
          Показатели
        </h2>
        <DataState
          state={analytics}
          notFound={branchId ? 'Филиал не найден' : 'Компания не найдена'}
          onReset={resetFilters}
          skeleton={<MetricsSkeleton />}
        >
          {(data) => (
            <ul className="dash-metrics stagger">
              {Object.entries(counters).map(([key, title]) => (
                <Panel as="li" key={key} className="dash-metric">
                  <span className="dash-metric-title">{title}</span>
                  <span key={data.summary[key as Counter]} className="dash-metric-value rise">
                    {data.summary[key as Counter].toLocaleString('ru-RU')}
                  </span>
                </Panel>
              ))}
              <Panel as="li" className="dash-metric">
                <span className="dash-metric-title">Средний рейтинг</span>
                <span key={data.summary.avgRating} className="dash-metric-value rise">
                  {data.summary.avgRating?.toLocaleString('ru-RU') ?? '—'}
                </span>
              </Panel>
              <Panel as="li" className="dash-metric">
                <span className="dash-metric-title">Отзывы</span>
                <span key={data.summary.reviewsCount} className="dash-metric-value rise">
                  {data.summary.reviewsCount.toLocaleString('ru-RU')}
                </span>
              </Panel>
            </ul>
          )}
        </DataState>
      </section>

      <div className="dash-main">
        <Panel as="section" aria-labelledby="chart-title">
          <PanelHead>
            <h2 id="chart-title">Динамика</h2>
            <Select
              className="dash-metric-select"
              label="Показатель"
              value={metric}
              onChange={(value) => update({ metric: value === 'views' ? null : value })}
              options={Object.entries(counters).map(([key, title]) => ({ value: key, label: title }))}
            />
          </PanelHead>
          <DataState
            state={analytics}
            notFound={branchId ? 'Филиал не найден' : 'Компания не найдена'}
            onReset={resetFilters}
            skeleton={<ChartSkeleton />}
          >
            {(data) =>
              data.timeseries.some((d) => d[metric] > 0) ? (
                <LineChart
                  label={counters[metric]}
                  points={data.timeseries.map((d) => ({ date: d.date, value: d[metric] }))}
                  unit={(n) => pluralForm(n, counterUnits[metric])}
                />
              ) : (
                <StateMessage>Нет данных за период</StateMessage>
              )
            }
          </DataState>
        </Panel>

        <Panel as="section" aria-labelledby="branches-title">
          <PanelHead>
            <h2 id="branches-title">Филиалы</h2>
          </PanelHead>
          <DataState state={branches} notFound="Компания не найдена" skeleton={<BranchesSkeleton />}>
            {(data) =>
              data.length === 0 ? (
                <StateMessage>Филиалов нет</StateMessage>
              ) : grouped ? (
                <div className="dash-groups">
                  {companies.data!.map((c) => {
                    const items = data.filter((b) => b.companyId === c.id);
                    return (
                      items.length > 0 && (
                        <div key={c.id} className="dash-group">
                          <h3>
                            <span>{c.name}</span>
                            <span>{plural(items.length, branchForms)}</span>
                          </h3>
                          <ul className="dash-list">{items.map(branchRow)}</ul>
                        </div>
                      )
                    );
                  })}
                </div>
              ) : (
                <ul className="dash-list">{data.map(branchRow)}</ul>
              )
            }
          </DataState>
        </Panel>
      </div>
    </div>
  );
}
