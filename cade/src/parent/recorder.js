// Gravacao da voz do pai, uma palavra por vez. O microfone so e ligado dentro do
// modo pai, e so no momento em que ele aperta gravar.
export const podeGravar = () =>
  typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;

// Devolve a funcao que para a gravacao e entrega o audio. Quem chama guarda o
// blob; aqui nao se decide nada sobre onde ele vai parar.
export async function comecaGravacao() {
  const trilha = await navigator.mediaDevices.getUserMedia({ audio: true });
  const gravador = new MediaRecorder(trilha);
  const pedacos = [];
  gravador.addEventListener('dataavailable', (evento) => {
    if (evento.data.size) pedacos.push(evento.data);
  });
  gravador.start();

  return () =>
    new Promise((resolve) => {
      gravador.addEventListener('stop', () => {
        for (const canal of trilha.getTracks()) canal.stop();
        resolve(new Blob(pedacos, { type: gravador.mimeType || 'audio/webm' }));
      });
      gravador.stop();
    });
}
