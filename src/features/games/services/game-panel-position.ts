export interface GamePanelAnchor {top:number;bottom:number;left:number;width:number}
export interface GamePanelViewport {top:number;left:number;width:number;height:number}
/** An upward panel is bottom-anchored, so a short/empty list never leaves a max-height gap. */
export function gamePanelPosition(anchor:GamePanelAnchor,view:GamePanelViewport){
 const margin=8,gap=4,maxHeight=358
 const leftEdge=view.left+margin,rightEdge=view.left+view.width-margin,topEdge=view.top+margin,bottomEdge=view.top+view.height-margin
 const width=Math.max(0,Math.min(anchor.width,view.width-margin*2))
 const above=Math.max(0,Math.min(anchor.top-gap,bottomEdge)-topEdge),below=Math.max(0,bottomEdge-Math.max(anchor.bottom+gap,topEdge))
 const up=below<maxHeight&&above>below
 return {top:up?Math.min(anchor.top-gap,bottomEdge):Math.max(anchor.bottom+gap,topEdge),left:Math.max(leftEdge,Math.min(anchor.left,rightEdge-width)),width,height:Math.min(maxHeight,up?above:below),up}
}
