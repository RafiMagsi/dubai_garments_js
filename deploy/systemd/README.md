# Systemd Units (No Docker Deployment)

These are template unit files.  
Do not copy them directly by hand; use installer:

```bash
sudo ./scripts/install-systemd-units.sh
```

Optional AI service:

```bash
sudo ./scripts/install-systemd-units.sh --enable-ai
```

The installer replaces:

- `__PROJECT_ROOT__` with your actual project path
- `__RUN_USER__` with the Linux user running the services
