# Jogos

Quatro jogos que rodam no navegador, sem instalar nada e sem dependencia nenhuma:
o servidor e Node puro e o WebSocket e escrito na mao (RFC 6455). Estao no ar em
**https://games.iklobato.com**.

Tres deles jogam a dois em tempo real. O quarto, o Cade?, e de outra especie:
uma crianca de dois anos e um adulto no mesmo tablet, sem rede nenhuma.

## Os jogos

| jogo | pasta | dois jogadores |
|---|---|---|
| Bricks Master | `brick/` | mesmo tabuleiro, os dois atirando ao mesmo tempo |
| Canyon Defense | `tower/` | mesmo mapa, torres com dono e dinheiro separado |
| Agar | `survivor/` | mesmo mundo, e um pode comer o outro |
| Cade? | `cade/` | nao pela rede: e a crianca e o adulto lado a lado |

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

## O Cade? nao segue nenhuma regra acima

E o unico jogo daqui que nao usa o servidor: nao abre WebSocket, nao tem sala,
nao guarda placar e nunca fala com a rede depois de instalado (o service worker
serve tudo do cache, da para conferir desligando o wi-fi). O publico e uma
crianca de 24 a 36 meses **sempre junto de um adulto**, e o desenho inteiro sai
do que a pesquisa diz que funciona nessa idade:

Sao quatro atividades: **toca e acontece** (causa e efeito e vocabulario),
**cade?** (permanencia de objeto), **musica** (imitacao e sequencia de dois
passos) e **onde esta?**, a unica com resposta certa: a voz pergunta "onde esta a
bola?" e ela aponta. A cada tres acertos entra mais uma escolha na tela, de uma
ate seis. Mesmo ali nao existe errado: tocar no objeto trocado faz ele dizer o
proprio nome, o certo balanca chamando e a pergunta se repete. Ninguem perde
nada, nada trava, e nada apressa.

- **Um gesto so: tocar.** Nada de arrastar, pinca, girar ou segurar. O toque
  dispara no `pointerdown`, nunca no `click`, porque o dedo dela sai do alvo
  antes de soltar.
- **Alvo de 2 cm no minimo** (`--touch-min: 96px`), som em menos de 100 ms
  (Web Audio sintetizado, sem arquivo para carregar).
- **Sem texto, sem erro, sem placar, sem cronometro visivel.** Cortina errada
  devolve uma borboleta, nunca um som de erro.
- **A sessao acaba sozinha em 4 minutos** e trava por 60 minutos. Reter a
  crianca aqui e defeito, nao metrica.
- **O fim entrega um cartao para o adulto**: uma brincadeira fora da tela e tres
  perguntas para fazer a ela. Esse cartao e o produto; a tela e so a desculpa.

O modo pai (voz gravada, fotos da casa, tempos, volume) abre segurando os dois
cantos opostos da tela por tres segundos, que e o gesto que ela nao faz sozinha.

### As fotos e as vozes

Os objetos sao foto de verdade e as palavras sao voz de verdade, os dois em
`cade/assets/` (410 KB no total). Foram gerados uma vez pelo `gerar-assets.js`,
que roda **aqui na maquina** e grava os arquivos no repositorio: o jogo continua
sem tocar na rede quando a crianca esta usando.

```
node cade/gerar-assets.js            # gera so o que falta
node cade/gerar-assets.js --refazer  # gera tudo de novo
```

Dois provedores, por um motivo pratico:

- **Fotos: OpenRouter** (`google/gemini-3-pro-image`). Entrega foto de produto
  em fundo branco muito boa. O `sips` do proprio macOS corta em quadrado e
  encolhe para 512px, senao seriam 440 KB por objeto no cache do tablet.
- **Vozes: TTS da OpenAI** (`gpt-4o-mini-tts`). A saida de audio da OpenRouter e
  um modelo de **conversa**, nao de leitura: mandar "cade?" faz ele responder
  "o que voce esta procurando?" em vez de falar a palavra, e nenhuma instrucao
  de sistema segurou isso. TTS le o texto e acabou.

Cada objeto tem tres camadas, da melhor para a pior: a **foto do brinquedo dele**
que o pai poe no modo pai, a **foto que veio no jogo**, e o **desenho** em SVG,
que so aparece se o arquivo faltar. A voz segue a mesma ordem: gravacao do pai,
voz do jogo, e por ultimo a voz do aparelho. Foto generica ja e melhor que
desenho chapado, mas o ursinho dele continua sendo melhor que as duas.

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
node cade/test-cade.js    # sozinho: alvo de 2 cm, so pointer, cache e tempo
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
| `cade/test-cade.js` | as regras do Cade? que um refactor quebra sem avisar |
| `cade/gerar-assets.js` | gera as fotos e as vozes do Cade?, uma vez, fora do jogo |

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
