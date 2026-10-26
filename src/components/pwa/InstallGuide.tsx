import {Modal} from '../ui/Modal'
export default function InstallGuide({platform, onClose}: {platform: 'ios' | 'android'; onClose: () => void}) {
  return <Modal title="Clipzone na tela inicial" onClose={onClose}>
    {platform === 'ios' ? <ol>
      <li>Abra este site no Safari, se estiver usando outro navegador.</li>
      <li>Toque em Compartilhar e em “Adicionar à Tela de Início”.</li>
      <li>Se aparecer “Abrir como App da Web”, mantenha essa opção ativada e confirme em Adicionar.</li>
    </ol> : <ol>
      <li>Abra o menu do navegador.</li>
      <li>Procure “Instalar app” ou “Adicionar à tela inicial” e siga as instruções.</li>
    </ol>}
    <p>A opção depende do navegador e pode não estar disponível na navegação anônima. O Clipzone precisa de internet para carregar os vídeos.</p>
    <button type="button" onClick={onClose}>Entendi</button>
  </Modal>
}
