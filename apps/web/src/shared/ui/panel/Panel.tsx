import type { ComponentPropsWithoutRef, ElementType } from 'react';
import './panel.css';

type PanelProps = ComponentPropsWithoutRef<'div'> & { as?: ElementType };

export function Panel({ as: Tag = 'div', className, ...props }: PanelProps) {
  return <Tag className={className ? `panel ${className}` : 'panel'} {...props} />;
}

export function PanelHead(props: ComponentPropsWithoutRef<'div'>) {
  return <div className="panel-head" {...props} />;
}
