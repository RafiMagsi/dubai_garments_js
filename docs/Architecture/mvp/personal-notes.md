# 1. implement design first
# 2. then we implement the MVP setep by step
# 3. the deployment makes the website stop, it should do green / blue implementation, seamless deployment, new version on reload
# 4. the Visual Goldens is not working because of the login, how to implement with admin login so the browser can login and take different pages screenshots, or show the browser window open when run the visual goldens command

remember we changed the cards from full row height to compact, we did 1 mistake actually i was meant to align the content of these cards to top but keep the cards height same, so do it,

# Dev (hot reload):
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build

# Prod (existing behavior):
docker compose up -d --build
