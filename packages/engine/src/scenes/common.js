export function fgColor(tokens) {
    return tokens.palette[2] ?? tokens.palette[0];
}
export function accentColor(tokens) {
    return tokens.palette[1] ?? tokens.palette[0];
}
export function stageBg(tokens) {
    return tokens.stageBg ?? tokens.palette[0];
}
export function fontFor(role, tokens) {
    return role === 'display' ? tokens.fontDisplay : tokens.fontBody;
}
export function bgCss(bg, tokens) {
    if (!bg)
        return 'transparent';
    if (bg.type === 'solid')
        return bg.color;
    return `linear-gradient(${bg.angle}deg, ${bg.from}, ${bg.to})`;
}
export function hexA(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
export function escapeHtml(s) {
    return s
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;');
}
