# O jogo nao tem dependencia nenhuma: e node puro servindo arquivos e falando
# WebSocket na mao. Por isso a imagem e so o runtime mais o codigo.
FROM node:20-alpine

WORKDIR /app
COPY . .

# O Caddy do stack fleet chega no container pela rede do compose, nao pelo
# loopback do droplet, entao o servidor escuta em todas as interfaces do
# container. Nada disso fica publicado no host.
ENV PORT=8090

# Sobe como usuario comum: o processo nao precisa de root para nada.
USER node

CMD ["node", "server.js"]
