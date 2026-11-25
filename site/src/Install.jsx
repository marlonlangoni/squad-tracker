// Instalar o site como app (PWA).
// Chrome, Edge e Android avisam pelo evento beforeinstallprompt, e o botão abre a janela de instalação do navegador.
// iPhone e iPad não têm esse evento: o botão abre a gaveta com o passo a passo do Safari.
// O link de convite é o endereço do site com ?instalar no fim: abre direto a gaveta.
import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';

const EASE = [0.16, 1, 0.3, 1];

const isStandalone = () => window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export function useInstall() {
  const [evt, setEvt] = useState(null);
  const [installed, setInstalled] = useState(isStandalone);
  const [supported, setSupported] = useState(false); // o navegador já ofereceu instalação nesta visita
  useEffect(() => {
    const onPrompt = e => { e.preventDefault(); setEvt(e); setSupported(true); };
    const onInstalled = () => { setInstalled(true); setEvt(null); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => { window.removeEventListener('beforeinstallprompt', onPrompt); window.removeEventListener('appinstalled', onInstalled); };
  }, []);
  const prompt = useCallback(async () => {
    if (!evt) return false;
    evt.prompt();
    const { outcome } = await evt.userChoice;
    setEvt(null); // o mesmo evento só pode ser usado uma vez
    return outcome === 'accepted';
  }, [evt]);
  const ios = isIOS();
  return { installed, canPrompt: !!evt, ios, available: !installed && (supported || ios), prompt };
}

// Ícone de "Compartilhar" do Safari, para o passo a passo bater com o que a pessoa vê na tela.
const ShareIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3v12M8 7l4-4 4 4" /><path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1" />
  </svg>
);

export function InstallDrawer({ open, onClose, inst }) {
  const install = async () => { if (await inst.prompt()) onClose(); };
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="scrim" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.aside className="drawer install" role="dialog" aria-label="Instalar o Squad Tracker" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%', transition: { duration: 0.3, ease: [0.7, 0, 0.84, 0] } }} transition={{ duration: 0.55, ease: EASE }}>
            <header className="drawer-h">
              <div><small>Squad Tracker</small><h2>Instalar o app</h2></div>
              <button className="lock-close" onClick={onClose} aria-label="Fechar">✕</button>
            </header>

            <div className="inst-app">
              <img src={`${import.meta.env.BASE_URL}icon-192.png`} alt="" width="64" height="64" />
              <div><b>Squad Tracker</b><span className="muted">Abre em janela própria, com ícone na tela inicial ou na área de trabalho.</span></div>
            </div>

            {inst.installed ? (
              <p className="inst-done">Já está instalado neste aparelho. Abra pelo ícone do Squad Tracker.</p>
            ) : inst.canPrompt ? (
              <>
                <button type="button" className="btn-primary inst-go" onClick={install}>Instalar agora <i>→</i></button>
                <p className="note">O navegador pede para confirmar. Depois é só abrir pelo ícone.</p>
              </>
            ) : inst.ios ? (
              <>
                <ol className="inst-steps">
                  <li>Abra este link no <b>Safari</b>. Se abriu dentro do WhatsApp ou do Instagram, toque em ⋯ e escolha <b>Abrir no Safari</b>.</li>
                  <li>Toque em <b>Compartilhar</b> <span className="inst-ico"><ShareIcon /></span> na barra do Safari.</li>
                  <li>Role a lista e toque em <b>Adicionar à Tela de Início</b>.</li>
                  <li>Toque em <b>Adicionar</b>, no canto de cima.</li>
                </ol>
              </>
            ) : (
              <ol className="inst-steps">
                <li>Abra este link no <b>Chrome</b> ou no <b>Edge</b>. Se abriu dentro do WhatsApp ou do Instagram, use <b>Abrir no navegador</b>.</li>
                <li>No PC, clique no ícone de instalar na barra de endereço. No celular, abra o menu <b>⋮</b> e toque em <b>Instalar app</b> ou <b>Adicionar à tela inicial</b>.</li>
              </ol>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

// Botão do topo: só aparece quando dá para instalar (e some depois de instalado).
export function InstallButton({ inst, onOpen }) {
  if (!inst.available) return null;
  // Com o evento em mãos, abre direto a janela do navegador; sem ele (iPhone, ou já recusou uma vez), abre a gaveta.
  const click = () => (inst.canPrompt ? inst.prompt() : onOpen());
  return (
    <button type="button" className="install-btn" onClick={click} aria-label="Instalar o app">
      <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v11M7 10l5 5 5-5M5 20h14" /></svg>
      <span>Instalar</span>
    </button>
  );
}
