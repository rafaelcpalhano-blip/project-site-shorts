// Fixed vocabulary only; summaries and proper names are not machine-translated here.
const genres: Record<string,string> = {
 'Point-and-click':'Apontar e clicar', 'Fighting':'Luta', 'Shooter':'Tiro', 'Music':'Música',
 'Platform':'Plataforma', 'Puzzle':'Quebra-cabeça', 'Racing':'Corrida', 'Real Time Strategy (RTS)':'Estratégia em tempo real (RTS)',
 'Role-playing (RPG)':'RPG', 'Simulator':'Simulação', 'Sport':'Esporte', 'Strategy':'Estratégia',
 'Turn-based strategy (TBS)':'Estratégia por turnos', 'Tactical':'Tático', "Hack and slash/Beat 'em up":'Hack and slash / Combate corpo a corpo',
 'Quiz/Trivia':'Perguntas e respostas', 'Pinball':'Pinball', 'Adventure':'Aventura', 'Indie':'Independente',
 'Arcade':'Arcade', 'Visual Novel':'Romance visual', 'Card & Board Game':'Cartas e jogos de tabuleiro', 'MOBA':'MOBA',
}
const modes: Record<string,string> = {
 'Single player':'Um jogador', 'Multiplayer':'Multijogador', 'Co-operative':'Cooperativo', 'Split screen':'Tela dividida',
 'Massively Multiplayer Online (MMO)':'Multijogador massivo on-line (MMO)', 'Battle Royale':'Battle Royale',
}
export function gameLabel(value:string,kind:'genre'|'mode'|'platform'):string {
 const vocabulary: Record<string,string>=kind==='genre'?genres:kind==='mode'?modes:{'PC (Microsoft Windows)':'PC (Windows)'}
 return Object.hasOwn(vocabulary,value)?vocabulary[value]:value
}
