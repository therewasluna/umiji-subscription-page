import { NextFunction, Request, Response } from 'express';

// Subscription links from other panels, rewritten to /<id>[/<clientType>] so a user's app keeps updating
// after the move to Umiji. The migration tool (umiji/migrate.mjs) keeps each user's old link id as their
// Short UUID: the 3x-ui subId, the Marzneshin key, the Hiddify uuid, the Remnawave Short UUID. Marzban and
// PasarGuard tokens land here as the id too, and MarzbanMiddleware decodes them.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KEY = /^[0-9a-f]{32}$/i;

// Old panels' client types to Umiji's; anything else lets the app's User-Agent decide.
const CLIENT_TYPES: Record<string, string> = {
    'sing-box': 'singbox',
    singbox: 'singbox',
    'clash-meta': 'mihomo',
    clashmeta: 'mihomo',
    mihomo: 'mihomo',
    clash: 'clash',
    'v2ray-json': 'json',
    xray: 'json',
    json: 'json',
    stash: 'stash',
};

const clientType = (s: string | undefined): string | undefined => {
    if (!s) return undefined;
    const t = s.toLowerCase();
    if (CLIENT_TYPES[t]) return CLIENT_TYPES[t];
    // Hiddify names its formats like full-singbox.json, clash/meta or xray/.
    if (t.includes('singbox')) return 'singbox';
    if (t.includes('meta')) return 'mihomo';
    if (t.includes('clash')) return 'clash';
    return undefined;
};

// extraPaths: "path" or "path:type", e.g. a 3x-ui install's random subPath, subJsonPath:json, subClashPath:mihomo.
export function legacyLinksMiddleware(prefix: string | undefined, extraPaths: string[]) {
    // sub is Marzban's, PasarGuard's, Marzneshin's and 3x-ui's default; json and clash are 3x-ui's.
    const paths = new Map<string, string | undefined>([
        ['sub', undefined],
        ['json', 'json'],
        ['clash', 'mihomo'],
    ]);
    for (const entry of extraPaths) {
        const [p, t] = entry.split(':');
        paths.set(p, clientType(t));
    }

    return (req: Request, _res: Response, next: NextFunction) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') return next();
        const q = req.url.indexOf('?');
        const s = (q === -1 ? req.url : req.url.slice(0, q)).split('/').filter(Boolean);
        let id: string | undefined;
        let type: string | undefined;

        if (s.length >= 3 && s.length <= 4 && s[0] === 'api' && s[1] === 'sub' && s[0] !== prefix) {
            // Remnawave without its own sub page: /api/sub/<shortUuid>[/<client type>]
            id = s[2];
            type = clientType(s[3]);
        } else if (s.length >= 3 && s.length <= 4 && s[0] === 'sub' && KEY.test(s[2])) {
            // Marzneshin: /sub/<username>/<key>[/<client type>]
            id = s[2];
            type = clientType(s[3]);
        } else if (s.length >= 2 && UUID.test(s[1]) && s[0] !== prefix) {
            // Hiddify: /<client path>/<uuid>/[<format>…]
            id = s[1];
            type = clientType(s.slice(2).join('/'));
        } else if (s.length >= 2 && s.length <= 3 && paths.has(s[0]) && s[0] !== prefix) {
            // Marzban, PasarGuard, 3x-ui: /<path>/<token or subId>[/<client type>]
            id = s[1];
            type = paths.get(s[0]) ?? clientType(s[2]);
        }

        if (id) {
            req.url = `${prefix ? `/${prefix}` : ''}/${id}${type ? `/${type}` : ''}${q === -1 ? '' : req.url.slice(q)}`;
        }
        next();
    };
}
