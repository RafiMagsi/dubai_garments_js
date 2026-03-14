# Master Operations Command Playbook

A consolidated command reference built from the uploaded playbooks and terminal history. This file is designed to be the **single operating manual** for your current Lightsail + Bitnami Apache + Laravel + Docker + Docker Compose + PostgreSQL + Prisma + Next.js + FastAPI stack.

This version does four things better than a raw command dump:

1. Groups commands by **real task**, not just by tool.
2. Explains **when to use** each command and **what result to expect**.
3. Preserves **bug-fix procedures as sequences**, so you can rerun fixes in the right order.
4. Separates **safe commands**, **destructive commands**, and **diagnostic commands** clearly.

---

## Table of Contents

1. Core Rules Before You Touch Anything
2. Environment and Project Paths
3. First Response Checklist When Something Breaks
4. SSH, Files, Logs, and Basic Linux Commands
5. Bitnami Apache and HTTPS Commands
6. Laravel and SQLite Maintenance Commands
7. Docker Installation and Engine Repair on Lightsail
8. Docker Runtime Commands
9. Docker Compose Commands
10. PostgreSQL and Prisma Commands
11. SQL Dump, Import, Export, and Verification
12. Next.js / FastAPI / API Debugging
13. rsync and Deployment Commands
14. DNS, Browser Cache, and Local macOS Commands
15. Password Reset / User Repair Commands
16. Resource, Memory, Disk, and Swap Commands
17. Recovery Procedures by Problem Type
18. Hard Lessons and Operational Rules

---

## 1. Core Rules Before You Touch Anything

### Rule 1 — Apache syntax check always comes before Apache restart

```bash
sudo /opt/bitnami/apache/bin/apachectl -t
```

Use when:
- you changed any Apache config file
- you touched SSL paths, vhosts, rewrites, proxy config

Expected:
- `Syntax OK`

If not:
- do **not** restart Apache yet
- fix the exact file and line from the error output first

---

### Rule 2 — `prisma db push` does **not** import data

```bash
npx prisma db push
```

Use when:
- you want Prisma to create/update tables in the target database

Do **not** use it when:
- you expect it to insert rows from SQL dumps
- you are trying to restore data

For row data, use SQL import commands later in this playbook.

---

### Rule 3 — Same DB name/user/password does not guarantee same DB instance

A database instance is defined by:
- hostname/service name
- Docker network
- attached Docker volume

Always verify:
- which container the app talks to
- which volume that container uses

---

### Rule 4 — A valid SSL certificate does not always mean the browser shows a secure page

Possible reasons Chrome still shows warnings:
- wrong vhost routing
- stale browser/HSTS/DNS cache
- mixed content (`http://` assets inside an `https://` page)

---

### Rule 5 — `rsync --delete` deletes extra files on the server by design

That is expected behavior.
If it deletes the wrong things, the usual cause is:
- wrong source path
- wrong destination path
- nesting errors

---

## 2. Environment and Project Paths

### Main Laravel app

```text
/var/www/appcenter
```

### AI Sales / Docker project root

```text
/var/www/aisales
```

### Storefront app

```text
/var/www/aisales/apps/storefront-dubai_garments
```

### Main Apache config files

```text
/opt/bitnami/apache/conf/bitnami/bitnami.conf
/opt/bitnami/apache/conf/bitnami/bitnami-ssl.conf
/opt/bitnami/apache/conf/vhosts/subdomain-vhost.conf
```

### Important runtime env files

```text
/var/www/aisales/.env
/var/www/aisales/apps/storefront-dubai_garments/.env
/var/www/aisales/services/fastapi_quote_api/.env
```

### Default/template env files in repo

```text
.env.test
apps/storefront-dubai_garments/.env.test
services/fastapi_quote_api/.env.test
```

---

## 3. First Response Checklist When Something Breaks

Run these first before random edits:

```bash
sudo /opt/bitnami/ctlscript.sh status
docker ps -a
sudo ss -tulpn | grep -E ':80 |:443 '
sudo /opt/bitnami/apache/bin/apachectl -t
sudo /opt/bitnami/apache/bin/apachectl -S
free -h
df -h
```

Use when:
- website is down
- Docker stack behaves strangely
- SSL or routing looks wrong
- server appears frozen or unresponsive

This tells you quickly:
- whether Apache is up
- whether Docker containers are up
- who owns ports 80/443
- whether config is broken
- whether memory/disk is exhausted

---

## 4. SSH, Files, Logs, and Basic Linux Commands

### SSH into Lightsail

```bash
ssh -i ~/.ssh/LightsailDefaultKey-ap-southeast-1.pem bitnami@YOUR_SERVER_IP
```

Use when:
- you need terminal access to the server

---

### Edit a file

```bash
nano /path/to/file
sudo nano /path/to/file
```

Use when:
- changing configs
- editing env files
- fixing scripts

---

### Read a file

```bash
cat /path/to/file
```

Use when:
- quick read only

---

### Follow a log live

```bash
tail -f /path/to/logfile
```

Use when:
- reproducing an error in browser while watching logs

---

### Show last lines only

```bash
tail -n 50 /path/to/logfile
tail -n 300 /path/to/logfile
```

Use when:
- you only need recent errors

---

### Find files or patterns

```bash
find . -name 'filename_or_pattern*'
find /var/www/aisales -name 'dubai_garments_data*'
```

Use when:
- you lost track of SQL files
- duplicate files may exist

---

## 5. Bitnami Apache and HTTPS Commands

### Check Bitnami-managed service status

```bash
sudo /opt/bitnami/ctlscript.sh status
```

Use when:
- appcenter.me is down
- you need quick Apache/Redis status

---

### Apache syntax check

```bash
sudo /opt/bitnami/apache/bin/apachectl -t
```

---

### Show loaded Apache modules relevant to proxying and SSL

```bash
sudo /opt/bitnami/apache/bin/apachectl -M | grep -E "proxy|proxy_http|proxy_fcgi|rewrite|ssl"
```

Use when:
- proxying to Next.js is failing
- PHP-FPM is not working
- SSL seems broken

---

### Show Apache vhosts

```bash
sudo /opt/bitnami/apache/bin/apachectl -S
```

Use when:
- figuring out which file serves which domain/port
- debugging appcenter.me vs aisales.appcenter.me

---

### Restart Apache

```bash
sudo /opt/bitnami/ctlscript.sh restart apache
```

Use when:
- syntax already passed

---

### Check which process listens on 80/443

```bash
sudo ss -tulpn | grep -E ':80 |:443 '
sudo netstat -ltnp | grep ':80'
sudo lsof -i :80 -i :443
```

Use when:
- browser says refused to connect
- nginx appears unexpectedly
- Docker may have grabbed a port

---

### Edit main HTTP vhost

```bash
sudo nano /opt/bitnami/apache/conf/bitnami/bitnami.conf
```

Use when:
- changing HTTP → HTTPS redirect for `appcenter.me`

---

### Edit main HTTPS vhost

```bash
sudo nano /opt/bitnami/apache/conf/bitnami/bitnami-ssl.conf
```

Use when:
- fixing SSL cert paths
- fixing `appcenter.me` / `www.appcenter.me` on 443

---

### Edit subdomain vhost

```bash
sudo nano /opt/bitnami/apache/conf/vhosts/subdomain-vhost.conf
```

Use when:
- proxying `aisales.appcenter.me` to Next.js
- separating HTTP and HTTPS subdomain behavior

---

### Inspect the certificate served by the server

Main domain:

```bash
openssl s_client -connect appcenter.me:443 -servername appcenter.me </dev/null 2>/dev/null | openssl x509 -noout -subject -issuer -dates -ext subjectAltName
```

Subdomain:

```bash
openssl s_client -connect aisales.appcenter.me:443 -servername aisales.appcenter.me </dev/null 2>/dev/null | openssl x509 -noout -subject -issuer -dates -ext subjectAltName
```

Use when:
- browser says certificate is not trusted
- you need to confirm SAN contains all hostnames
- you want to verify issuer and expiry

---

### Find actual cert files

```bash
sudo find /etc/letsencrypt /opt/bitnami/letsencrypt -type f \( -name "fullchain.pem" -o -name "privkey.pem" -o -name "*.crt" -o -name "*.key" \) | sort
```

Use when:
- Apache points to missing cert file paths
- you need real certificate file locations

---

### Run Bitnami SSL tool

```bash
sudo /opt/bitnami/bncert-tool
```

Use when:
- Apache config is valid
- DNS points to the server
- you want Bitnami to manage HTTPS setup

Do not use when:
- `apachectl -t` is failing

---

### Mixed content checks

```bash
curl -s https://www.appcenter.me | grep -Eo '(src|href)="http://[^"]+"' | head -50
curl -s https://www.appcenter.me | grep -o 'http://[^"'"'"' ]*' | head -50
```

Use when:
- certificate is valid but Chrome still shows “Not Secure”

---

## 6. Laravel and SQLite Maintenance Commands

### Fix Laravel cache/storage permissions

```bash
sudo chown -R bitnami:daemon storage bootstrap/cache
sudo find storage -type d -exec chmod 775 {} \;
sudo find storage -type f -exec chmod 664 {} \;
sudo find bootstrap/cache -type d -exec chmod 775 {} \;
sudo find bootstrap/cache -type f -exec chmod 664 {} \;
```

Use when:
- Laravel throws permission denied on views/logs/cache

Alternative stricter ownership patterns you used:

```bash
sudo chown -R www-data:www-data storage bootstrap/cache
sudo chmod -R 775 storage bootstrap/cache
sudo chown -R bitnami:www-data storage bootstrap/cache
```

Use only after confirming which user/group actually needs write access.

---

### Clear Laravel caches

```bash
php artisan view:clear
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan optimize:clear
```

Use when:
- env changes are not reflected
- cached config/views/routes are stale

---

### Create required framework directories manually

```bash
sudo mkdir -p storage/framework/views
sudo mkdir -p storage/logs storage/framework/{cache,sessions,views,testing}
sudo touch storage/logs/laravel.log
```

Use when:
- Laravel errors mention missing views or logs directories

---

### Check/install SQLite PHP extension

```bash
php -m | grep -i sqlite
sudo apt update
sudo apt install -y php8.2-sqlite3
sudo systemctl restart php8.2-fpm
sudo /opt/bitnami/ctlscript.sh restart apache
```

Use when:
- Laravel using SQLite reports `could not find driver`

---

### Inspect SQLite database file

```bash
ls -lah /var/www/appcenter/database/database.sqlite
stat /var/www/appcenter/database/database.sqlite
sqlite3 /var/www/appcenter/database/database.sqlite ".tables"
```

Use when:
- checking whether SQLite file exists and contains tables

---

### Make SQLite writable

```bash
sudo chown bitnami:bitnami /var/www/appcenter/database/database.sqlite
chmod 664 /var/www/appcenter/database/database.sqlite
sudo chown www-data:www-data database/database.sqlite
sudo chmod 664 database/database.sqlite
sudo chown www-data:www-data database
sudo chmod 775 database
sudo chown bitnami:www-data database database/database.sqlite
sudo chmod 775 database
sudo chmod 664 database/database.sqlite
```

Use when:
- SQLite errors say readonly database or permission denied

---

### Laravel DB/session/cache migration helpers

```bash
php artisan session:table
php artisan queue:table
php artisan cache:table
php artisan migrate
php artisan migrate:status
php artisan migrate:install
php artisan tinker
```

Use when:
- session/cache/queue tables are missing
- migrations table needs installation

---

### Mark migrations manually in SQLite (advanced / emergency)

```bash
for f in database/migrations/*.php; do
  name=$(basename "$f" .php)
  sqlite3 database/database.sqlite "INSERT OR IGNORE INTO migrations (migration, batch) VALUES ('$name', 1);"
done
```

Use when:
- you intentionally want to mark old migrations as applied in SQLite

Danger:
- use only if you fully understand the migration state you are forcing

---

### Remove problematic migration files (one-off emergency cleanup)

Examples you used:

```bash
rm database/migrations/2025_07_26_174925_add_public_token_to_releases_table.php
rm database/migrations/2025_07_26_205753_add_application_name_to_releases_table.php
rm database/migrations/2025_07_27_000640_add_filename_to_releases_table.php
rm database/migrations/2025_07_28_155048_add_application_id_to_releases_table.php
rm database/migrations/2025_07_30_175124_add_user_id_and_is_public_to_groups_table.php
rm database/migrations/2025_07_30_183457_add_is_super_admin_to_users_table.php
rm database/migrations/2026_03_04_000001_add_code_to_applications_and_releases_tables.php
rm database/migrations/2026_03_04_000002_add_release_number_to_releases_table.php
```

Use when:
- you intentionally decide these migrations should not run on that deployed SQLite DB

Danger:
- destructive project-level change; do not do casually

---

### Storage symlink

```bash
php artisan storage:link
ls -l public
ls -ld public/storage
ls -lah storage/app/public
```

Use when:
- Laravel public storage files are not accessible

---

## 7. Docker Installation and Engine Repair on Lightsail

### Install Docker quickly (basic)

```bash
sudo apt update
sudo apt install -y docker.io
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker bitnami
```

Use when:
- you need a quick Docker install

---

### Install Docker properly from Docker repo on Debian 12

```bash
sudo apt-get remove -y docker docker-engine docker.io containerd runc
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian \
bookworm stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

Use when:
- you want current Docker Engine on Debian 12

Check versions:

```bash
docker --version
docker compose version
cat /etc/os-release
```

---

### Add user to docker group and reload group

```bash
sudo usermod -aG docker bitnami
newgrp docker
```

Use when:
- Docker requires sudo but you want normal user access

---

### Docker daemon config for DNS

```bash
sudo mkdir -p /etc/docker
cat <<'JSON' | sudo tee /etc/docker/daemon.json
{
  "dns": ["8.8.8.8", "1.1.1.1"],
  "log-driver": "json-file",
  "log-opts": { "max-size": "10m", "max-file": "3" }
}
JSON
sudo systemctl daemon-reload
sudo systemctl restart docker
```

Alternative variant you tested:

```bash
cat <<'JSON' | sudo tee /etc/docker/daemon.json
{
  "dns": ["172.26.0.2", "8.8.8.8", "1.1.1.1"],
  "dns-opts": ["timeout:2", "attempts:3"]
}
JSON
sudo systemctl daemon-reload
sudo systemctl restart docker
```

Use when:
- containers cannot resolve domains during build
- `Temporary failure in name resolution`
- `EAI_AGAIN`

---

### Test Docker DNS/network quickly

```bash
docker run --rm alpine:3.20 nslookup dl-cdn.alpinelinux.org
docker run --rm python:3.12-slim python -c "import socket; print(socket.gethostbyname('pypi.org'))"
docker run --rm alpine cat /etc/resolv.conf
docker run --rm alpine ping -c 3 google.com
docker run --rm alpine ping -c 3 8.8.8.8
docker run --rm --network host alpine ping -c 3 8.8.8.8
docker run --rm --network host python:3.12-slim python -c "import socket; print(socket.gethostbyname('pypi.org'))"
```

Use when:
- Docker builds fail on apk/pip/npm network resolution

---

### Check forwarding/NAT state

```bash
sudo nft list ruleset
sudo iptables -L FORWARD -n -v
sudo iptables -t nat -L -n -v
sudo iptables -t nat -S
sudo sysctl net.ipv4.ip_forward
ip route
ip addr show docker0
docker network inspect bridge
docker network ls
```

Use when:
- containers cannot reach internet but host can

---

### Enable IP forwarding permanently

```bash
echo 'net.ipv4.ip_forward=1' | sudo tee /etc/sysctl.d/99-docker-ipforward.conf
sudo sysctl --system
sudo sysctl net.ipv4.ip_forward
```

---

### Accept FORWARD traffic quickly

```bash
sudo iptables -P FORWARD ACCEPT
sudo iptables -L FORWARD -n -v
```

Use when:
- Docker bridge traffic is blocked by default forward policy

Fallback nft fix you used:

```bash
sudo nft add rule inet forwarding forward counter accept
sudo nft list ruleset
```

Use when:
- nftables is blocking forwarding on Lightsail

---

### Restart Docker and inspect

```bash
sudo systemctl restart docker
sudo systemctl status docker --no-pager
docker info
docker system df
docker stats
```

Use when:
- Docker behaves inconsistently
- you need to check resources and disk usage

---

### Remove unused Docker objects carefully

```bash
docker system prune -f
docker network prune -f
```

Use when:
- old networks/caches are cluttering the machine

Danger:
- deletes unused Docker objects

---

## 8. Docker Runtime Commands

### List all / running containers

```bash
docker ps -a
docker ps
```

---

### Stop, remove, restart containers

```bash
docker stop CONTAINER_NAME
docker rm CONTAINER_NAME
docker rm -f CONTAINER_NAME
docker restart CONTAINER_NAME
```

Examples:

```bash
docker stop dubai_garments_postgres
docker rm dubai_garments_postgres
docker restart dubai_garments_storefront
```

---

### View logs

```bash
docker logs CONTAINER_NAME --tail 200
docker logs -f CONTAINER_NAME
```

Examples:

```bash
docker logs dubai_garments_storefront --tail 200
docker logs dubai_garments_fastapi --tail 200
```

Use when:
- `/api/products` returns 503
- FastAPI may be down
- storefront may have Prisma errors

---

### Inspect environment variables in a container

```bash
docker exec -it CONTAINER_NAME env
```

Examples:

```bash
docker exec -it dubai_garments_storefront env | grep DATABASE_URL
docker exec -it dubai_garments_storefront env | grep -Ei 'FASTAPI|API|BACKEND|BASE_URL|INTERNAL'
docker exec -it dubai_garments_postgres env | grep POSTGRES
```

---

### Inspect mounts / volume backing a container

```bash
docker inspect dubai_garments_postgres --format '{{range .Mounts}}{{println .Name "->" .Destination}}{{end}}'
```

Use when:
- you need to know which volume stores Postgres data before resetting it

---

### Inspect Docker network resolution from a container

```bash
docker exec -it dubai_garments_storefront sh -c 'getent hosts postgres || ping -c 1 postgres || nslookup postgres'
docker exec -it dubai_garments_storefront sh -c 'getent hosts dubai_garments_postgres || ping -c 1 dubai_garments_postgres || nslookup dubai_garments_postgres'
```

Use when:
- unsure whether app resolves DB host correctly

---

## 9. Docker Compose Commands

### Show compose service names

```bash
docker compose config --services
```

Use when:
- you want exact service names like `postgres`, `storefront`, `fastapi`

---

### Start full stack / selected services

```bash
docker compose up
docker compose up -d
docker compose up --build
docker compose up -d --build
docker compose up -d postgres
docker compose up -d postgres redis
docker compose up -d postgres redis fastapi storefront
```

Use when:
- starting stack normally
- starting only core services

---

### Stop / remove compose services

```bash
docker compose down
docker compose down -v
docker compose stop SERVICE_NAME
docker compose rm -f SERVICE_NAME
docker compose ps
```

Use when:
- resetting DB container only
- rebuilding from a clean service state

Danger:
- `down -v` also removes volumes

---

### Build images

```bash
docker compose build --no-cache fastapi
DOCKER_BUILDKIT=0 docker compose build --no-cache fastapi
DOCKER_BUILDKIT=0 docker compose -f docker-compose.aisales.yml build --no-cache
```

Use when:
- image contents need fresh rebuild
- debugging build failures

---

## 10. PostgreSQL and Prisma Commands

### Connect to Postgres shell

```bash
docker exec -it dubai_garments_postgres psql -U rafi -d dubai_garments
```

---

### Show connection info

```bash
docker exec -it dubai_garments_postgres psql -U rafi -d dubai_garments -c "\conninfo"
```

---

### List roles and databases

```bash
docker exec -it dubai_garments_postgres psql -U rafi -d dubai_garments -c "\du"
docker exec -it dubai_garments_postgres psql -U rafi -d dubai_garments -c "\l"
```

---

### List tables / inspect structure

```bash
docker exec -it dubai_garments_postgres psql -U rafi -d dubai_garments -c "\dt"
docker exec -it dubai_garments_postgres psql -U rafi -d dubai_garments -c "\d users"
docker exec -it dubai_garments_postgres psql -U rafi -d dubai_garments -c "\d products"
```

---

### Count rows / inspect rows

```bash
docker exec -it dubai_garments_postgres psql -U rafi -d dubai_garments -c "SELECT COUNT(*) FROM products;"
docker exec -it dubai_garments_postgres psql -U rafi -d dubai_garments -c "SELECT COUNT(*) FROM users;"
docker exec -it dubai_garments_postgres psql -U rafi -d dubai_garments -c "SELECT COUNT(*) FROM leads;"
docker exec -it dubai_garments_postgres psql -U rafi -d dubai_garments -c "SELECT * FROM users;"
docker exec -it dubai_garments_postgres psql -U rafi -d dubai_garments -c "SELECT id, full_name, email, role, is_active FROM users;"
```

Use when:
- verifying import success
- checking admin login accounts

---

### Prisma schema operations

```bash
npx prisma migrate deploy
npx prisma db push
npx prisma generate
npx prisma db pull
npx prisma studio
```

Use when:
- `migrate deploy`: apply project migrations in intended workflow
- `db push`: sync schema on a fresh or intended DB
- `generate`: regenerate Prisma client
- `db pull`: inspect existing DB into Prisma schema
- `studio`: inspect data interactively

Important:
- `db push` is not row import

---

### psql on host (after installing client)

```bash
psql -h localhost -U rafi -d dubai_garments
sudo apt update
sudo apt install -y postgresql-client
psql --version
```

Use when:
- you want host-side psql access
- seed scripts require `psql` locally

---

## 11. SQL Dump, Import, Export, and Verification

### Create schema-only dump locally

```bash
pg_dump -h localhost -U rafi -d dubai_garments --schema-only > dubai_garments_schema.sql
```

---

### Create data-only dumps locally

```bash
pg_dump -h localhost -U rafi -d dubai_garments --data-only --inserts > dubai_garments_data.sql
pg_dump \
  --data-only \
  --column-inserts \
  --no-owner \
  --no-privileges \
  --exclude-table=schema_migrations \
  -h localhost -p 5432 -U rafi -d dubai_garments \
  > dubai_garments_data_clean.sql
```

Use when:
- preparing portable row-data dump for server import

---

### Upload SQL file from Mac to server

```bash
scp -i ~/.ssh/LightsailDefaultKey-ap-southeast-1.pem ~/Desktop/dubai_garments_data_clean.sql bitnami@YOUR_SERVER_IP:/var/www/aisales/apps/storefront-dubai_garments/
```

Use when:
- moving SQL files or artifacts from Mac to Lightsail

---

### Verify uploaded SQL file

```bash
ls -lh /var/www/aisales/apps/storefront-dubai_garments/dubai_garments_data_clean.sql
wc -l /var/www/aisales/apps/storefront-dubai_garments/dubai_garments_data_clean.sql
head -40 /var/www/aisales/apps/storefront-dubai_garments/dubai_garments_data_clean.sql
```

Use when:
- file may be empty or corrupted

---

### Inspect what a SQL dump inserts into

```bash
grep -oE '^INSERT INTO public\.[a-zA-Z0-9_]+' dubai_garments_data_clean.sql | sed 's/^INSERT INTO public\.//' | sort -u
grep -c '^INSERT INTO public\.' dubai_garments_data_clean.sql
grep -c '^INSERT INTO public\.products' dubai_garments_data_clean.sql
grep -c '^INSERT INTO public\.product_variants' dubai_garments_data_clean.sql
grep -c '^INSERT INTO public\.users' dubai_garments_data_clean.sql
grep -c '^INSERT INTO public\.leads' dubai_garments_data_clean.sql
grep '^INSERT INTO public\.products' dubai_garments_data_clean.sql | head -3
wc -l dubai_garments_data_clean.sql
```

Use when:
- import appears to do nothing
- you want to verify the file actually contains data

---

### Remove PostgreSQL 18-only transaction timeout line for PG16 target

```bash
grep -v '^SET transaction_timeout = 0;' dubai_garments_data_clean.sql > dubai_garments_data_import.sql
```

Use when:
- dump was created by PostgreSQL 18 tools but server runs PostgreSQL 16

---

### Import SQL data into Docker Postgres

Standard:

```bash
docker exec -i dubai_garments_postgres psql -U rafi -d dubai_garments < dubai_garments_data_clean.sql
```

Safer with hard stop on first error:

```bash
docker exec -i dubai_garments_postgres psql -v ON_ERROR_STOP=1 -U rafi -d dubai_garments < dubai_garments_data_import.sql
```

Alternative pipeline style:

```bash
cat dubai_garments_data_clean.sql | docker exec -i dubai_garments_postgres psql -U rafi -d dubai_garments
cat dubai_garments_data_clean.sql | docker exec -i dubai_garments_postgres psql -v ON_ERROR_STOP=1 -U rafi -d dubai_garments
```

Use when:
- schema already exists
- you are importing rows only

---

### Export current server DB for backup

```bash
docker exec -i dubai_garments_postgres pg_dump -U postgres -d dubai_garments > server_dump.sql
```

Use when:
- backing up before destructive reset

---

## 12. Next.js / FastAPI / API Debugging

### Test storefront API directly on server

```bash
curl -i http://127.0.0.1:3000/api/products?category=all
curl http://127.0.0.1:3000
```

Use when:
- browser frontend shows empty data or 503
- you want to know whether API route itself is failing

---

### FastAPI health checks

```bash
docker exec -it dubai_garments_fastapi sh -c "ss -tulpn || netstat -tulpn"
docker exec -it dubai_garments_fastapi sh -c "python - <<'PY'
import socket
for port in (8000,8080,3000):
    s=socket.socket()
    s.settimeout(1)
    r=s.connect_ex(('127.0.0.1', port))
    print(port, 'open' if r==0 else 'closed')
    s.close()
PY"
docker exec -it dubai_garments_fastapi python - <<'PY'
import urllib.request
for url in ['http://127.0.0.1:8000/','http://127.0.0.1:8000/health','http://127.0.0.1:8000/docs']:
    try:
        r=urllib.request.urlopen(url, timeout=5)
        print(url, r.status)
        print(r.read(200))
    except Exception as e:
        print(url, 'ERROR', e)
PY
```

Use when:
- unsure if FastAPI is alive inside its container

---

### Test FastAPI from storefront container

```bash
docker exec -it dubai_garments_storefront node -e "fetch('http://fastapi:8000/health').then(r=>r.text().then(t=>console.log(r.status,t))).catch(e=>console.error(e))"
docker exec -it dubai_garments_storefront node -e "fetch('http://dubai_garments_fastapi:8000/health').then(r=>r.text().then(t=>console.log(r.status,t))).catch(e=>console.error(e))"
```

Use when:
- storefront may be unable to reach FastAPI over Docker network

---

### Inspect important env vars in storefront

```bash
docker exec -it dubai_garments_storefront env | grep DATABASE_URL
docker exec -it dubai_garments_storefront env | grep -Ei 'FASTAPI|API|BACKEND|BASE_URL|INTERNAL'
```

Expected examples:
- `DATABASE_URL=postgresql://rafi:secret@postgres:5432/dubai_garments`
- `FASTAPI_BASE_URL=http://fastapi:8000`

---

### App-level health / metrics endpoints from operations playbook

```bash
curl -sS http://localhost:3000/api/metrics | head
curl -sS http://localhost:8000/metrics | head
curl -sS http://localhost:8100/health
```

Use when:
- checking observability endpoints and internal health quickly

---

## 13. rsync and Deployment Commands

### Full repo upload

```bash
rsync -az --delete ./ USER@HOST:/var/www/aisales/
```

Use when:
- destination is project root

Important:
- `--delete` removes server files missing from source

---

### Single-app upload

```bash
rsync -az --delete ./apps/storefront-dubai_garments/ USER@HOST:/var/www/aisales/apps/storefront-dubai_garments/
```

Use when:
- uploading only storefront app folder

---

### Inspect bad nesting from wrong rsync roots

```bash
find /var/www/aisales -maxdepth 4 -type d | sort
```

Use when:
- bad folders like `apps/apps/...` appear

---

### Remove rsync-created junk folders

```bash
sudo rm -rf /var/www/aisales/apps/apps
sudo rm -rf /var/www/aisales/apps/storefront-dubai_garments/apps
```

Use when:
- cleaning nested junk once after fixing rsync roots

---

### Example GitHub Actions SSH key generation you used locally

```bash
ssh-keygen -t ed25519 -f ~/.ssh/gh-actions-aisales -C "gh-actions-aisales"
cat ~/.ssh/gh-actions-aisales.pub
cat ~/.ssh/gh-actions-aisales
```

Use when:
- generating dedicated deploy key pair for GitHub Actions

---

## 14. DNS, Browser Cache, and Local macOS Commands

### Flush macOS DNS cache

```bash
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder
```

Use when:
- DNS changes not reflected locally yet

Combined form:

```bash
sudo dscacheutil -flushcache && sudo killall -HUP mDNSResponder
```

---

### Launch Chrome with clean profile

```bash
open -na "Google Chrome" --args --user-data-dir=/tmp/chrome-clean-profile
```

Use when:
- SSL/HSTS/cache state may be stale

---

### DNS checks

```bash
dig +short appcenter.me
dig +short www.appcenter.me
```

Use when:
- confirming domain points to expected IP

---

### Local host-header tests against Apache on server

```bash
curl -I -H "Host: appcenter.me" http://127.0.0.1
curl -k -I -H "Host: appcenter.me" https://127.0.0.1
curl -I -H "Host: www.appcenter.me" http://127.0.0.1
curl -k -I -H "Host: www.appcenter.me" https://127.0.0.1
curl -I https://appcenter.me
curl -I https://www.appcenter.me
```

Use when:
- verifying vhost routing and HTTPS responses from server side

---

## 15. Password Reset / User Repair Commands

### List users

```bash
docker exec -it dubai_garments_postgres psql -U rafi -d dubai_garments -c "SELECT id, full_name, email FROM users;"
```

---

### Generate bcrypt hash in Python

```bash
python3 - <<'PY'
import bcrypt
password = b'test@1234'
hashed = bcrypt.hashpw(password, bcrypt.gensalt(rounds=10))
print(hashed.decode())
PY
```

If Python bcrypt is missing:

```bash
python3 -m pip install --user bcrypt
```

Use when:
- app and container do not have `bcrypt` / `bcryptjs` packages available for quick hashing

---

### Update password hash directly in DB

```bash
docker exec -it dubai_garments_postgres psql -U rafi -d dubai_garments -c "UPDATE users SET password_hash='HASH_HERE', updated_at=NOW() WHERE email='admin@dubaigarments.me';"
```

Use when:
- you already generated a valid bcrypt hash

Important:
- never store plain text in `password_hash`

---

### Verify user hash prefix / tenant mapping

With tenants table present:

```bash
docker exec -i dubai_garments_postgres psql -U rafi -d dubai_garments <<'SQL'
SELECT u.email, u.role, t.slug AS tenant_slug, left(u.password_hash, 4) AS hash_prefix
FROM users u
JOIN tenants t ON t.id = u.tenant_id
WHERE lower(u.email) = lower('admin@dubaigarments.me');
SQL
```

Use when:
- login returns unauthorized
- you need to confirm bcrypt hash prefix and tenant linkage

---

### Reseed users (project-specific script)

```bash
cd /var/www/aisales/apps/storefront-dubai_garments
npm run db:seed:users
```

Use when:
- admin login is broken and seed script is the intended repair path

If script fails with `psql: not found`, install client:

```bash
sudo apt update
sudo apt install -y postgresql-client
psql --version
```

---

## 16. Resource, Memory, Disk, and Swap Commands

### Memory and disk

```bash
free -h
free -m
df -h
```

Use when:
- server becomes slow or unresponsive
- Docker builds freeze the machine

---

### Check OOM / killed processes

```bash
dmesg -T | grep -i -E 'killed process|out of memory|oom'
sudo dmesg -T | grep -i -E 'killed process|out of memory|oom'
```

Use when:
- Docker build made Lightsail appear dead

---

### Add 4 GB swap on Lightsail

```bash
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
free -h
```

Use when:
- small Lightsail instance dies during builds or large docker operations

---

## 17. Recovery Procedures by Problem Type

### Procedure A — Website down after Apache changes

1. Check service status

```bash
sudo /opt/bitnami/ctlscript.sh status
```

2. Check ports 80/443

```bash
sudo ss -tulpn | grep -E ':80 |:443 '
```

3. Validate Apache syntax

```bash
sudo /opt/bitnami/apache/bin/apachectl -t
```

4. Inspect vhosts

```bash
sudo /opt/bitnami/apache/bin/apachectl -S
```

5. Restart Apache only if syntax is clean

```bash
sudo /opt/bitnami/ctlscript.sh restart apache
```

6. Check recent Apache errors

```bash
tail -n 50 /opt/bitnami/apache/logs/error_log
tail -f /opt/bitnami/apache/logs/error_log
```

---

### Procedure B — HTTPS or browser trust problem

1. Verify DNS

```bash
dig +short appcenter.me
dig +short www.appcenter.me
```

2. Inspect served certificate

```bash
openssl s_client -connect appcenter.me:443 -servername appcenter.me </dev/null 2>/dev/null | openssl x509 -noout -subject -issuer -dates -ext subjectAltName
openssl s_client -connect aisales.appcenter.me:443 -servername aisales.appcenter.me </dev/null 2>/dev/null | openssl x509 -noout -subject -issuer -dates -ext subjectAltName
```

3. Check mixed content

```bash
curl -s https://www.appcenter.me | grep -Eo '(src|href)="http://[^"]+"' | head -50
curl -s https://www.appcenter.me | grep -o 'http://[^"'"'"' ]*' | head -50
```

4. Flush local cache/DNS

```bash
sudo dscacheutil -flushcache && sudo killall -HUP mDNSResponder
open -na "Google Chrome" --args --user-data-dir=/tmp/chrome-clean-profile
```

---

### Procedure C — Docker build cannot reach internet / DNS broken in containers

1. Confirm host internet works

```bash
ping -c 3 google.com
curl -I https://pypi.org
```

2. Test container network/DNS

```bash
docker run --rm alpine ping -c 3 8.8.8.8
docker run --rm alpine ping -c 3 google.com
docker run --rm alpine cat /etc/resolv.conf
docker run --rm python:3.12-slim python -c "import socket; print(socket.gethostbyname('pypi.org'))"
```

3. Check forwarding rules

```bash
sudo nft list ruleset
sudo iptables -L FORWARD -n -v
sudo iptables -t nat -L -n -v
sudo sysctl net.ipv4.ip_forward
```

4. Enable forwarding and accept FORWARD if needed

```bash
echo 'net.ipv4.ip_forward=1' | sudo tee /etc/sysctl.d/99-docker-ipforward.conf
sudo sysctl --system
sudo iptables -P FORWARD ACCEPT
sudo nft add rule inet forwarding forward counter accept
sudo systemctl restart docker
```

5. Retest container DNS/network

```bash
docker run --rm alpine ping -c 3 8.8.8.8
docker run --rm python:3.12-slim python -c "import socket; print(socket.gethostbyname('pypi.org'))"
```

---

### Procedure D — Postgres / Prisma schema mismatch or dirty DB

1. Confirm app DB URL

```bash
docker exec -it dubai_garments_storefront env | grep DATABASE_URL
```

2. Check current DB tables

```bash
docker exec -it dubai_garments_postgres psql -U rafi -d dubai_garments -c "\dt"
```

3. Find actual DB volume

```bash
docker inspect dubai_garments_postgres --format '{{range .Mounts}}{{println .Name "->" .Destination}}{{end}}'
```

4. Stop and remove DB container

```bash
docker stop dubai_garments_postgres
docker rm dubai_garments_postgres
```

5. Remove DB volume

```bash
docker volume rm aisales_postgres_data
```

6. Recreate Postgres service only

```bash
docker compose up -d postgres
```

7. Confirm DB empty

```bash
docker exec -it dubai_garments_postgres psql -U rafi -d dubai_garments -c "\dt"
```

8. Apply schema

```bash
npx prisma db push
```

9. Confirm tables created

```bash
docker exec -it dubai_garments_postgres psql -U rafi -d dubai_garments -c "\dt"
```

10. Import row data from SQL

```bash
docker exec -i dubai_garments_postgres psql -v ON_ERROR_STOP=1 -U rafi -d dubai_garments < dubai_garments_data_import.sql
```

11. Verify row counts

```bash
docker exec -it dubai_garments_postgres psql -U rafi -d dubai_garments -c "SELECT COUNT(*) FROM products;"
docker exec -it dubai_garments_postgres psql -U rafi -d dubai_garments -c "SELECT COUNT(*) FROM users;"
docker exec -it dubai_garments_postgres psql -U rafi -d dubai_garments -c "SELECT COUNT(*) FROM leads;"
```

12. Restart storefront and retest API

```bash
docker restart dubai_garments_storefront
curl -i http://127.0.0.1:3000/api/products?category=all
```

---

### Procedure E — API returns 503 or empty array

1. Test API directly

```bash
curl -i http://127.0.0.1:3000/api/products?category=all
```

2. Check storefront logs

```bash
docker logs dubai_garments_storefront --tail 200
```

3. Check FastAPI health from storefront

```bash
docker exec -it dubai_garments_storefront node -e "fetch('http://fastapi:8000/health').then(r=>r.text().then(t=>console.log(r.status,t))).catch(e=>console.error(e))"
```

4. Check database row counts

```bash
docker exec -it dubai_garments_postgres psql -U rafi -d dubai_garments -c "SELECT COUNT(*) FROM products;"
```

5. If schema exists but row counts are zero, the SQL import did not actually load rows. Reinspect the SQL file and import again with `ON_ERROR_STOP=1`.

---

### Procedure F — rsync deployment created nested junk folders or deleted wrong things

1. Inspect directory structure

```bash
find /var/www/aisales -maxdepth 4 -type d | sort
```

2. Remove junk folders

```bash
sudo rm -rf /var/www/aisales/apps/apps
sudo rm -rf /var/www/aisales/apps/storefront-dubai_garments/apps
```

3. Fix rsync root pairing

Full repo to project root:

```bash
rsync -az --delete ./ USER@HOST:/var/www/aisales/
```

Only storefront app:

```bash
rsync -az --delete ./apps/storefront-dubai_garments/ USER@HOST:/var/www/aisales/apps/storefront-dubai_garments/
```

---

## 18. Hard Lessons and Operational Rules

- If Apache syntax is broken, do **not** run `bncert-tool` yet.
- If `docker compose up -d` creates a fresh volume, your old data is gone from that instance until you re-import it.
- If Prisma says a table does not exist, verify `DATABASE_URL` and inspect the actual target database with `psql`.
- If SQL import appears to do nothing, inspect the file itself: size, line count, insert count, first lines, and import with `ON_ERROR_STOP=1`.
- If browser says “Not Secure” while certificate is valid, check mixed content and cache before touching SSL again.
- If Docker builds freeze a small Lightsail instance, add swap and stop doing heavy builds on the server if possible.
- If a project script expects `psql` on the host, either install `postgresql-client` or rewrite the script to use `docker exec ... psql`.
- If you manually create a DB container and also use Compose-managed Postgres, you will confuse yourself unless you verify hostname, network, and volume every time.

---

## Appendix — Export terminal history for future playbook updates

### Export all shell history

```bash
history -a
history > terminal_history.txt
```

### Export commands without line numbers

```bash
history | sed 's/^ *[0-9]\+ *//' > terminal_commands_only.txt
```

### Export only recent commands

```bash
history 300 | sed 's/^ *[0-9]\+ *//' > terminal_commands_last_300.txt
```

### Record full future session including output

```bash
script terminal_session.log
```

Exit to stop recording:

```bash
exit
```

---

Prepared as the unified operations guide for your current stack. Adjust hostnames, paths, service names, passwords, domains, and IPs before reuse.
