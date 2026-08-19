/**
 * Composição da aplicação: store → motor → renderizadores → interface.
 *
 * Na Fase 0 este arquivo apenas confirma que a cadeia de build está de pé e
 * que os tokens de estilo carregam. As camadas reais entram a partir da Fase 3.
 */

import './styles/tokens.css'
import { G_PADRAO, N_PADRAO } from './physics/constants.js'

const raiz = document.querySelector<HTMLElement>('#cena')

if (raiz) {
  raiz.innerHTML = `
    <p style="padding: var(--esp-4); color: var(--cor-texto-suave)">
      Estrutura de projeto pronta (Fase 0).
      Padrões carregados do núcleo de física: <code>g = ${G_PADRAO} m/s²</code>,
      <code>N = ${N_PADRAO}</code>.
    </p>
  `
}
