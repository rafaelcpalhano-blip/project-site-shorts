export function gameCoverUrl(value:unknown): string | undefined {
  if (typeof value !== 'string' || value.length > 2048 || /[\\]/.test(value) || [...value].some(character=>character.charCodeAt(0)<=32||character.charCodeAt(0)===127)) return
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || url.hostname !== 'images.igdb.com' || url.username || url.password || url.port || url.search || url.hash) return
    const match = /^\/igdb\/image\/upload\/t_[a-zA-Z0-9_]+\/([a-zA-Z0-9_-]+\.(?:jpg|png|webp))$/.exec(url.pathname)
    if (!match) return
    return 'https://images.igdb.com/igdb/image/upload/t_cover_big_2x/' + match[1]
  } catch { return }
}
