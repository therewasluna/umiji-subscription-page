## Umiji Subscription Page

The page your users open from their subscription link in [Umiji](https://github.com/therewasluna/umiji). It shows
their usage and how to set up their apps, and serves the subscription itself.

Deploy it with the panel's deploy kit (`tools/deploy.sh` in [umiji-backend](https://github.com/therewasluna/umiji-backend),
see its `DEPLOY.md`). To only build the image (needs Docker and Node 24+): `./tools/build-image.sh`.

Leave `SUBPAGE_CONFIG_UUID` unset (or at the all-zero default): if it points at one config, every user gets that
page and brokers' pages are never used.

### Development

No image build needed. It needs the panel running, and `backend/.env` with `APP_PORT=3010`, `UMIJI_PANEL_URL`,
`UMIJI_API_TOKEN`, `INTERNAL_JWT_SECRET` and `TRUST_PROXY=1`.

```
cd backend  && mkdir -p dev_frontend/assets && ln -sf ../../frontend/index.html dev_frontend/index.html && npm run dev
cd frontend && npm run start:dev
```

Open `http://127.0.0.1:3334/<shortUuid>`: it shows that user's real data, and edits to the page appear live.

### Live config updates

The page re-reads configs from the panel: each one is cached for 2 seconds, unknown ones are fetched on first
use, and if the panel can't be reached the last good config keeps being served. Edits show the next time a
user opens the page. This is handled in `backend/src/modules/webpage/webpage.service.ts`.

### Panel on another server, behind a proxy

If the subscription page's server can't reach the panel directly, set `UMIJI_PANEL_PROXY` in `.env`.
All requests to the panel (configs, user info, subscriptions) then go through it. Format is
`protocol://user:password@host:port`, with `http`, `https`, `socks4` or `socks5`, for example
`socks5://127.0.0.1:1080`. It's the same format as the panel's `TELEGRAM_BOT_PROXY`. Inside Docker,
`127.0.0.1` is the container itself: use the proxy container's name on `umiji-network`, or the host's
address. If the proxy is down, the page won't start (it never falls back to a direct connection).
Leave it empty to connect directly.

## License

AGPL-3.0, see [LICENCE](LICENCE). Umiji is a modified version of Remnawave.
