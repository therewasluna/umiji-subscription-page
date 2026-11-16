# Installing the Umiji sub page

The sub page is what your users open from their subscription link: their usage, how to set up their apps, and the
subscription itself. It has its own install, in `/opt/umiji-sub`, either on the panel's server or on a server of its
own. Everything runs in Docker; every command here runs on the server that will run the sub page.

## The quick way: the installer

The installer sets up the panel and the sub page together. On a server of its own, with an API token from the panel
(step 1 below), run it as root with `sub` at the end:

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/therewasluna/umiji/main/install.sh) sub
```

It installs Docker if it's missing, asks for the sub page's domain, the panel's domain and the token, and checks the
token against the panel. At the end it prints the commands to run on the panel's server, the same ones as step 4.
It also adds the `umiji` command: type `umiji` on that server later to update the sub page or uninstall it. The
rest of this guide does the same by hand.

## 1. Before you start

- **The panel is installed**: [umiji-backend: DEPLOY.md](https://github.com/therewasluna/umiji-backend/blob/main/DEPLOY.md).
- **The sub page's domain** (`SUB_DOMAIN` in the panel's `.env`) points at the server that will run it.
- **An API token**: in the panel, **Umiji Settings → API Tokens → Create API token**, pick the **Subpage** preset and
  press **Create**. Copy it: it's shown only once.
- **Docker**, on its own server: `curl -fsSL https://get.docker.com | sh`. The panel's server already has it.

## 2. Get the files

```bash
mkdir -p /opt/umiji-sub/caddy && cd /opt/umiji-sub
base=https://raw.githubusercontent.com/therewasluna/umiji-subscription-page/main/deploy
curl -fsSL -o docker-compose.yml $base/docker-compose.yml
curl -fsSL -o caddy/Caddyfile    $base/caddy/Caddyfile
curl -fsSL -o .env               $base/env.example
chmod 600 .env
```

Then open the settings file:

```bash
nano .env
```

## 3. Fill in `.env`

| Setting            | On the panel's server                        | On its own server                    |
| ------------------ | -------------------------------------------- | ------------------------------------ |
| `SUB_DOMAIN`       | `sub.example.com`                            | `sub.example.com`                    |
| `UMIJI_PANEL_URL`  | `http://umiji:3000`                          | `https://panel.example.com`          |
| `UMIJI_API_TOKEN`  | the token                                    | the token                            |
| `COMPOSE_PROFILES` | empty: the panel's Caddy serves the sub page | `caddy`, or empty for your own nginx |

Optional settings go in the same file; [`.env.sample`](.env.sample) lists them. The one you might need:
`UMIJI_PANEL_PROXY`, when this server can't reach the panel directly (see the [README](README.md)).

## 4. Start it

```bash
cd /opt/umiji-sub
docker compose up -d
docker compose ps
```

On the panel's server, Docker warns that `a network with name umiji-network exists`. That's expected: the sub page
joins the panel's network, so the two reach each other by name.

**On its own server**, also tell the panel. On the panel's server, in `/opt/umiji/.env`, set `SUB_PAGE_HERE=no` and
`SUB_PAGE_IP=` this server's IP, then run `docker compose up -d` there. The panel then trusts the visitor IPs this
server passes on, and nobody else's. With the panel behind nginx, use the commented line in its `map` instead.

## 5. Check it

Create a user in the panel and open their subscription link: `https://sub.example.com/<id>` should show the page.
`https://sub.example.com/` on its own doesn't load. That's normal: the sub page drops any request that isn't a real
subscription link.

## HTTPS

**Built-in Caddy** (`COMPOSE_PROFILES=caddy`, on its own server) reads the domain from `.env`, gets and renews the
certificate itself, and needs ports 80 and 443 open and free. Watch it with `docker compose logs -f umiji-sub-caddy`.
Behind a CDN, remove the `#` from the six lines at the top of `caddy/Caddyfile`, list the CDN's IP ranges
(https://www.cloudflare.com/ips/) and run `docker compose restart umiji-sub-caddy`. Set Cloudflare's SSL mode to
**Full (strict)** and turn off **Always Use HTTPS**.

### Your own nginx

Make `.env` say `COMPOSE_PROFILES=` and run `docker compose up -d`. The sub page listens on `127.0.0.1:3010`. Add
this to your nginx config (on the panel's server, the same file as the panel's block), then run
`certbot --nginx -d sub.example.com`:

```nginx
server {
    listen 80;
    server_name sub.example.com;

    location / {
        proxy_pass http://127.0.0.1:3010;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

The sub page takes the visitor's IP from the last `X-Forwarded-For` entry, the one nginx adds. Behind a CDN, add the
`set_real_ip_from` lines from the panel guide's
[Behind a CDN](https://github.com/therewasluna/umiji-backend/blob/main/DEPLOY.md#behind-a-cdn) part. nginx in a
container: join it to `umiji-network` and use `http://umiji-subscription-page:3010`.

## Everyday use

```bash
cd /opt/umiji-sub
docker compose pull && docker compose up -d && docker image prune -f   # update
nano .env && docker compose up -d                                      # change a setting
docker compose logs -f umiji-subscription-page                         # logs (Ctrl+C to stop)
```

## Troubleshooting

| Problem                                                 | Fix                                                                                                                                               |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| The sub page keeps restarting                           | `UMIJI_API_TOKEN` is empty or wrong, or `UMIJI_PANEL_URL` is wrong. The log says which: `docker compose logs umiji-subscription-page`.            |
| `umiji-sub-caddy` won't start: `address already in use` | On the panel's server the panel's Caddy has ports 80 and 443: make `.env` say `COMPOSE_PROFILES=`. Elsewhere, stop nginx or Apache, or use nginx. |
| The domain shows `502` on the panel's server            | The sub page isn't running (`docker compose ps`), or the panel's `.env` has `SUB_PAGE_HERE=no`.                                                   |
| Subscription links point to the wrong domain            | That's the panel's `SUB_DOMAIN`, in `/opt/umiji/.env` on the panel's server.                                                                      |
