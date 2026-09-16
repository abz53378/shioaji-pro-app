// src/components/watchlist-import-dialog.css.ts — batch import modal styles.

import { globalStyle, style } from '@vanilla-extract/css';
import { vars } from '../theme.css';

export const overlay = style({
    position: 'fixed',
    inset: 0,
    zIndex: 2200,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: vars.space.md,
    background: 'rgba(0, 0, 0, 0.45)',
});

export const dialog = style({
    display: 'flex',
    flexDirection: 'column',
    width: 'min(34rem, 94vw)',
    maxHeight: 'min(44rem, 92vh)',
    background: vars.color.panelRaised,
    border: `1px solid ${vars.color.borderBright}`,
    borderRadius: vars.radius.lg,
    boxShadow: '0 24px 64px rgba(0, 0, 0, 0.5)',
    overflow: 'hidden',
});

export const header = style({
    padding: `${vars.space.md} ${vars.space.lg}`,
    fontFamily: vars.font.display,
    fontSize: '0.88rem',
    fontWeight: 600,
    color: vars.color.foreground,
});

export const subtitle = style({
    marginTop: '3px',
    fontFamily: vars.font.body,
    fontSize: '0.72rem',
    fontWeight: 400,
    color: vars.color.mutedForeground,
});

export const body = style({
    display: 'flex',
    flexDirection: 'column',
    gap: vars.space.sm,
    minHeight: 0,
    overflowY: 'auto',
    padding: `0 ${vars.space.lg} ${vars.space.md}`,
});

export const exampleLabel = style({
    fontSize: '0.72rem',
    fontWeight: 600,
    color: vars.color.mutedForeground,
});

export const example = style({
    margin: 0,
    padding: vars.space.sm,
    overflowX: 'auto',
    border: `1px solid ${vars.color.border}`,
    borderRadius: vars.radius.sm,
    background: vars.color.inset,
    color: vars.color.foreground,
    fontFamily: vars.font.mono,
    fontSize: '0.68rem',
    lineHeight: 1.45,
});

export const fileRow = style({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: vars.space.sm,
    minWidth: 0,
    padding: `${vars.space.sm} ${vars.space.md}`,
    border: `1px solid ${vars.color.border}`,
    borderRadius: vars.radius.sm,
    color: vars.color.foreground,
    fontSize: '0.76rem',
    cursor: 'pointer',
});

globalStyle(`${fileRow} > span`, {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
});

globalStyle(`${fileRow} > input`, {
    maxWidth: '9rem',
    color: vars.color.mutedForeground,
    fontSize: '0.68rem',
});

export const error = style({
    padding: vars.space.sm,
    border: `1px solid ${vars.color.danger}`,
    borderRadius: vars.radius.sm,
    color: vars.color.danger,
    fontSize: '0.74rem',
});

const summary = {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '5px',
    padding: vars.space.sm,
    borderRadius: vars.radius.sm,
    fontSize: '0.74rem',
};

export const summaryOk = style({
    ...summary,
    border: `1px solid ${vars.color.success}`,
    color: vars.color.success,
});

export const summaryWarn = style({
    ...summary,
    border: `1px solid ${vars.color.amber}`,
    color: vars.color.foreground,
});

export const refreshWarning = style({
    color: vars.color.amber,
    fontWeight: 600,
});

export const failures = style({
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    maxHeight: '9rem',
    margin: 0,
    padding: `0 0 0 ${vars.space.md}`,
    overflowY: 'auto',
    color: vars.color.mutedForeground,
});

globalStyle(`${failures} li`, { paddingRight: vars.space.sm });
globalStyle(`${failures} strong`, { color: vars.color.foreground });
globalStyle(`${failures} span`, { display: 'block', marginTop: '1px' });

export const moreFailures = style({
    color: vars.color.mutedForeground,
});

export const footer = style({
    display: 'flex',
    gap: vars.space.sm,
    padding: `${vars.space.md} ${vars.space.lg}`,
    borderTop: `1px solid ${vars.color.border}`,
});

export const cancelBtn = style({
    flex: 1,
    padding: '8px 0',
    border: `1px solid ${vars.color.border}`,
    borderRadius: vars.radius.sm,
    background: vars.color.muted,
    color: vars.color.foreground,
    fontFamily: vars.font.display,
    fontSize: '0.78rem',
    fontWeight: 600,
    cursor: 'pointer',
});

export const importBtn = style({
    flex: 2,
    padding: '8px 0',
    border: 'none',
    borderRadius: vars.radius.sm,
    background: vars.color.accent,
    color: '#fff',
    fontFamily: vars.font.display,
    fontSize: '0.78rem',
    fontWeight: 700,
    cursor: 'pointer',
    ':disabled': {
        cursor: 'default',
        opacity: 0.55,
    },
});
