import {mkdir,writeFile,appendFile} from 'node:fs/promises'
import {resolve,isAbsolute} from 'node:path'
import {isDeepStrictEqual} from 'node:util'
import {createRestStore} from '../server/firestore/rest-store.ts'
import {assignLegacyManualGameIdentifier} from '../server/identifiers/legacy-manual-games.ts'
const [mode,backupArg,...extra]=process.argv.slice(2)
if(!['diagnose','apply'].includes(mode)||extra.length||mode==='diagnose'&&backupArg||mode==='apply'&&(!backupArg?.startsWith('--backup-dir=')||!isAbsolute(backupArg.slice(13))))throw Error('Use diagnose, or apply --backup-dir=ABSOLUTE_NEW_DIRECTORY')
// Fixed loopback/demo target: no env/project/host override, no cloud credentials.
const store=createRestStore({projectId:'demo-clipzone',emulatorPort:8080})
async function games(){const rows=[];let after;for(;;){const page=await store.scanGames(after);if(!page.length)break;if(after&&page.at(-1).id<=after)throw Error('invalid-scan-progress');for(const row of page)rows.push({id:row.id,data:await store.get('games/'+row.id)});after=page.at(-1).id;if(page.length<30)break}return rows}
async function links(){const rows=[];let after;for(;;){const page=await store.scanShorts(after);if(!page.length)break;for(const row of page)rows.push({id:row.id,gameId:row.data.gameId});if(after&&page.at(-1).id<=after)throw Error('invalid-scan-progress');after=page.at(-1).id;if(page.length<30)break}return rows}
const before=await games(),references=await links(),counter=await store.get('publicIdentifierCounters/manual-game'),reservations=[],aliases=new Set()
for(const row of before){const game=row.data;if(!game)throw Error('game-disappeared');if(game.source!=='manual')continue;if(row.id.startsWith('igdb-'))throw Error('invalid-manual-source');if(game.publicId!==undefined){if(typeof game.publicId!=='string'||!/^mn\d{4,16}$/.test(game.publicId)||aliases.has(game.publicId))throw Error('invalid-existing-alias');aliases.add(game.publicId);const data=await store.get('publicIdentifiers/'+game.publicId);if(data?.kind!=='manual-game'||data.internalId!==row.id)throw Error('identifier-reservation-conflict');reservations.push({id:game.publicId,data})}}
const next=counter?.next??0
if(!Number.isSafeInteger(next)||next<0||next>=Number.MAX_SAFE_INTEGER||[...aliases].some(alias=>Number(alias.slice(2))>=next))throw Error('invalid-identifier-counter')
const summary={target:'demo-clipzone@127.0.0.1:8080',games:before.length,manual:before.filter(row=>row.data.source==='manual').length,alreadyAssigned:aliases.size,pending:before.filter(row=>row.data.source==='manual'&&row.data.publicId===undefined).length,shortLinks:references.length}
if(mode==='diagnose'){console.log(JSON.stringify(summary));process.exit(0)}
const directory=resolve(backupArg.slice(13));await mkdir(directory,{recursive:false})
const serialize=value=>JSON.stringify(value,function(key,item){const raw=this[key];return raw instanceof Date?{$date:raw.toISOString()}:item},2)+'\n'
await writeFile(resolve(directory,'before.json'),serialize({createdAt:new Date(),summary,games:before,counter,reservations,references}),{flag:'wx'})
const results=[]
for(const row of before.filter(row=>row.data.source==='manual')){const result=await assignLegacyManualGameIdentifier(row.id,{store,now:()=>new Date()});results.push(result);await appendFile(resolve(directory,'assignments.jsonl'),JSON.stringify(result)+'\n')}
const after=await games(),afterLinks=await links(),byId=new Map(after.map(row=>[row.id,row.data])),linkIds=new Map(afterLinks.map(row=>[row.id,row.gameId]))
for(const row of before){const actual=byId.get(row.id);if(!actual)throw Error('game-missing-after');const original={...row.data},current={...actual};if(row.data.source==='manual'){if(!/^mn\d{4,16}$/.test(actual.publicId))throw Error('alias-missing-after');delete original.publicId;delete current.publicId}if(!isDeepStrictEqual(original,current))throw Error('unexpected-game-change:'+row.id)}
for(const row of references)if(linkIds.get(row.id)!==row.gameId)throw Error('unexpected-short-reference-change')
const verification={...summary,assigned:results.filter(row=>row.changed).length,unchanged:results.filter(row=>!row.changed).length,fieldsPreserved:true,existingShortLinksPreserved:true,results}
await writeFile(resolve(directory,'verification.json'),serialize(verification),{flag:'wx'});console.log(JSON.stringify(verification))
