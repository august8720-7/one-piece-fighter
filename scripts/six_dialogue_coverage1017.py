"""Export current per-move semantic speech mapping from real eventCues and exact transcripts.

Counts all54 skill slots, extra core normals and Gear5 separately. A generic
meaningful reuse is labelled as reuse, never as a new dedicated move recording.
"""
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
WORK = Path('D:/one-piece-fighter-crossover-0922/roster-0929/six-game1014')


def main():
    assert ROOT == Path('D:/Projects/one-piece-fighter') and sys.dont_write_bytecode
    import soundfile as sf
    code = """
import{createServer}from'vite';import fs from'node:fs';import{createHash}from'node:crypto';
const root=process.cwd();const server=await createServer({root,configFile:false,publicDir:false,resolve:{alias:{'@core':root+'/src/core','@characters':root+'/src/characters','@input':root+'/src/input'}},cacheDir:'D:/one-piece-fighter-crossover-0922/tools/cache1013/vite-dialogue1017',server:{middlewareMode:true,hmr:false},appType:'custom'});
try{
 const {eventCues,createCueCatalog}=await server.ssrLoadModule('/src/audio/audioCues.ts');
 const {ROLE_PLAYSTYLES}=await server.ssrLoadModule('/src/render/ui/rolePlaystyles.ts');
 const sample=JSON.parse(fs.readFileSync('src/audio/sampleManifest.json')),semantic=JSON.parse(fs.readFileSync('src/audio/semanticDialogue1017.json'));
 const catalog=createCueCatalog({...sample.cues,...semantic.cues});const rows=[];
 for(const id of ['luffy','akainu','labubu','twinkle','aokiji','shanks']){
  const defs=await server.ssrLoadModule('/src/characters/'+id+'/def.ts'),d=defs[id+'Def'],core=ROLE_PLAYSTYLES[id].choices.map(c=>c.moveId);
  const moves=[...new Set([...d.skillSlots,...core,...(id==='luffy'?[...d.gear5.moves.map(m=>m.id),d.gear5.awakening.id,'g5_exit']:[])])];
  for(const move of moves){const phase=move==='g5_exit'?'form_exit':'start';const actual=d.moves.find(m=>m.id===move)??d.gear5?.moves.find(m=>m.id===move);const phases=actual?.throwData?[phase,'throw']:[phase];
   const cues=phases.flatMap(triggerPhase=>eventCues({phase:triggerPhase,characterId:id,player:0,moveId:move},key=>!!catalog[key]?.files.length).filter(c=>c.id.startsWith('voice.')).map(c=>({id:c.id,triggerPhase,...catalog[c.id]})));
   rows.push({character:id,moveId:move,isCoreChoice:core.includes(move),isSkillSlot:d.skillSlots.includes(move),isFinisher:move===d.skillSlots.at(-1),isGear5:move.startsWith('g5_'),voiceCues:cues});}
 }
 const sources=['src/audio/audioCues.ts','src/audio/semanticDialogue1017.json','src/audio/sampleManifest.json','src/render/ui/rolePlaystyles.ts'];
 console.log('SEMANTIC_MATRIX='+JSON.stringify({rows,sourceHashes:Object.fromEntries(sources.map(p=>[p,createHash('sha256').update(fs.readFileSync(p)).digest('hex')]))}));
}finally{await server.close()}
"""
    completed = subprocess.run(['node', '--input-type=module', '-e', code], cwd=ROOT, capture_output=True, text=True, encoding='utf-8', check=True)
    data = json.loads(next(line.split('=', 1)[1] for line in completed.stdout.splitlines() if line.startswith('SEMANTIC_MATRIX=')))
    overlay = json.loads((ROOT / 'src/audio/semanticDialogue1017.json').read_bytes())
    lines = {line['file']: line for line in json.loads((ROOT / 'src/audio/voiceLines0922.json').read_bytes())['lines']}
    lines.update({line['file']: line for line in overlay['lines']})
    usage = {}
    for row in data['rows']:
        for cue in row['voiceCues']:
            for file in cue['files']:
                usage.setdefault(file, []).append(row['character'] + '/' + row['moveId'])
    for row in data['rows']:
        words = []
        for cue in row['voiceCues']:
            for file in cue['files']:
                line = lines.get(file, {})
                text = line.get('original') or ''
                meaningful = bool(line.get('transcriptVerified') and len(text.strip('！!。., ')) > 1 and text not in {'こおい', 'Yahoo', 'yahoo!'})
                path = ROOT / 'public' / file
                words.append({'file': file, 'triggerPhase': cue.get('triggerPhase'), 'actualOriginal': text or None, 'translation': line.get('translation'),
                    'transcriptVerified': line.get('transcriptVerified', False), 'meaningfulCertified': meaningful,
                    'seconds': sf.info(str(path)).duration if path.is_file() else None,
                    'sha256': hashlib.sha256(path.read_bytes()).hexdigest() if path.is_file() else None,
                    'sameFileUsedByMoves': usage[file], 'recordingDedicatedToThisMove': bool(cue.get('dedicatedRecording')) and len(usage[file]) == 1 and cue['id'].endswith('.' + row['moveId']),
                    'sourceKind': line.get('sourceKind', 'previous-accepted-catalog')})
        row['actualWords'] = words
        row['coverage'] = 'meaningful-dedicated' if words and all(x['meaningfulCertified'] and x['recordingDedicatedToThisMove'] for x in words) else 'meaningful-reuse' if words and all(x['meaningfulCertified'] for x in words) else 'exertion-or-unverified-words' if words else 'no-character-speech'
    data.update(observedAtUtc=datetime.now(timezone.utc).isoformat(),
                semanticDefinition='Actual exact transcript contains meaningful words; short nonverbal hits do not count. Meaningful generic reuse is not dedicated move speech. Runtime mapping is not audible browser acceptance.',
                skillSlots=sum(row['isSkillSlot'] for row in data['rows']),
                coreChoices=sum(row['isCoreChoice'] for row in data['rows']))
    out = WORK / 'acceptance/audio1017' / ('semantic-matrix-' + datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ'))
    out.mkdir()
    (out / 'README.md').write_text('# Per-move semantic speech1017\nReal current event mapping, source file SHA and exact reviewed words. Generic reuse and independent recordings remain distinct; no browser hearing acceptance is inferred.\n', encoding='utf-8')
    (out / 'coverage.json').write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    counts = {kind: sum(row['coverage'] == kind for row in data['rows']) for kind in sorted({r['coverage'] for r in data['rows']})}
    print(json.dumps({'output': str(out / 'coverage.json'), 'skillSlots': data['skillSlots'], 'coreChoices': data['coreChoices'], 'allRows': len(data['rows']), 'coverage': counts}))


if __name__ == '__main__':
    main()
