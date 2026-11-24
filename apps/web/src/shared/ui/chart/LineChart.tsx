'use client';

import { type KeyboardEvent, type PointerEvent, useEffect, useRef, useState } from 'react';
import { formatDate } from '@/shared/lib';
import './chart.css';

export interface ChartPoint {
  date: string;
  value: number;
}

const MONTHS = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
const PAD = { right: 12, top: 14, bottom: 28 };
const LABEL_GAP = 64;
const TIP = { width: 176, height: 58, gap: 14 };

const parse = (date: string) => new Date(`${date}T00:00:00Z`);
const short = (date: string) => `${parse(date).getUTCDate()} ${MONTHS[parse(date).getUTCMonth()]}`;
const long = formatDate;
const format = (v: number) => v.toLocaleString('ru-RU');

function niceTicks(min: number, max: number): number[] {
  const raw = Math.max(1, (max - min) / 5);
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = ([1, 2, 2.5, 5, 10].find((s) => s * magnitude >= raw) ?? 10) * magnitude;
  const ticks: number[] = [];
  for (let t = Math.floor(min / step) * step; t < max + step; t += step) {
    ticks.push(t);
    if (t >= max) break;
  }
  return ticks;
}

export function LineChart({
  points,
  label,
  unit,
}: {
  points: ChartPoint[];
  label: string;
  unit: (value: number) => string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const ticks = niceTicks(min, max);
  const lo = ticks[0];
  const hi = ticks[ticks.length - 1];
  const first = points[0].date;
  const last = points[points.length - 1].date;
  const height = width < 500 ? 260 : 360;
  const left = Math.max(...ticks.map((t) => format(t).length)) * 7 + 14;
  const plotWidth = Math.max(0, width - left - PAD.right);
  const plotHeight = height - PAD.top - PAD.bottom;
  const x = (i: number) => left + (points.length > 1 ? (i * plotWidth) / (points.length - 1) : plotWidth / 2);
  const y = (v: number) => PAD.top + plotHeight - ((v - lo) * plotHeight) / (hi - lo || 1);
  const labelEvery = Math.ceil((LABEL_GAP * (points.length - 1)) / (plotWidth || 1)) || 1;
  const bottom = PAD.top + plotHeight;
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join('');
  const seriesKey = `${label}|${values.join(',')}`;
  const current = active === null ? null : points[active];

  function pick(e: PointerEvent<SVGSVGElement>) {
    const offset = e.clientX - e.currentTarget.getBoundingClientRect().left - left;
    const index = Math.round((offset / (plotWidth || 1)) * (points.length - 1));
    setActive(Math.min(points.length - 1, Math.max(0, index)));
  }

  function onKeyDown(e: KeyboardEvent<SVGSVGElement>) {
    const moves: Record<string, number> = {
      ArrowLeft: Math.max(0, (active ?? points.length) - 1),
      ArrowRight: Math.min(points.length - 1, (active ?? -1) + 1),
      Home: 0,
      End: points.length - 1,
    };
    if (e.key === 'Escape') setActive(null);
    else if (e.key in moves) {
      e.preventDefault();
      setActive(moves[e.key]);
    }
  }

  return (
    <div ref={box} className="chart">
      {width > 0 && (
        <svg
          viewBox={`0 0 ${width} ${height}`}
          width={width}
          height={height}
          role="img"
          tabIndex={0}
          aria-label={`${label} по дням: от ${format(min)} до ${format(max)}, ${long(first)} — ${long(last)}`}
          onPointerMove={pick}
          onPointerDown={pick}
          onPointerLeave={() => setActive(null)}
          onKeyDown={onKeyDown}
          onFocus={(e) => e.currentTarget.matches(':focus-visible') && setActive((a) => a ?? points.length - 1)}
          onBlur={() => setActive(null)}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line className="chart-grid" x1={left} x2={width - PAD.right} y1={y(t)} y2={y(t)} />
              <text className="chart-tick" x={left - 10} y={y(t) + 4} textAnchor="end">
                {format(t)}
              </text>
            </g>
          ))}
          {points.map(
            (p, i) =>
              i % labelEvery === 0 &&
              x(i) < width - PAD.right - 12 && (
                <text key={p.date} className="chart-tick" x={x(i)} y={height - 6} textAnchor={i ? 'middle' : 'start'}>
                  {short(p.date)}
                </text>
              ),
          )}
          <path key={`a${seriesKey}`} className="chart-area" d={`${line}L${x(points.length - 1)},${bottom}L${x(0)},${bottom}Z`} />
          <path key={`l${seriesKey}`} className="chart-line" pathLength={1} d={line} />
          {current && active !== null && (
            <g className="chart-pop">
              <line className="chart-cursor" x1={x(active)} x2={x(active)} y1={PAD.top} y2={bottom} />
              <circle className="chart-point" cx={x(active)} cy={y(current.value)} r={7} />
              {(() => {
                const toLeft = x(active) - TIP.width - TIP.gap >= 0;
                const tx = toLeft ? x(active) - TIP.width - TIP.gap : x(active) + TIP.gap;
                return (
                  <g>
                    <rect className="chart-tip" x={tx} y={PAD.top} width={TIP.width} height={TIP.height} rx={12} />
                    <text className="chart-tip-date" x={tx + 14} y={PAD.top + 22}>
                      {long(current.date)}
                    </text>
                    <text className="chart-tip-value" x={tx + 14} y={PAD.top + 44}>
                      {format(current.value)} <tspan className="chart-tip-unit">{unit(current.value)}</tspan>
                    </text>
                  </g>
                );
              })()}
            </g>
          )}
        </svg>
      )}
      <span className="sr-only" aria-live="polite">
        {current && `${long(current.date)}: ${format(current.value)} ${unit(current.value)}`}
      </span>
    </div>
  );
}
