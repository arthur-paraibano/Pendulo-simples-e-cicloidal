(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),t.credentials=e.crossOrigin===`use-credentials`?`include`:e.crossOrigin===`anonymous`?`omit`:`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();var e=e=>e;180/Math.PI,Math.PI/180,2*Math.PI;var t=e(9.81),n=document.querySelector(`#cena`);n&&(n.innerHTML=`
    <p style="padding: var(--esp-4); color: var(--cor-texto-suave)">
      Estrutura de projeto pronta (Fase 0).
      Padrões carregados do núcleo de física: <code>g = ${t} m/s²</code>,
      <code>N = 2</code>.
    </p>
  `);
//# sourceMappingURL=index-DTgPYeNV.js.map