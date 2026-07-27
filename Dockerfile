# O jogo nao tem dependencia nenhuma: e node puro servindo arquivos e falando
# WebSocket na mao. Por isso a imagem e so o runtime mais o codigo.
FROM node:20-alpine

WORKDIR /app
COPY . .

# Atras do tunel o servidor escuta so no loopback do droplet.
ENV PORT=8090
ENV HOST=127.0.0.1

# Sobe como usuario comum: o processo nao precisa de root para nada.
USER node

CMD ["node", "server.js"]
