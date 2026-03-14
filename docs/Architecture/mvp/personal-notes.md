# 1. implement design first
# 2. then we implement the MVP setep by step
# 3. the deployment makes the website stop, it should do green / blue implementation, seamless deployment, new version on reload
# 4. the Visual Goldens is not working because of the login, how to implement with admin login so the browser can login and take different pages screenshots, or show the browser window open when run the visual goldens command

# Dev (hot reload):
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build

# Prod (existing behavior):
docker compose up -d --build
