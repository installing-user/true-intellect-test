'use client';

import { type KeyboardEvent, type PointerEvent, useEffect, useRef, useState } from 'react';
import { LABEL_GAP, PAD, TIP } from './config';
import { format, long, niceTicks, short } from './lib';
import './chart.css';

export interface ChartPoint {
  date: string;
  value: number;
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

  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const ticks = niceTicks(min, max);
  const lo = ticks[0];
  const hi = ticks[ticks.length - 1];
  const first = points[0].date;
  const last = points[points.length - 1].date;
  const height = width < 500 ? 260 : 360;
  const left = Math.max(...ticks.map((tick) => format(tick).length)) * 7 + 14;
  const plotWidth = Math.max(0, width - left - PAD.right);
  const plotHeight = height - PAD.top - PAD.bottom;
  const x = (index: number) => left + (points.length > 1 ? (index * plotWidth) / (points.length - 1) : plotWidth / 2);
  const y = (value: number) => PAD.top + plotHeight - ((value - lo) * plotHeight) / (hi - lo || 1);
  const labelEvery = Math.ceil((LABEL_GAP * (points.length - 1)) / (plotWidth || 1)) || 1;
  const bottom = PAD.top + plotHeight;
  const line = points
    .map((point, index) => `${index ? 'L' : 'M'}${x(index).toFixed(1)},${y(point.value).toFixed(1)}`)
    .join('');
  const seriesKey = `${label}|${values.join(',')}`;
  const current = active === null ? null : points[active];

  function pick(event: PointerEvent<SVGSVGElement>) {
    const offset = event.clientX - event.currentTarget.getBoundingClientRect().left - left;
    const index = Math.round((offset / (plotWidth || 1)) * (points.length - 1));

    setActive(Math.min(points.length - 1, Math.max(0, index)));
  }

  function onKeyDown(event: KeyboardEvent<SVGSVGElement>) {
    const moves: Record<string, number> = {
      ArrowLeft: Math.max(0, (active ?? points.length) - 1),
      ArrowRight: Math.min(points.length - 1, (active ?? -1) + 1),
      Home: 0,
      End: points.length - 1,
    };

    if (event.key === 'Escape') setActive(null);
    else if (event.key in moves) {
      event.preventDefault();
      setActive(moves[event.key]);
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
          onFocus={(event) =>
            event.currentTarget.matches(':focus-visible') && setActive((prev) => prev ?? points.length - 1)
          }
          onBlur={() => setActive(null)}
        >
          {ticks.map((tick) => (
            <g key={tick}>
              <line className="chart-grid" x1={left} x2={width - PAD.right} y1={y(tick)} y2={y(tick)} />
              <text className="chart-tick" x={left - 10} y={y(tick) + 4} textAnchor="end">
                {format(tick)}
              </text>
            </g>
          ))}
          {points.map(
            (point, index) =>
              index % labelEvery === 0 &&
              x(index) < width - PAD.right - 12 && (
                <text
                  key={point.date}
                  className="chart-tick"
                  x={x(index)}
                  y={height - 6}
                  textAnchor={index ? 'middle' : 'start'}
                >
                  {short(point.date)}
                </text>
              ),
          )}
          <path
            key={`a${seriesKey}`}
            className="chart-area"
            d={`${line}L${x(points.length - 1)},${bottom}L${x(0)},${bottom}Z`}
          />
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
