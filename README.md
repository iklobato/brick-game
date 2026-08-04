# Jogos

Tres jogos que rodam no navegador, sem instalar nada e sem dependencia nenhuma:
o servidor e Node puro e o WebSocket e escrito na mao (RFC 6455). Estao no ar em
**https://games.iklobato.com**.

Todos os tres jogam a dois em tempo real.

## Os jogos

| jogo | pasta | dois jogadores |
|---|---|---|
| Bricks Master | `brick/` | mesmo tabuleiro, os dois atirando ao mesmo tempo |
| Canyon Defense | `tower/` | mesmo mapa, torres com dono e dinheiro separado |
| Agar | `survivor/` | mesmo mundo, e um pode comer o outro |

O menu (`index.html`) tambem aponta para o [HardTerm](https://hardterm.top/), que
mora em outro site e nao faz parte deste repositorio.

## Como o modo de dois funciona

Os tres seguem o mesmo desenho: **quem entra primeiro simula a partida inteira**,
e quem entra depois manda apenas o que decide e desenha o que recebe. Ninguem
simula dos dois lados, porque duas maquinas calculando a mesma bola divergem no
primeiro quique e passam a discordar sobre quem quebrou o que.

O mapa nunca viaja: os tres jogos sorteiam mundo, blocos e inimigos a partir de
uma semente, entao a mesma configuracao gera a mesma partida nas duas maquinas.
Pela rede vai so o que a semente nao explica.

| jogo | o jogador 2 manda | trafego medido |
|---|---|---|
| Bricks Master | mira, recolher, bomba, carta | 12,6 KB/s com 22 bolas no ar |
| Canyon Defense | construir, melhorar, vender, pausa, velocidade | 4,9 KB/s |
| Agar | a direcao das teclas, so quando ela muda | 8,2 KB/s |

Os tres mandam 20 pacotes por segundo.

Duas decisoes que valem o comentario:

- **No Agar a comida nao entra no pacote.** Sao ~900 bolinhas; manda-las em todo
  pacote custaria 201 KB/s. Como uma bolinha so muda de lugar quando alguem a
  come, viaja apenas o que mudou, e cada uma carrega o proprio indice para o
  outro lado saber qual foi. Dai os 8,2 KB/s.
- **No Bricks Master a bola carrega a velocidade.** Entre um pacote e outro a
  tela do jogador 2 desliza a bola em linha reta, senao ela andaria a 20
  posicoes por segundo em vez de 60 e o quique viraria um tranco. Quem decide o
  quique continua sendo o jogador 1.

A sala e a pasta do jogo (`/brick/` pareia com `/brick/`), no maximo dois por
sala, e o menu mostra quantas pessoas estao em cada uma.

### Regra que mudou no Bricks Master

Com um tabuleiro so, a linha nova **espera os dois terminarem** a vez. Descer
assim que um acaba jogaria a linha em cima das bolas de quem ainda esta
atirando. Nao existe mais placar de vencedor: os dois chegam ao fim juntos, no
mesmo nivel.

## Rodar aqui

```
node server.js            # http://localhost:8080
PORT=8099 node server.js  # em outra porta
```

Nao ha nada para instalar: sem `package.json`, sem `node_modules`.

## Testes

```
node server.js            # em um terminal
node test-server.js       # em outro: 31 checks de sala, papel, repasse e saida
```

Cada jogo tem o proprio self-check, que roda ao abrir a pagina com `#test`:

```
http://localhost:8080/brick/#test       # 106 checks
http://localhost:8080/tower/#test       #  53 checks
http://localhost:8080/survivor/#test    #  56 checks
```

O resultado sai no console do navegador: cada falha vira uma linha, e no fim
aparece `self-check ok`. Rode com o servidor sem ninguem conectado, porque uma
aba aberta ocupa a sala e o `test-server.js` encontra o estado sujo.

## Arquivos

| arquivo | o que faz |
|---|---|
| `server.js` | serve os arquivos e repassa as mensagens entre os dois navegadores |
| `net.js` | conexao do lado do navegador; a sala sai da pasta da pagina |
| `rival.js` | ficha de quem esta do outro lado (lugar, rede, hora, ping) |
| `save.js` | moedas, melhorias e metas do Bricks Master, no `localStorage` |
| `menu.js` | o menu e a contagem de gente em cada sala |
| `test-server.js` | clientes WebSocket de verdade contra o servidor |

## No ar

O site roda num container atras de um proxy, que termina o TLS e alcanca o
servidor pela rede interna. Duas coisas dependem disso:

- O container escuta em `0.0.0.0` (a porta nao e publicada no host). Prende-lo
  ao `127.0.0.1` o deixa inalcancavel pelo proxy, porque esse loopback e o do
  proprio container.
- O endereco do jogador vem do cabecalho `X-Forwarded-For`, e vale o **ultimo**
  valor da lista: o proxy anexa o endereco real no fim, entao o que um cliente
  escrever sozinho fica antes e nao engana. Sem isso, todo mundo aparece como
  vizinho de rede do outro.

Atualizar e `git pull` e reconstruir o container.
